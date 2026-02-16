"use client";

import { useCastStatus } from "@/hooks/use-cast-status";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function NowPlaying() {
  const { playback, queue } = useCastStatus();

  const currentItem = queue.find((i) => i.status === "playing");

  if (!currentItem && !playback.mediaTitle) {
    return (
      <div className="p-6 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-center text-zinc-500">
        Nothing playing
      </div>
    );
  }

  const progress =
    playback.duration > 0
      ? (playback.currentTime / playback.duration) * 100
      : 0;

  return (
    <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
      <div className="flex gap-4">
        {currentItem?.video.thumbnail && (
          <img
            src={currentItem.video.thumbnail}
            alt=""
            className="w-32 h-20 object-cover rounded-lg shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">
            {currentItem?.video.title || playback.mediaTitle || "Unknown"}
          </h3>
          {currentItem?.video.uploader && (
            <p className="text-sm text-zinc-400 mt-0.5">
              {currentItem.video.uploader}
            </p>
          )}
          <div className="mt-3">
            <div className="w-full bg-zinc-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-zinc-500">
              <span>{formatTime(playback.currentTime)}</span>
              <span>{formatTime(playback.duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
