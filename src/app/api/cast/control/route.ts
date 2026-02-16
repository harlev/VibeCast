import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { castManager } from "@/lib/cast-manager";
import { queueManager } from "@/lib/queue-manager";

const ControlSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("play") }),
  z.object({ action: z.literal("stop") }),
  z.object({ action: z.literal("seek"), time: z.number().min(0) }),
  z.object({ action: z.literal("volume"), level: z.number().min(0).max(1) }),
  z.object({ action: z.literal("skip") }),
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const command = ControlSchema.parse(body);

    if (!castManager.isConnected()) {
      return NextResponse.json(
        { error: "Not connected to a Chromecast" },
        { status: 400 }
      );
    }

    switch (command.action) {
      case "pause":
        await castManager.pause();
        break;
      case "play":
        await castManager.play();
        break;
      case "stop":
        await castManager.stopMedia();
        break;
      case "seek":
        await castManager.seek(command.time);
        break;
      case "volume":
        await castManager.setVolume(command.level);
        break;
      case "skip":
        await castManager.stopMedia();
        await queueManager.playNext();
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Control failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
