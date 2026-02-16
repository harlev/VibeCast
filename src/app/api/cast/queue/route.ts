import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { queueManager } from "@/lib/queue-manager";
import { getVideoInfo, isValidYouTubeUrl } from "@/lib/ytdlp";
import { detectPort } from "@/lib/network";

const AddToQueueSchema = z.object({
  url: z.string().url(),
});

const UpdateQueueSchema = z.object({
  queueId: z.string(),
  action: z.enum(["move", "remove"]),
  newIndex: z.number().optional(),
});

// GET: return current queue
export async function GET() {
  return NextResponse.json(queueManager.getQueue());
}

// POST: add video to queue
export async function POST(request: NextRequest) {
  try {
    detectPort(request.headers.get("host"));

    const body = await request.json();
    const parsed = AddToQueueSchema.parse(body);

    if (!isValidYouTubeUrl(parsed.url)) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    const videoInfo = await getVideoInfo(parsed.url);
    const item = await queueManager.addVideo(videoInfo);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add to queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: move item in queue
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateQueueSchema.parse(body);

    if (parsed.action === "move" && parsed.newIndex !== undefined) {
      queueManager.moveItem(parsed.queueId, parsed.newIndex);
    } else if (parsed.action === "remove") {
      queueManager.removeItem(parsed.queueId);
    }

    return NextResponse.json(queueManager.getQueue());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: clear played items
export async function DELETE() {
  queueManager.clearPlayed();
  return NextResponse.json(queueManager.getQueue());
}
