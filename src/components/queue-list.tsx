"use client";

import { useCastStatus } from "@/hooks/use-cast-status";
import { useQueue } from "@/hooks/use-queue";
import { QueueItem } from "@/types/video";
import { CastDevice } from "@/types/cast";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatusBadge({ item }: { item: QueueItem }) {
  const statusConfig: Record<
    string,
    { label: string; className: string }
  > = {
    pending: { label: "Pending", className: "bg-zinc-600 text-zinc-300" },
    downloading: {
      label: `${item.downloadProgress}%`,
      className: "bg-blue-600/20 text-blue-400",
    },
    ready: { label: "Ready", className: "bg-green-600/20 text-green-400" },
    playing: { label: "Playing", className: "bg-red-600/20 text-red-400" },
    played: { label: "Played", className: "bg-zinc-700 text-zinc-500" },
    error: { label: "Error", className: "bg-red-900/30 text-red-400" },
  };

  const config = statusConfig[item.status] || statusConfig.pending;

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function SourceBadge({ item }: { item: QueueItem }) {
  if (item.source === "curated") {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-red-950/40 text-red-400/80 border border-red-900/30">
        curated
      </span>
    );
  }
  if (item.source === "manual") {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700/50">
        manual
      </span>
    );
  }
  return null;
}

function QueueItemRow({
  item,
  selectedDevice,
  playingId,
}: {
  item: QueueItem;
  selectedDevice?: CastDevice | null;
  playingId: string | null;
}) {
  const { removeFromQueue, playItem } = useQueue();

  const canPlay = item.status === "ready" && !playingId;
  const isLoading = playingId === item.queueId;
  const canRemove = item.status !== "playing";

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        item.status === "playing"
          ? "bg-red-950/20 border border-red-900/30"
          : item.status === "played"
            ? "bg-zinc-800/30 opacity-60"
            : "bg-zinc-800/50 hover:bg-zinc-800"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-20 h-12 shrink-0 rounded overflow-hidden bg-zinc-700">
        {item.video.thumbnail && (
          <img
            src={item.video.thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        {item.status === "downloading" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{item.video.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-zinc-500">
            {formatDuration(item.video.duration)}
          </span>
          <StatusBadge item={item} />
          <SourceBadge item={item} />
          {item.concept && (
            <span className="text-xs text-zinc-600">{item.concept}</span>
          )}
          {item.error && (
            <span className="text-xs text-red-400 truncate">{item.error}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {(canPlay || isLoading) && (
          <button
            onClick={() => playItem(item.queueId, selectedDevice ?? undefined)}
            disabled={isLoading || !canPlay}
            className={`p-1.5 transition-colors ${
              isLoading
                ? "text-yellow-400 animate-pulse cursor-wait"
                : "text-green-400 hover:text-green-300"
            }`}
            title={isLoading ? "Loading..." : "Play now"}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
        {canRemove && (
          <button
            onClick={() => removeFromQueue(item.queueId)}
            className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
            title="Remove"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function QueueList({ selectedDevice }: { selectedDevice?: CastDevice | null }) {
  const { queue } = useCastStatus();
  const { clearPlayed, playingId } = useQueue();

  const hasPlayed = queue.some((i) => i.status === "played");

  if (queue.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-8">
        Queue is empty. Add a video or enable auto-curation above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Queue ({queue.length})
        </h2>
        {hasPlayed && (
          <button
            onClick={clearPlayed}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear played
          </button>
        )}
      </div>
      {queue.map((item) => (
        <QueueItemRow
          key={item.queueId}
          item={item}
          selectedDevice={selectedDevice}
          playingId={playingId}
        />
      ))}
    </div>
  );
}
