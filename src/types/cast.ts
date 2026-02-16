export interface CastDevice {
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface PlaybackStatus {
  connected: boolean;
  deviceName: string | null;
  playerState: "IDLE" | "BUFFERING" | "PLAYING" | "PAUSED" | null;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  mediaTitle: string | null;
  currentQueueId: string | null;
}

export type CastCommand =
  | { action: "pause" }
  | { action: "play" }
  | { action: "stop" }
  | { action: "seek"; time: number }
  | { action: "volume"; level: number }
  | { action: "skip" };
