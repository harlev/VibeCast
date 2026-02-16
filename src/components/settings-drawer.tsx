"use client";

import { useEffect, useRef, useState } from "react";
import { SettingsPanel } from "./settings-panel";
import { UrlInput } from "./url-input";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const [closing, setClosing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 250);
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open && !closing) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`relative w-[400px] max-w-[90vw] h-full bg-[--color-surface] border-l border-[--color-border] overflow-y-auto custom-scrollbar ${
          closing ? "animate-slide-out-right" : "animate-slide-in-right"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[--color-border]">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-[--color-elevated]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-8">
          {/* Curation Settings */}
          <section>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
              Curation
            </h3>
            <SettingsPanel />
          </section>

          {/* Manual Add */}
          <section>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
              Add Video Manually
            </h3>
            <UrlInput />
          </section>
        </div>
      </div>
    </div>
  );
}
