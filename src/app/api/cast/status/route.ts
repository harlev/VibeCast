import { castManager } from "@/lib/cast-manager";
import { queueManager } from "@/lib/queue-manager";
import { autoCurator } from "@/lib/auto-curator";
import { configManager } from "@/lib/config-manager";
import { PlaybackStatus } from "@/types/cast";
import { QueueItem } from "@/types/video";
import { CurationStatus, AppConfig } from "@/types/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial status
      const initialData = {
        type: "status" as const,
        playback: castManager.status,
        queue: queueManager.getQueue(),
        curation: autoCurator.getStatus(),
        config: configManager.getConfig(),
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      );

      const onStatus = (playback: PlaybackStatus) => {
        try {
          const data = {
            type: "status",
            playback,
            queue: queueManager.getQueue(),
            curation: autoCurator.getStatus(),
            config: configManager.getConfig(),
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      const onQueueUpdate = () => {
        try {
          const data = {
            type: "queue",
            playback: castManager.status,
            queue: queueManager.getQueue(),
            curation: autoCurator.getStatus(),
            config: configManager.getConfig(),
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      const onCurationUpdate = (curation: CurationStatus) => {
        try {
          const data = {
            type: "curation",
            playback: castManager.status,
            queue: queueManager.getQueue(),
            curation,
            config: configManager.getConfig(),
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      const onConfigUpdate = (config: AppConfig) => {
        try {
          const data = {
            type: "config",
            playback: castManager.status,
            queue: queueManager.getQueue(),
            curation: autoCurator.getStatus(),
            config,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      castManager.on("status", onStatus);
      queueManager.on("queue-updated", onQueueUpdate);
      autoCurator.on("status-updated", onCurationUpdate);
      configManager.on("config-updated", onConfigUpdate);

      // Heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Cleanup when client disconnects
      const cleanup = () => {
        castManager.off("status", onStatus);
        queueManager.off("queue-updated", onQueueUpdate);
        autoCurator.off("status-updated", onCurationUpdate);
        configManager.off("config-updated", onConfigUpdate);
        clearInterval(heartbeat);
      };

      // Store cleanup function for cancel
      (controller as unknown as { _cleanup: () => void })._cleanup = cleanup;
    },
    cancel(controller) {
      const c = controller as unknown as { _cleanup?: () => void };
      c._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
