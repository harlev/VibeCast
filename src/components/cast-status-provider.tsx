"use client";

import { createContext, useEffect, useState, ReactNode, useRef } from "react";
import { PlaybackStatus } from "@/types/cast";
import { QueueItem } from "@/types/video";
import { CurationStatus, AppConfig } from "@/types/config";

const defaultCuration: CurationStatus = {
  running: false,
  phase: "idle",
  currentConcept: null,
  lastRun: null,
  lastError: null,
  videosAdded: 0,
};

const defaultConfig: AppConfig = {
  concepts: [],
  queueSize: 5,
  quality: "720p",
  curateEnabled: false,
};

interface CastStatusContextType {
  playback: PlaybackStatus;
  queue: QueueItem[];
  curation: CurationStatus;
  config: AppConfig;
}

const defaultPlayback: PlaybackStatus = {
  connected: false,
  deviceName: null,
  playerState: null,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  mediaTitle: null,
  currentQueueId: null,
};

export const CastStatusContext = createContext<CastStatusContextType | null>(
  null
);

export function CastStatusProvider({ children }: { children: ReactNode }) {
  const [playback, setPlayback] = useState<PlaybackStatus>(defaultPlayback);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [curation, setCuration] = useState<CurationStatus>(defaultCuration);
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let mounted = true;

    function connect() {
      if (!mounted) return;

      eventSource = new EventSource("/api/cast/status");

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.playback) setPlayback(data.playback);
          if (data.queue) setQueue(data.queue);
          if (data.curation) setCuration(data.curation);
          if (data.config) setConfig(data.config);
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        // Reconnect after a delay
        if (mounted) {
          retryTimeoutRef.current = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      mounted = false;
      eventSource?.close();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  return (
    <CastStatusContext.Provider value={{ playback, queue, curation, config }}>
      {children}
    </CastStatusContext.Provider>
  );
}
