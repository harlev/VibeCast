"use client";

import { useState } from "react";
import { useQueue } from "@/hooks/use-queue";

export function UrlInput() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { adding, addToQueue } = useQueue();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!trimmed) return;

    try {
      await addToQueue(trimmed);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add video");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube URL..."
          className="flex-1 px-3 py-2.5 bg-[--color-elevated] border border-[--color-border] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
          disabled={adding}
        />
        <button
          type="submit"
          disabled={adding || !url.trim()}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          {adding ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
              Adding...
            </span>
          ) : (
            "Add"
          )}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-rose-400">{error}</p>
      )}
    </form>
  );
}
