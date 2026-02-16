declare module "castv2-client" {
  import { EventEmitter } from "events";

  export class Client extends EventEmitter {
    connect(host: string, callback: () => void): void;
    connect(options: { host: string; port?: number }, callback: () => void): void;
    launch(app: typeof DefaultMediaReceiver, callback: (err: Error | null, player: DefaultMediaReceiver) => void): void;
    getSessions(callback: (err: Error | null, sessions: Array<{ appId: string; transportId: string }>) => void): void;
    join(session: { appId: string; transportId: string }, app: typeof DefaultMediaReceiver, callback: (err: Error | null, player: DefaultMediaReceiver) => void): void;
    setVolume(volume: { level?: number; muted?: boolean }, callback: (err: Error | null, vol: { level: number; muted: boolean }) => void): void;
    getVolume(callback: (err: Error | null, vol: { level: number; muted: boolean }) => void): void;
    stop(player: DefaultMediaReceiver, callback: (err: Error | null) => void): void;
    close(): void;
  }

  export class DefaultMediaReceiver extends EventEmitter {
    static APP_ID: string;

    load(
      media: {
        contentId: string;
        contentType: string;
        streamType: string;
        metadata?: {
          type: number;
          metadataType: number;
          title?: string;
          images?: Array<{ url: string }>;
        };
      },
      options: { autoplay: boolean },
      callback: (err: Error | null, status: MediaStatus) => void
    ): void;

    pause(callback: (err: Error | null) => void): void;
    play(callback: (err: Error | null) => void): void;
    stop(callback: (err: Error | null) => void): void;
    seek(currentTime: number, callback: (err: Error | null) => void): void;

    getStatus(callback: (err: Error | null, status: MediaStatus) => void): void;

    on(event: "status", listener: (status: MediaStatus) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export interface MediaStatus {
    playerState: "IDLE" | "BUFFERING" | "PLAYING" | "PAUSED";
    idleReason?: "CANCELLED" | "INTERRUPTED" | "FINISHED" | "ERROR";
    currentTime: number;
    media?: {
      duration: number;
      metadata?: {
        title?: string;
      };
    };
    volume?: {
      level: number;
      muted: boolean;
    };
  }
}
