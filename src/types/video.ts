export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number; // seconds
  uploader: string;
  url: string; // original YouTube URL
}

export type QueueItemStatus =
  | "pending"
  | "downloading"
  | "ready"
  | "playing"
  | "played"
  | "error";

export interface QueueItem {
  queueId: string;
  video: VideoInfo;
  status: QueueItemStatus;
  downloadProgress: number; // 0-100
  error?: string;
  addedAt: number; // timestamp
  source?: "manual" | "curated";
  concept?: string;
  chunks?: string[]; // file stems for 30-min segments
  currentChunk?: number; // index into chunks array
}
