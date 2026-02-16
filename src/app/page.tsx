"use client";

import { useState } from "react";
import { CastStatusProvider } from "@/components/cast-status-provider";
import { UrlInput } from "@/components/url-input";
import { DeviceSelector } from "@/components/device-selector";
import { NowPlaying } from "@/components/now-playing";
import { PlayerControls } from "@/components/player-controls";
import { QueueList } from "@/components/queue-list";
import { ConceptManager } from "@/components/concept-manager";
import { SettingsPanel } from "@/components/settings-panel";
import { CurationStatus } from "@/components/curation-status";
import { CastDevice } from "@/types/cast";

export default function Home() {
  const [selectedDevice, setSelectedDevice] = useState<CastDevice | null>(null);

  return (
    <CastStatusProvider>
      <main className="min-h-screen flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-red-500">Vibe</span>Cast
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Ambient TV, auto-curated
            </p>
          </div>

          {/* Device selector */}
          <section>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
              Chromecast Device
            </label>
            <DeviceSelector
              onDeviceSelect={setSelectedDevice}
              selectedDeviceId={selectedDevice?.id}
            />
          </section>

          {/* Concepts */}
          <section>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
              Concepts
            </label>
            <ConceptManager />
          </section>

          {/* Settings */}
          <section>
            <SettingsPanel />
          </section>

          {/* Curation Status */}
          <CurationStatus />

          {/* URL Input (secondary) */}
          <section>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
              Add Video Manually
            </label>
            <UrlInput />
          </section>

          {/* Now Playing + Controls */}
          <section className="space-y-3">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block">
              Now Playing
            </label>
            <NowPlaying />
            <PlayerControls />
          </section>

          {/* Queue */}
          <section>
            <QueueList selectedDevice={selectedDevice} />
          </section>
        </div>
      </main>
    </CastStatusProvider>
  );
}
