import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const DOWNLOADS_DIR = path.join(process.cwd(), "downloads");

function nodeStreamToWeb(nodeStream: fs.ReadStream): ReadableStream<Uint8Array> {
  return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
}

function resolveFile(id: string): { filePath: string; fileSize: number } | null {
  const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitizedId) return null;

  const filePath = path.join(DOWNLOADS_DIR, `${sanitizedId}.mp4`);
  if (!fs.existsSync(filePath)) return null;

  return { filePath, fileSize: fs.statSync(filePath).size };
}

// Chromecast sends HEAD before GET to check content-length and range support
export async function HEAD(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = resolveFile(id);

  console.log(`[Stream] HEAD ${id} → ${file ? `${file.fileSize} bytes` : "404"}`);

  if (!file) {
    return new Response(null, { status: 404 });
  }

  return new Response(null, {
    status: 200,
    headers: {
      "Content-Length": String(file.fileSize),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = resolveFile(id);

  if (!file) {
    const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "");
    const expectedPath = path.join(DOWNLOADS_DIR, `${sanitizedId}.mp4`);
    console.error(`[Stream] GET 404: id="${id}", sanitized="${sanitizedId}", path="${expectedPath}", cwd="${process.cwd()}", exists=${fs.existsSync(expectedPath)}, dirExists=${fs.existsSync(DOWNLOADS_DIR)}`);
    return new Response("Video not found", { status: 404 });
  }

  const { filePath, fileSize } = file;
  const range = request.headers.get("range");
  console.log(`[Stream] GET ${id} range=${range || "none"} size=${fileSize}`);

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(filePath, { start, end });

    return new Response(nodeStreamToWeb(stream), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": "video/mp4",
      },
    });
  }

  const stream = fs.createReadStream(filePath);

  return new Response(nodeStreamToWeb(stream), {
    status: 200,
    headers: {
      "Content-Length": String(fileSize),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    },
  });
}
