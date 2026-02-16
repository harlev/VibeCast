"use client";

import { useConfig } from "@/hooks/use-config";
import { useCallback, useEffect, useState } from "react";

export function SettingsPanel() {
  const { config, updateConfig } = useConfig();

  // API key state
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings/apikey")
      .then((r) => r.json())
      .then((data) => {
        setApiKeyConfigured(data.configured);
        setApiKeyMasked(data.masked);
      })
      .catch(() => {});
  }, []);

  const saveApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return;
    setSaveMessage(null);
    try {
      const res = await fetch("/api/settings/apikey", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMessage({ text: data.error || "Failed to save", type: "error" });
        return;
      }
      setApiKeyConfigured(data.configured);
      setApiKeyMasked(data.masked);
      setApiKeyInput("");
      setIsEditingKey(false);
      setSaveMessage({ text: "Saved", type: "success" });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ text: "Failed to save", type: "error" });
    }
  }, [apiKeyInput]);

  const toggleCuration = useCallback(async () => {
    const newEnabled = !config.curateEnabled;
    await updateConfig({ curateEnabled: newEnabled });

    // Start/stop the auto-curator
    await fetch("/api/curation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: newEnabled ? "start" : "stop" }),
    });
  }, [config.curateEnabled, updateConfig]);

  const setQueueSize = useCallback(
    async (size: number) => {
      const clamped = Math.max(1, Math.min(20, size));
      await updateConfig({ queueSize: clamped });
    },
    [updateConfig]
  );

  const setQuality = useCallback(
    async (quality: "720p" | "1080p") => {
      await updateConfig({ quality });
    },
    [updateConfig]
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Auto-curation toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">Auto-curate</span>
        <button
          onClick={toggleCuration}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            config.curateEnabled ? "bg-rose-600" : "bg-zinc-700"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              config.curateEnabled ? "left-5.5" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* Queue size */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-zinc-300">Queue size</label>
        <input
          type="number"
          min={1}
          max={20}
          value={config.queueSize}
          onChange={(e) => setQueueSize(parseInt(e.target.value) || 5)}
          className="w-16 bg-[--color-elevated] border border-[--color-border] rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-rose-500/50"
        />
      </div>

      {/* Quality toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-zinc-300">Quality</label>
        <div className="flex items-center gap-0">
          <button
            onClick={() => setQuality("720p")}
            className={`px-3 py-1.5 text-xs rounded-l-lg border ${
              config.quality === "720p"
                ? "bg-rose-600/20 border-rose-600/50 text-rose-300"
                : "bg-[--color-elevated] border-[--color-border] text-zinc-500 hover:text-zinc-300"
            }`}
          >
            720p
          </button>
          <button
            onClick={() => setQuality("1080p")}
            className={`px-3 py-1.5 text-xs rounded-r-lg border border-l-0 ${
              config.quality === "1080p"
                ? "bg-rose-600/20 border-rose-600/50 text-rose-300"
                : "bg-[--color-elevated] border-[--color-border] text-zinc-500 hover:text-zinc-300"
            }`}
          >
            1080p
          </button>
        </div>
      </div>

      {/* OpenAI API Key */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-zinc-300">OpenAI Key</label>
          {!isEditingKey && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 font-mono">
                {apiKeyConfigured ? apiKeyMasked : "Not set"}
              </span>
              <button
                onClick={() => setIsEditingKey(true)}
                className="px-2 py-1 text-xs bg-[--color-elevated] border border-[--color-border] text-zinc-500 rounded-lg hover:text-zinc-300 transition-colors"
              >
                {apiKeyConfigured ? "Edit" : "Set"}
              </button>
            </div>
          )}
        </div>
        {isEditingKey && (
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveApiKey()}
              placeholder="sk-..."
              className="flex-1 bg-[--color-elevated] border border-[--color-border] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-rose-500/50"
              autoFocus
            />
            <button
              onClick={saveApiKey}
              className="px-3 py-1.5 text-xs bg-rose-600/20 border border-rose-600/50 text-rose-300 rounded-lg hover:bg-rose-600/30"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditingKey(false);
                setApiKeyInput("");
                setSaveMessage(null);
              }}
              className="px-3 py-1.5 text-xs bg-[--color-elevated] border border-[--color-border] text-zinc-500 rounded-lg hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        )}
        {saveMessage && (
          <span
            className={`text-xs ${
              saveMessage.type === "success" ? "text-green-400" : "text-rose-400"
            }`}
          >
            {saveMessage.text}
          </span>
        )}
      </div>
    </div>
  );
}
