import fs from "fs";
import path from "path";
import { PlayHistoryEntry } from "@/types/config";

const HISTORY_PATH = path.join(process.cwd(), "data", "history.json");
const DATA_DIR = path.join(process.cwd(), "data");
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class HistoryManager {
  private history: PlayHistoryEntry[];

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.history = this.load();
  }

  private load(): PlayHistoryEntry[] {
    try {
      if (fs.existsSync(HISTORY_PATH)) {
        const raw = fs.readFileSync(HISTORY_PATH, "utf-8");
        return JSON.parse(raw);
      }
    } catch {
      // Corrupted file, start fresh
    }
    return [];
  }

  private save(): void {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(this.history, null, 2));
  }

  private prune(): void {
    const cutoff = Date.now() - TTL_MS;
    this.history = this.history.filter((e) => e.playedAt > cutoff);
  }

  recordPlayed(videoId: string, title: string): void {
    this.prune();
    // Update if already exists, otherwise add
    const existing = this.history.find((e) => e.videoId === videoId);
    if (existing) {
      existing.playedAt = Date.now();
      existing.title = title;
    } else {
      this.history.push({ videoId, title, playedAt: Date.now() });
    }
    this.save();
  }

  isRecentlyPlayed(videoId: string): boolean {
    this.prune();
    return this.history.some((e) => e.videoId === videoId);
  }

  getHistory(): PlayHistoryEntry[] {
    this.prune();
    return [...this.history];
  }

  clear(): void {
    this.history = [];
    this.save();
  }
}

const globalForHistory = globalThis as unknown as {
  historyManager: HistoryManager | undefined;
};

export const historyManager =
  globalForHistory.historyManager ?? new HistoryManager();

globalForHistory.historyManager = historyManager;
