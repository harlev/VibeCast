"use client";

import { useCastStatus } from "@/hooks/use-cast-status";
import { useQueue } from "@/hooks/use-queue";
import { useState } from "react";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerControls() {
  const { playback } = useCastStatus();
  const { sendControl } = useQueue();
  const [volume, setVolume] = useState(playback.volume);

  const isPlaying = playback.playerState === "PLAYING";
  const hasMedia =
    playback.playerState === "PLAYING" ||
    playback.playerState === "PAUSED" ||
    playback.playerState === "BUFFERING";

  const handlePlayPause = () => {
    sendControl(isPlaying ? "pause" : "play");
  };

  const handleStop = () => {
    sendControl("stop");
  };

  const handleSkip = () => {
    sendControl("skip");
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    sendControl("seek", { time });
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const level = parseFloat(e.target.value);
    setVolume(level);
    sendControl("volume", { level });
  };

  return (
    <div className="flex items-center gap-4 h-full">
      {/* Transport controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleStop}
          disabled={!hasMedia}
          className="p-1.5 text-zinc-400 hover:text-white disabled:text-zinc-600 transition-colors"
          title="Stop"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>

        <button
          onClick={handlePlayPause}
          disabled={!hasMedia}
          className="p-2.5 bg-white hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-full text-black transition-colors"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={handleSkip}
          disabled={!playback.connected}
          className="p-1.5 text-zinc-400 hover:text-white disabled:text-zinc-600 transition-colors"
          title="Skip to next"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zm8.5-6v6h2V6h-2v6z" />
          </svg>
        </button>
      </div>

      {/* Seek bar + time */}
      {hasMedia && playback.duration > 0 ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-zinc-500 tabular-nums w-10 text-right shrink-0">
            {formatTime(playback.currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={playback.duration}
            value={playback.currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-rose-500"
          />
          <span className="text-xs text-zinc-500 tabular-nums w-10 shrink-0">
            {formatTime(playback.duration)}
          </span>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Volume */}
      <div className="flex items-center gap-2 shrink-0">
        <svg
          className="w-4 h-4 text-zinc-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolume}
          className="w-20 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-white"
        />
      </div>
    </div>
  );
}
