import { execFile, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { VideoInfo } from "@/types/video";
import { configManager } from "@/lib/config-manager";

const DOWNLOADS_DIR = path.join(process.cwd(), "downloads");

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]+/;

export function isValidYouTubeUrl(url: string): boolean {
  return YOUTUBE_URL_REGEX.test(url);
}

export function getDownloadPath(videoId: string): string {
  return path.join(DOWNLOADS_DIR, `${videoId}.mp4`);
}

export function isDownloaded(videoId: string): boolean {
  return fs.existsSync(getDownloadPath(videoId));
}

export function deleteDownload(videoId: string): void {
  const filePath = getDownloadPath(videoId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  // Also delete any chunk files
  try {
    for (const f of fs.readdirSync(DOWNLOADS_DIR)) {
      if (f.startsWith(`${videoId}_chunk_`) && f.endsWith(".mp4")) {
        fs.unlinkSync(path.join(DOWNLOADS_DIR, f));
      }
    }
  } catch {
    // ignore
  }
}

const CHUNK_SECONDS = 1800; // 30 minutes

export async function splitIntoChunks(
  videoId: string,
  duration: number
): Promise<string[] | null> {
  const numChunks = Math.ceil(duration / CHUNK_SECONDS);
  if (numChunks <= 1) return null;

  const inputPath = getDownloadPath(videoId);
  const chunks: string[] = [];

  for (let i = 0; i < numChunks; i++) {
    const chunkStem = `${videoId}_chunk_${String(i).padStart(3, "0")}`;
    const chunkPath = path.join(DOWNLOADS_DIR, `${chunkStem}.mp4`);
    const startTime = i * CHUNK_SECONDS;

    await new Promise<void>((resolve, reject) => {
      execFile(
        "ffmpeg",
        [
          "-i", inputPath,
          "-ss", String(startTime),
          "-t", String(CHUNK_SECONDS),
          "-c", "copy",
          "-movflags", "+faststart",
          "-y",
          chunkPath,
        ],
        { maxBuffer: 10 * 1024 * 1024 },
        (error) => {
          if (error) {
            reject(new Error(`ffmpeg chunk ${i} failed: ${error.message}`));
          } else {
            resolve();
          }
        }
      );
    });

    chunks.push(chunkStem);
  }

  // Delete original file now that chunks exist
  fs.unlinkSync(inputPath);

  return chunks;
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    execFile(
      "yt-dlp",
      ["-j", "--no-download", url],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`yt-dlp info failed: ${stderr || error.message}`));
          return;
        }
        try {
          const data = JSON.parse(stdout);
          resolve({
            id: data.id,
            title: data.title,
            thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || "",
            duration: data.duration || 0,
            uploader: data.uploader || data.channel || "",
            url,
          });
        } catch (e) {
          reject(new Error(`Failed to parse yt-dlp output: ${e}`));
        }
      }
    );
  });
}

export interface DownloadHandle {
  process: ChildProcess;
  promise: Promise<void>;
}

function getFormatString(quality?: "720p" | "1080p"): string {
  const q = quality ?? configManager.getConfig().quality;
  const height = q === "1080p" ? 1080 : 720;
  return `bestvideo[ext=mp4][vcodec^=avc1][height<=${height}]+bestaudio[ext=m4a]/best[ext=mp4][height<=${height}]`;
}

export function downloadVideo(
  videoId: string,
  url: string,
  onProgress?: (percent: number) => void,
  quality?: "720p" | "1080p"
): DownloadHandle {
  const outputPath = getDownloadPath(videoId);

  // If already downloaded, resolve immediately
  if (fs.existsSync(outputPath)) {
    onProgress?.(100);
    return {
      process: null as unknown as ChildProcess,
      promise: Promise.resolve(),
    };
  }

  // Pass path WITHOUT .mp4 extension — --merge-output-format adds it
  const outputBase = path.join(DOWNLOADS_DIR, videoId);

  const args = [
    "-f",
    getFormatString(quality),
    "--merge-output-format",
    "mp4",
    "--ppa",
    "ffmpeg:-movflags +faststart",
    "-o",
    outputBase,
    "--newline", // progress on separate lines
    "--no-playlist",
    url,
  ];

  const child = execFile("yt-dlp", args, {
    maxBuffer: 10 * 1024 * 1024,
  });

  const promise = new Promise<void>((resolve, reject) => {
    let lastProgress = 0;

    child.stdout?.on("data", (data: string) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        const match = line.match(/\[download\]\s+(\d+\.?\d*)%/);
        if (match) {
          const percent = parseFloat(match[1]);
          if (percent > lastProgress) {
            lastProgress = percent;
            onProgress?.(Math.round(percent));
          }
        }
      }
    });

    child.stderr?.on("data", (data: string) => {
      // yt-dlp sometimes outputs progress to stderr
      const lines = data.toString().split("\n");
      for (const line of lines) {
        const match = line.match(/\[download\]\s+(\d+\.?\d*)%/);
        if (match) {
          const percent = parseFloat(match[1]);
          if (percent > lastProgress) {
            lastProgress = percent;
            onProgress?.(Math.round(percent));
          }
        }
      }
    });

    child.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        onProgress?.(100);
        resolve();
      } else {
        // Clean up partial files
        for (const f of fs.readdirSync(DOWNLOADS_DIR)) {
          if (f.startsWith(videoId) && f !== `${videoId}.mp4`) {
            fs.unlinkSync(path.join(DOWNLOADS_DIR, f));
          }
        }
        reject(new Error(`yt-dlp download failed with code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`yt-dlp download error: ${err.message}`));
    });
  });

  return { process: child, promise };
}
