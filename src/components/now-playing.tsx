"use client";

import { useCastStatus } from "@/hooks/use-cast-status";

export function NowPlaying() {
  const { playback, queue } = useCastStatus();

  const currentItem = queue.find((i) => i.status === "playing");

  if (!currentItem && !playback.mediaTitle) {
    return (
      <div className="flex items-center h-full text-sm text-zinc-500">
        Nothing playing
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 h-full">
      {currentItem?.video.thumbnail && (
        <img
          src={currentItem.video.thumbnail}
          alt=""
          className={`w-14 h-14 object-cover rounded-md shrink-0 ${
            playback.playerState === "PLAYING" ? "animate-playing-glow" : ""
          }`}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">
          {currentItem?.video.title || playback.mediaTitle || "Unknown"}
        </p>
        {currentItem?.video.uploader && (
          <p className="text-xs text-zinc-400 truncate">
            {currentItem.video.uploader}
          </p>
        )}
      </div>
    </div>
  );
}
