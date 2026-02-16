"use client";

import { useCallback, useState } from "react";

export function useQueue() {
  const [adding, setAdding] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const addToQueue = useCallback(async (url: string) => {
    setAdding(true);
    try {
      const res = await fetch("/api/cast/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add to queue");
      }
      return await res.json();
    } finally {
      setAdding(false);
    }
  }, []);

  const removeFromQueue = useCallback(async (queueId: string) => {
    await fetch("/api/cast/queue", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueId, action: "remove" }),
    });
  }, []);

  const clearPlayed = useCallback(async () => {
    await fetch("/api/cast/queue", { method: "DELETE" });
  }, []);

  const playItem = useCallback(async (queueId: string, device?: { id: string; name: string; host: string; port: number }) => {
    if (playingId) return; // Prevent double-clicks
    setPlayingId(queueId);
    try {
      const res = await fetch("/api/cast/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId, device }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to play");
      }
    } finally {
      setPlayingId(null);
    }
  }, [playingId]);

  const sendControl = useCallback(
    async (action: string, params?: Record<string, unknown>) => {
      const res = await fetch("/api/cast/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Control failed");
      }
    },
    []
  );

  return { adding, addToQueue, removeFromQueue, clearPlayed, playItem, playingId, sendControl };
}
