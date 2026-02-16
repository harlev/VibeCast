import { Client, DefaultMediaReceiver, MediaStatus } from "castv2-client";
import { EventEmitter } from "events";
import { PlaybackStatus, CastDevice } from "@/types/cast";
import { getStreamUrl } from "@/lib/network";

class CastManager extends EventEmitter {
  private client: Client | null = null;
  private player: InstanceType<typeof DefaultMediaReceiver> | null = null;
  private connectedDevice: CastDevice | null = null;
  private statusPollInterval: ReturnType<typeof setInterval> | null = null;
  private currentQueueId: string | null = null;
  private _status: PlaybackStatus = this.defaultStatus();

  private defaultStatus(): PlaybackStatus {
    return {
      connected: false,
      deviceName: null,
      playerState: null,
      currentTime: 0,
      duration: 0,
      volume: 1,
      muted: false,
      mediaTitle: null,
      currentQueueId: null,
    };
  }

  get status(): PlaybackStatus {
    return { ...this._status };
  }

  async connect(device: CastDevice): Promise<void> {
    // Silently tear down old connection without triggering event handlers
    if (this.client) {
      const oldClient = this.client;
      oldClient.removeAllListeners();
      this.client = null;
      this.player = null;
      this.stopPolling();
      try {
        oldClient.close();
      } catch {
        // ignore close errors
      }
    }

    return new Promise((resolve, reject) => {
      const client = new Client();

      const timeout = setTimeout(() => {
        client.removeAllListeners();
        client.close();
        reject(new Error("Connection timeout"));
      }, 10000);

      client.connect({ host: device.host, port: device.port }, () => {
        clearTimeout(timeout);
        this.client = client;
        this.connectedDevice = device;
        this._status.connected = true;
        this._status.deviceName = device.name;
        this.emit("status", this.status);

        client.on("error", (err: Error) => {
          console.error("Cast client error:", err.message);
          // Only disconnect if this is still the active client
          if (this.client === client) {
            this.disconnect();
          }
        });

        client.on("close", () => {
          if (this.client === client) {
            this.disconnect();
          }
        });

        resolve();
      });

      client.on("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  disconnect(): void {
    this.stopPolling();
    this.player = null;

    if (this.client) {
      const client = this.client;
      this.client = null;
      client.removeAllListeners();
      try {
        client.close();
      } catch {
        // ignore close errors
      }
    }

    this.connectedDevice = null;
    this.currentQueueId = null;
    this._status = this.defaultStatus();
    this.emit("status", this.status);
  }

  async loadMedia(
    videoId: string,
    title: string,
    thumbnail: string,
    queueId: string
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Not connected to a Chromecast");
    }

    const streamUrl = getStreamUrl(videoId);
    console.log(`[CastManager] Loading media: ${streamUrl}`);

    // Clean up previous player's status handler to prevent INTERRUPTED noise
    if (this.player) {
      this.player.removeAllListeners("status");
      this.player = null;
    }

    return new Promise((resolve, reject) => {
      this.client!.launch(DefaultMediaReceiver, (err, player) => {
        if (err) {
          console.error(`[CastManager] Launch failed: ${err.message}`);
          reject(new Error(`Failed to launch media receiver: ${err.message}`));
          return;
        }

        console.log(`[CastManager] Receiver launched OK`);
        this.player = player;
        this.currentQueueId = queueId;

        const media = {
          contentId: streamUrl,
          contentType: "video/mp4",
          streamType: "BUFFERED",
          metadata: {
            type: 0,
            metadataType: 0,
            title,
            images: thumbnail ? [{ url: thumbnail }] : [],
          },
        };

        player.load(media, { autoplay: true }, (err, status) => {
          if (err) {
            console.error(`[CastManager] Load failed: ${err.message}`);
            reject(new Error(`Failed to load media: ${err.message}`));
            return;
          }

          console.log(`[CastManager] Load OK — playerState: ${status?.playerState}, currentTime: ${status?.currentTime}, duration: ${status?.media?.duration}`);
          this.updateStatusFromMedia(status);
          this.startPolling();
          resolve();
        });

        player.on("status", (status: MediaStatus) => {
          console.log(`[CastManager] Status event: ${status.playerState}${status.idleReason ? ` (${status.idleReason})` : ""}, time=${status.currentTime}`);

          this.updateStatusFromMedia(status);

          if (status.playerState === "IDLE" && status.idleReason === "FINISHED") {
            this.stopPolling();
            this.emit("media-finished", this.currentQueueId);
          }

          if (status.playerState === "IDLE" && status.idleReason === "ERROR") {
            console.error("[CastManager] Chromecast reported media ERROR");
            this.stopPolling();
          }
        });
      });
    });
  }

  private updateStatusFromMedia(status: MediaStatus): void {
    this._status.playerState = status.playerState;
    this._status.currentTime = status.currentTime || 0;
    this._status.duration = status.media?.duration || this._status.duration;
    this._status.mediaTitle =
      status.media?.metadata?.title || this._status.mediaTitle;
    this._status.currentQueueId = this.currentQueueId;

    if (status.volume) {
      this._status.volume = status.volume.level;
      this._status.muted = status.volume.muted;
    }

    this.emit("status", this.status);
  }

  private startPolling(): void {
    this.stopPolling();
    this.statusPollInterval = setInterval(() => {
      if (this.player) {
        try {
          this.player.getStatus((err, status) => {
            if (err) {
              console.error("Status poll error:", err.message);
              return;
            }
            if (status) {
              this.updateStatusFromMedia(status);
            }
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("mediaSessionId")) {
            this.stopPolling();
            this.player = null;
            this._status.playerState = "IDLE";
            this.emit("status", this.status);
          }
        }
      }
    }, 1000);
  }

  private stopPolling(): void {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
      this.statusPollInterval = null;
    }
  }

  private playerCommand(
    method: "pause" | "play" | "stop",
  ): Promise<void> {
    if (!this.player) throw new Error("No active media session");
    return new Promise((resolve, reject) => {
      try {
        this.player![method]((err: Error | null) => {
          if (err) reject(new Error(`${method} failed: ${err.message}`));
          else resolve();
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("mediaSessionId")) {
          this.player = null;
          this._status.playerState = "IDLE";
          this.emit("status", this.status);
          reject(new Error("Media session expired — no media is playing"));
        } else {
          reject(err);
        }
      }
    });
  }

  async pause(): Promise<void> {
    return this.playerCommand("pause");
  }

  async play(): Promise<void> {
    return this.playerCommand("play");
  }

  async stopMedia(): Promise<void> {
    return this.playerCommand("stop");
  }

  async seek(time: number): Promise<void> {
    if (!this.player) throw new Error("No active media session");
    return new Promise((resolve, reject) => {
      try {
        this.player!.seek(time, (err) => {
          if (err) reject(new Error(`seek failed: ${err.message}`));
          else resolve();
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("mediaSessionId")) {
          this.player = null;
          this._status.playerState = "IDLE";
          this.emit("status", this.status);
          reject(new Error("Media session expired — no media is playing"));
        } else {
          reject(err);
        }
      }
    });
  }

  async setVolume(level: number): Promise<void> {
    if (!this.client) throw new Error("Not connected");
    return new Promise((resolve, reject) => {
      this.client!.setVolume(
        { level: Math.max(0, Math.min(1, level)) },
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  isConnected(): boolean {
    return this.client !== null && this._status.connected;
  }

  getConnectedDevice(): CastDevice | null {
    return this.connectedDevice;
  }
}

// Singleton that survives HMR
const globalForCast = globalThis as unknown as {
  castManager: CastManager | undefined;
};

export const castManager =
  globalForCast.castManager ?? new CastManager();

globalForCast.castManager = castManager;
