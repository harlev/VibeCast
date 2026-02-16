"use client";

import { useState } from "react";
import { CastStatusProvider } from "@/components/cast-status-provider";
import { DeviceSelector } from "@/components/device-selector";
import { NowPlaying } from "@/components/now-playing";
import { PlayerControls } from "@/components/player-controls";
import { QueueList } from "@/components/queue-list";
import { ConceptManager } from "@/components/concept-manager";
import { CurationStatus } from "@/components/curation-status";
import { SettingsDrawer } from "@/components/settings-drawer";
import { CastDevice } from "@/types/cast";

export default function Home() {
  const [selectedDevice, setSelectedDevice] = useState<CastDevice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <CastStatusProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-[--color-border] bg-[--color-surface]">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-rose-500">Vibe</span>Cast
            </h1>
            <span className="text-xs text-zinc-500 hidden sm:block">
              Ambient TV, auto-curated
            </span>
          </div>

          <div className="flex items-center gap-4">
            <DeviceSelector
              onDeviceSelect={setSelectedDevice}
              selectedDeviceId={selectedDevice?.id}
            />
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-[--color-elevated] rounded-lg transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Panel */}
          <aside className="w-[380px] shrink-0 border-r border-[--color-border] flex flex-col overflow-y-auto custom-scrollbar bg-[--color-surface]/50">
            <div className="p-6 space-y-6 flex-1">
              {/* Concepts */}
              <section>
                <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Concepts
                </h2>
                <ConceptManager />
              </section>

              {/* Curation Status */}
              <section>
                <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Curation
                </h2>
                <CurationStatus />
              </section>
            </div>
          </aside>

          {/* Right Panel */}
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <QueueList selectedDevice={selectedDevice} />
          </main>
        </div>

        {/* Bottom Player Bar */}
        <footer className="h-20 shrink-0 flex items-center gap-6 px-6 border-t border-[--color-border] bg-[--color-surface]">
          <div className="w-[320px] shrink-0">
            <NowPlaying />
          </div>
          <div className="flex-1">
            <PlayerControls />
          </div>
        </footer>

        {/* Settings Drawer */}
        <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </CastStatusProvider>
  );
}
