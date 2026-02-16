import { EventEmitter } from "events";
import { QueueItem, QueueItemStatus, VideoInfo } from "@/types/video";
import { downloadVideo, deleteDownload, splitIntoChunks, DownloadHandle } from "@/lib/ytdlp";
import { castManager } from "@/lib/cast-manager";
import { CastDevice, PlaybackStatus } from "@/types/cast";
import { historyManager } from "@/lib/history-manager";

class QueueManager extends EventEmitter {
  private queue: QueueItem[] = [];
  private downloads: Map<string, DownloadHandle> = new Map();
  private cleanupDelay = 60_000; // 1 min after played
  private wasConnected = false;
  private autoPlayLock = false;

  constructor() {
    super();
    this.setupCastListener();
  }

  private setupCastListener(): void {
    castManager.on("media-finished", (queueId: string) => {
      const item = this.queue.find((i) => i.queueId === queueId);
      if (
        item?.chunks &&
        (item.currentChunk ?? 0) < item.chunks.length - 1
      ) {
        // Advance to next chunk of the same video
        item.currentChunk = (item.currentChunk ?? 0) + 1;
        this.emit("queue-updated");
        this.loadItemMedia(item).catch((err) => {
          console.error("Failed to play next chunk:", err);
          this.markStatus(queueId, "played");
          this.scheduleCleanup(queueId);
          this.playNext();
        });
      } else {
        this.markStatus(queueId, "played");
        this.scheduleCleanup(queueId);
        this.playNext();
      }
    });

    castManager.on("status", (status: PlaybackStatus) => {
      const justConnected = status.connected && !this.wasConnected;
      this.wasConnected = status.connected;

      if (
        justConnected &&
        (!status.playerState || status.playerState === "IDLE") &&
        !this.queue.some((i) => i.status === "playing")
      ) {
        const firstReady = this.queue.find((i) => i.status === "ready");
        if (firstReady) {
          // Let the connection stabilize before loading media
          setTimeout(() => this.tryAutoPlay(firstReady.queueId), 500);
        }
      }
    });
  }

  getQueue(): QueueItem[] {
    return this.queue.map((item) => ({ ...item }));
  }

  getItem(queueId: string): QueueItem | undefined {
    const item = this.queue.find((i) => i.queueId === queueId);
    return item ? { ...item } : undefined;
  }

  async addVideo(
    video: VideoInfo,
    options?: { source?: "manual" | "curated"; concept?: string }
  ): Promise<QueueItem> {
    const queueId = crypto.randomUUID();

    const item: QueueItem = {
      queueId,
      video,
      status: "pending",
      downloadProgress: 0,
      addedAt: Date.now(),
      source: options?.source ?? "manual",
      concept: options?.concept,
    };

    this.queue.push(item);
    this.emit("queue-updated");

    // Start download immediately
    this.startDownload(item);

    return { ...item };
  }

  private startDownload(item: QueueItem): void {
    this.markStatus(item.queueId, "downloading");

    const handle = downloadVideo(
      item.video.id,
      item.video.url,
      (percent) => {
        const queueItem = this.queue.find((i) => i.queueId === item.queueId);
        if (queueItem) {
          queueItem.downloadProgress = percent;
          this.emit("queue-updated");
        }
      }
    );

    this.downloads.set(item.queueId, handle);

    handle.promise
      .then(async () => {
        this.downloads.delete(item.queueId);

        // Split long videos into 30-min chunks for Chromecast reliability
        if (item.video.duration > 1800) {
          try {
            const chunks = await splitIntoChunks(
              item.video.id,
              item.video.duration
            );
            if (chunks) {
              const queueItem = this.queue.find(
                (i) => i.queueId === item.queueId
              );
              if (queueItem) {
                queueItem.chunks = chunks;
              }
            }
          } catch (err) {
            console.error("Failed to split video into chunks:", err);
            // Fall through — try to play original file as-is
          }
        }

        this.markStatus(item.queueId, "ready");

        // If nothing is currently playing and this is first ready item, auto-play
        this.tryAutoPlay(item.queueId);
      })
      .catch((err) => {
        const queueItem = this.queue.find((i) => i.queueId === item.queueId);
        if (queueItem) {
          queueItem.status = "error";
          queueItem.error = err.message;
          this.emit("queue-updated");
        }
        this.downloads.delete(item.queueId);
      });
  }

  private tryAutoPlay(queueId: string): void {
    if (this.autoPlayLock) return;
    const item = this.queue.find((i) => i.queueId === queueId);
    if (!item || item.status !== "ready") return;
    if (!castManager.isConnected()) return;

    const status = castManager.status;
    if (status.playerState && status.playerState !== "IDLE") return;
    if (this.queue.some((i) => i.status === "playing")) return;

    this.autoPlayLock = true;
    this.playItem(queueId)
      .catch(() => {})
      .finally(() => {
        this.autoPlayLock = false;
      });
  }

  async playItem(queueId: string): Promise<void> {
    const item = this.queue.find((i) => i.queueId === queueId);
    if (!item) throw new Error("Item not found in queue");
    if (item.status !== "ready") throw new Error("Item is not ready to play");

    if (!castManager.isConnected()) {
      throw new Error("Not connected to a Chromecast");
    }

    // Mark current playing item as played
    const currentlyPlaying = this.queue.find((i) => i.status === "playing");
    if (currentlyPlaying) {
      this.markStatus(currentlyPlaying.queueId, "played");
      this.scheduleCleanup(currentlyPlaying.queueId);
    }

    item.currentChunk = 0;
    this.markStatus(queueId, "playing");
    await this.loadItemMedia(item);
  }

  private async loadItemMedia(item: QueueItem): Promise<void> {
    const streamId = item.chunks
      ? item.chunks[item.currentChunk ?? 0]
      : item.video.id;

    const totalChunks = item.chunks?.length ?? 1;
    const chunkIdx = item.currentChunk ?? 0;
    const title =
      totalChunks > 1
        ? `${item.video.title} (${chunkIdx + 1}/${totalChunks})`
        : item.video.title;

    await castManager.loadMedia(
      streamId,
      title,
      item.video.thumbnail,
      item.queueId
    );
  }

  async playNext(): Promise<void> {
    const nextReady = this.queue.find((i) => i.status === "ready");
    if (nextReady) {
      await this.playItem(nextReady.queueId);
    } else {
      // Check if there's a downloading item to wait for
      const nextDownloading = this.queue.find(
        (i) => i.status === "downloading"
      );
      if (nextDownloading) {
        const handle = this.downloads.get(nextDownloading.queueId);
        if (handle) {
          await handle.promise;
          await this.playItem(nextDownloading.queueId);
        }
      }
    }
  }

  removeItem(queueId: string): void {
    const index = this.queue.findIndex((i) => i.queueId === queueId);
    if (index === -1) return;

    const item = this.queue[index];

    // Cancel download if in progress
    const handle = this.downloads.get(queueId);
    if (handle?.process) {
      handle.process.kill();
      this.downloads.delete(queueId);
    }

    // If currently playing, stop
    if (item.status === "playing") {
      castManager.stopMedia().catch(() => {});
    }

    // Clean up downloaded file
    deleteDownload(item.video.id);

    this.queue.splice(index, 1);
    this.emit("queue-updated");
  }

  moveItem(queueId: string, newIndex: number): void {
    const currentIndex = this.queue.findIndex((i) => i.queueId === queueId);
    if (currentIndex === -1) return;

    const [item] = this.queue.splice(currentIndex, 1);
    const clampedIndex = Math.max(0, Math.min(newIndex, this.queue.length));
    this.queue.splice(clampedIndex, 0, item);
    this.emit("queue-updated");
  }

  clearPlayed(): void {
    const played = this.queue.filter((i) => i.status === "played");
    for (const item of played) {
      deleteDownload(item.video.id);
    }
    this.queue = this.queue.filter((i) => i.status !== "played");
    this.emit("queue-updated");
  }

  /** Count items that are not played/error */
  activeItemCount(): number {
    return this.queue.filter(
      (i) => i.status !== "played" && i.status !== "error"
    ).length;
  }

  private markStatus(queueId: string, status: QueueItemStatus): void {
    const item = this.queue.find((i) => i.queueId === queueId);
    if (item) {
      item.status = status;
      if (status === "played") {
        historyManager.recordPlayed(item.video.id, item.video.title);
        this.trimPlayedItems();
      }
      this.emit("queue-updated");
    }
  }

  private trimPlayedItems(): void {
    const played = this.queue
      .filter((i) => i.status === "played")
      .sort((a, b) => b.addedAt - a.addedAt);

    const toRemove = played.slice(3);
    for (const item of toRemove) {
      deleteDownload(item.video.id);
      const idx = this.queue.indexOf(item);
      if (idx !== -1) this.queue.splice(idx, 1);
    }
    if (toRemove.length > 0) {
      this.emit("queue-updated");
    }
  }

  private scheduleCleanup(queueId: string): void {
    setTimeout(() => {
      const item = this.queue.find((i) => i.queueId === queueId);
      if (item && item.status === "played") {
        deleteDownload(item.video.id);
      }
    }, this.cleanupDelay);
  }
}

// Singleton that survives HMR
const globalForQueue = globalThis as unknown as {
  queueManager: QueueManager | undefined;
};

export const queueManager =
  globalForQueue.queueManager ?? new QueueManager();

globalForQueue.queueManager = queueManager;
