import { execFile } from "child_process";
import { SearchCandidate } from "@/types/config";

export function searchYouTube(
  query: string,
  maxResults = 10
): Promise<SearchCandidate[]> {
  return new Promise((resolve, reject) => {
    execFile(
      "yt-dlp",
      ["--flat-playlist", "-j", `ytsearch${maxResults}:${query}`],
      { maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`yt-dlp search failed: ${stderr || error.message}`));
          return;
        }
        try {
          const candidates: SearchCandidate[] = [];
          const lines = stdout.trim().split("\n").filter(Boolean);
          for (const line of lines) {
            const data = JSON.parse(line);
            candidates.push({
              id: data.id,
              title: data.title || "",
              duration: data.duration || 0,
              uploader: data.uploader || data.channel || "",
              viewCount: data.view_count || 0,
              url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
              thumbnail: data.thumbnails?.[0]?.url || "",
              isLive: data.is_live || data.live_status === "is_live" || data.live_status === "is_upcoming",
            });
          }
          resolve(candidates);
        } catch (e) {
          reject(new Error(`Failed to parse yt-dlp search output: ${e}`));
        }
      }
    );
  });
}

export function getFullMetadata(
  videoId: string
): Promise<SearchCandidate> {
  return new Promise((resolve, reject) => {
    execFile(
      "yt-dlp",
      ["-j", "--no-download", `https://www.youtube.com/watch?v=${videoId}`],
      { maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(`yt-dlp metadata failed: ${stderr || error.message}`)
          );
          return;
        }
        try {
          const data = JSON.parse(stdout);
          resolve({
            id: data.id,
            title: data.title || "",
            duration: data.duration || 0,
            uploader: data.uploader || data.channel || "",
            viewCount: data.view_count || 0,
            url: `https://www.youtube.com/watch?v=${data.id}`,
            description: data.description || "",
            thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || "",
            isLive: data.is_live || data.live_status === "is_live" || data.live_status === "is_upcoming",
          });
        } catch (e) {
          reject(new Error(`Failed to parse yt-dlp metadata: ${e}`));
        }
      }
    );
  });
}
