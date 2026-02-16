"use client";

import { useCastStatus } from "@/hooks/use-cast-status";
import { useQueue } from "@/hooks/use-queue";
import { useState } from "react";

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
    <div className="flex flex-col gap-3">
      {/* Seek bar */}
      {hasMedia && playback.duration > 0 && (
        <input
          type="range"
          min={0}
          max={playback.duration}
          value={playback.currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-red-500"
        />
      )}

      <div className="flex items-center justify-between">
        {/* Transport controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStop}
            disabled={!hasMedia}
            className="p-2 text-zinc-400 hover:text-white disabled:text-zinc-600 transition-colors"
            title="Stop"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>

          <button
            onClick={handlePlayPause}
            disabled={!hasMedia}
            className="p-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-zinc-600 rounded-full text-white transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleSkip}
            disabled={!playback.connected}
            className="p-2 text-zinc-400 hover:text-white disabled:text-zinc-600 transition-colors"
            title="Skip to next"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zm8.5-6v6h2V6h-2v6z" />
            </svg>
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
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
            className="w-24 h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>
      </div>
    </div>
  );
}
