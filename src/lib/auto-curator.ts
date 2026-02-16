import { EventEmitter } from "events";
import { CurationStatus, SearchCandidate } from "@/types/config";
import { configManager } from "@/lib/config-manager";
import { historyManager } from "@/lib/history-manager";
import { queueManager } from "@/lib/queue-manager";
import { searchYouTube, getFullMetadata } from "@/lib/yt-search";
import {
  pickNextConcept,
  generateSearchQueries,
  curateResults,
  isLLMAvailable,
} from "@/lib/curator";

const CHECK_INTERVAL = 30_000; // 30s
const MIN_DURATION = 120; // 2 min
const MAX_DURATION = 14400; // 4 hours

class AutoCurator extends EventEmitter {
  private status: CurationStatus = {
    running: false,
    phase: "idle",
    currentConcept: null,
    lastRun: null,
    lastError: null,
    videosAdded: 0,
  };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pipelineRunning = false;
  private recentConcepts: string[] = [];

  getStatus(): CurationStatus {
    return { ...this.status };
  }

  start(): void {
    // Reset stale state (singleton survives HMR)
    this.pipelineRunning = false;
    this.status.running = true;
    this.status.phase = "idle";
    this.emitStatus();
    console.log("[AutoCurator] Started");
    // Run immediately, then schedule recurring checks
    this.checkAndRefill().catch((err) => {
      console.error("[AutoCurator] checkAndRefill error:", err);
    });
  }

  stop(): void {
    this.status.running = false;
    this.status.phase = "idle";
    this.pipelineRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emitStatus();
    console.log("[AutoCurator] Stopped");
  }

  trigger(): void {
    console.log("[AutoCurator] Manual trigger");
    this.pipelineRunning = false; // reset in case stuck
    this.runPipeline().catch((err) => {
      console.error("[AutoCurator] trigger pipeline error:", err);
    });
  }

  private scheduleCheck(): void {
    if (this.timer) clearTimeout(this.timer);
    if (!this.status.running) return;

    this.timer = setTimeout(() => {
      this.checkAndRefill().catch((err) => {
        console.error("[AutoCurator] scheduled checkAndRefill error:", err);
      });
    }, CHECK_INTERVAL);
  }

  private async checkAndRefill(): Promise<void> {
    if (!this.status.running) return;

    const config = configManager.getConfig();
    const activeCount = queueManager.activeItemCount();

    console.log(
      `[AutoCurator] Check: ${activeCount} active, need ${config.queueSize}, ${config.concepts.length} concepts`
    );

    if (activeCount < config.queueSize && config.concepts.length > 0) {
      await this.runPipeline();
    }

    this.scheduleCheck();
  }

  private async runPipeline(): Promise<void> {
    if (this.pipelineRunning) {
      console.log("[AutoCurator] Pipeline already running, skipping");
      return;
    }
    this.pipelineRunning = true;

    const config = configManager.getConfig();
    if (config.concepts.length === 0) {
      console.log("[AutoCurator] No concepts configured");
      this.pipelineRunning = false;
      return;
    }

    try {
      // Step 1: Pick concept
      console.log("[AutoCurator] Picking concept...");
      this.updatePhase("picking-concept");
      const queueTitles = queueManager
        .getQueue()
        .filter((i) => i.status !== "played" && i.status !== "error")
        .map((i) => i.video.title);

      const concept = await pickNextConcept(
        config.concepts,
        queueTitles,
        this.recentConcepts
      );
      this.status.currentConcept = concept;
      this.recentConcepts.push(concept);
      if (this.recentConcepts.length > 10) this.recentConcepts.shift();
      this.emitStatus();
      console.log(`[AutoCurator] Picked concept: "${concept}"`);

      // Step 2: Generate search queries
      this.updatePhase("generating-queries");
      const historyTitles = historyManager
        .getHistory()
        .map((h) => h.title);
      const queries = await generateSearchQueries(
        concept,
        queueTitles,
        historyTitles
      );
      console.log(`[AutoCurator] Generated ${queries.length} queries:`, queries);

      // Step 3: Search YouTube
      this.updatePhase("searching");
      const allCandidates: SearchCandidate[] = [];
      const seenIds = new Set<string>();

      // Also build a set of video IDs currently in the queue
      const queueVideoIds = new Set(
        queueManager.getQueue().map((i) => i.video.id)
      );

      for (const query of queries) {
        try {
          console.log(`[AutoCurator] Searching: "${query}"`);
          const results = await searchYouTube(query, 10);
          console.log(`[AutoCurator] Got ${results.length} results for "${query}"`);
          for (const r of results) {
            if (seenIds.has(r.id)) continue;
            seenIds.add(r.id);

            // Basic filters: no live streams, not in history, not in queue
            // Duration 0 means unknown (flat-playlist) — allow through, check after metadata
            if (r.isLive) continue;
            if (r.duration > 0 && (r.duration < MIN_DURATION || r.duration > MAX_DURATION))
              continue;
            if (historyManager.isRecentlyPlayed(r.id)) continue;
            if (queueVideoIds.has(r.id)) continue;

            allCandidates.push(r);
          }
        } catch (err) {
          console.error(`[AutoCurator] Search failed for "${query}":`, err);
        }
      }

      console.log(`[AutoCurator] ${allCandidates.length} candidates after filtering`);

      if (allCandidates.length === 0) {
        this.status.lastRun = Date.now();
        this.status.lastError = "No candidates found after filtering";
        this.updatePhase("idle");
        this.pipelineRunning = false;
        return;
      }

      // Step 4: Fetch full metadata for top candidates (limit to 15 to be fast)
      this.updatePhase("fetching-metadata");
      const toFetch = allCandidates.slice(0, 15);
      const enriched: SearchCandidate[] = [];

      for (const candidate of toFetch) {
        try {
          const full = await getFullMetadata(candidate.id);
          // Filter live streams and check real duration
          if (full.isLive) continue;
          if (full.duration > 0 && (full.duration < MIN_DURATION || full.duration > MAX_DURATION))
            continue;
          enriched.push(full);
        } catch {
          // Skip failed metadata fetches
        }
      }
      console.log(`[AutoCurator] Enriched ${enriched.length} candidates`);

      // Step 5: LLM curation
      this.updatePhase("curating");
      const approvedIds = await curateResults(concept, enriched);
      console.log(`[AutoCurator] Approved ${approvedIds.length} videos`);

      if (approvedIds.length === 0) {
        this.status.lastRun = Date.now();
        this.status.lastError = "No videos approved by curator";
        this.updatePhase("idle");
        this.pipelineRunning = false;
        return;
      }

      // Step 6: Add top picks to queue
      this.updatePhase("adding-to-queue");
      const needed = config.queueSize - queueManager.activeItemCount();
      const toAdd = approvedIds.slice(0, Math.max(needed, 1));
      let added = 0;

      for (const videoId of toAdd) {
        const candidate = enriched.find((c) => c.id === videoId);
        if (!candidate) continue;

        // Double-check not already in queue (race condition protection)
        const currentQueue = queueManager.getQueue();
        if (currentQueue.some((i) => i.video.id === videoId)) continue;

        await queueManager.addVideo(
          {
            id: candidate.id,
            title: candidate.title,
            thumbnail: candidate.thumbnail || "",
            duration: candidate.duration,
            uploader: candidate.uploader,
            url: candidate.url,
          },
          { source: "curated", concept }
        );
        added++;
      }

      this.status.videosAdded += added;
      this.status.lastRun = Date.now();
      this.status.lastError = null;
      console.log(`[AutoCurator] Added ${added} videos to queue`);
      this.updatePhase("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[AutoCurator] Pipeline error:", message);
      this.status.lastError = message;
      this.status.lastRun = Date.now();
      this.updatePhase("idle");
    } finally {
      this.pipelineRunning = false;
    }
  }

  private updatePhase(phase: CurationStatus["phase"]): void {
    this.status.phase = phase;
    this.emitStatus();
  }

  private emitStatus(): void {
    this.emit("status-updated", this.getStatus());
  }
}

const globalForCurator = globalThis as unknown as {
  autoCurator: AutoCurator | undefined;
};

export const autoCurator =
  globalForCurator.autoCurator ?? new AutoCurator();

globalForCurator.autoCurator = autoCurator;
