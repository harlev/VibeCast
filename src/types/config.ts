export interface AppConfig {
  concepts: string[];
  queueSize: number;
  quality: "720p" | "1080p";
  curateEnabled: boolean;
}

export const defaultConfig: AppConfig = {
  concepts: [],
  queueSize: 5,
  quality: "720p",
  curateEnabled: false,
};

export interface PlayHistoryEntry {
  videoId: string;
  title: string;
  playedAt: number; // timestamp
}

export type CurationPhase =
  | "idle"
  | "picking-concept"
  | "generating-queries"
  | "searching"
  | "fetching-metadata"
  | "curating"
  | "adding-to-queue";

export interface CurationStatus {
  running: boolean;
  phase: CurationPhase;
  currentConcept: string | null;
  lastRun: number | null; // timestamp
  lastError: string | null;
  videosAdded: number;
}

export interface SearchCandidate {
  id: string;
  title: string;
  duration: number; // seconds
  uploader: string;
  viewCount: number;
  url: string;
  description?: string;
  thumbnail?: string;
  isLive?: boolean;
}
