"use client";

import { useCastStatus } from "@/hooks/use-cast-status";
import { useCallback } from "react";

const phaseLabels: Record<string, string> = {
  "picking-concept": "Choosing concept",
  "generating-queries": "Generating queries",
  searching: "Searching YouTube",
  "fetching-metadata": "Fetching details",
  curating: "Reviewing results",
  "adding-to-queue": "Adding to queue",
};

export function CurationStatus() {
  const { curation, config } = useCastStatus();

  const triggerNow = useCallback(async () => {
    await fetch("/api/curation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trigger" }),
    });
  }, []);

  if (!config.curateEnabled && !curation.running) return null;

  const isActive = curation.phase !== "idle";
  const label = phaseLabels[curation.phase] || null;

  return (
    <div className="rounded-lg bg-[--color-elevated] border border-[--color-border] px-4 py-3">
      <div className="flex items-center gap-2">
        {isActive && (
          <svg
            className="animate-spin h-4 w-4 text-rose-400 shrink-0"
            viewBox="0 0 24 24"
          >
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
        )}
        <span className="text-sm text-zinc-300 flex-1">
          {isActive ? (
            <>
              {label}
              {curation.currentConcept && (
                <span className="text-rose-400">
                  {" "}
                  &mdash; {curation.currentConcept}
                </span>
              )}
            </>
          ) : curation.lastError ? (
            <span className="text-rose-400/80">{curation.lastError}</span>
          ) : curation.lastRun ? (
            <span className="text-zinc-500">
              {curation.videosAdded} videos curated total
            </span>
          ) : (
            <span className="text-zinc-500">Auto-curation enabled</span>
          )}
        </span>
        {!isActive && (
          <button
            onClick={triggerNow}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-700/50 hover:bg-zinc-700"
          >
            Run now
          </button>
        )}
      </div>
    </div>
  );
}
