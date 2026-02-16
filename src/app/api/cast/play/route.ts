import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { castManager } from "@/lib/cast-manager";
import { queueManager } from "@/lib/queue-manager";
import { detectPort } from "@/lib/network";

const PlaySchema = z.object({
  queueId: z.string(),
  device: z
    .object({
      id: z.string(),
      name: z.string(),
      host: z.string(),
      port: z.number(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    detectPort(request.headers.get("host"));

    const body = await request.json();
    const parsed = PlaySchema.parse(body);
    console.log(`[Play] queueId=${parsed.queueId}, device=${parsed.device?.name || "none"}, connected=${castManager.isConnected()}`);

    // Connect to device if not already connected
    if (!castManager.isConnected()) {
      if (!parsed.device) {
        return NextResponse.json(
          { error: "Not connected — select a Chromecast device first" },
          { status: 400 }
        );
      }
      await castManager.connect(parsed.device);
    } else if (
      parsed.device &&
      castManager.getConnectedDevice()?.id !== parsed.device.id
    ) {
      // Switch to a different device
      await castManager.connect(parsed.device);
    }

    const item = queueManager.getItem(parsed.queueId);
    if (!item) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 }
      );
    }

    if (item.status !== "ready") {
      console.log(`[Play] Item not ready: ${item.status}`);
      return NextResponse.json(
        { error: `Item is not ready (status: ${item.status})` },
        { status: 400 }
      );
    }

    console.log(`[Play] Playing ${item.video.title} (chunks: ${item.chunks?.length ?? "none"})`);
    await queueManager.playItem(parsed.queueId);
    console.log(`[Play] Play complete`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Play failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
