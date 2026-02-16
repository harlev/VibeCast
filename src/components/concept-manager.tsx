"use client";

import { useState, KeyboardEvent } from "react";
import { useConfig } from "@/hooks/use-config";

export function ConceptManager() {
  const { config, updateConfig } = useConfig();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addConcept = async () => {
    const concept = input.trim().toLowerCase();
    if (!concept) return;
    if (config.concepts.includes(concept)) {
      setError("Already added");
      return;
    }
    setError(null);
    try {
      await updateConfig({ concepts: [...config.concepts, concept] });
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    }
  };

  const removeConcept = async (concept: string) => {
    try {
      await updateConfig({
        concepts: config.concepts.filter((c) => c !== concept),
      });
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addConcept();
    }
  };

  return (
    <div>
      {/* Concept pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {config.concepts.map((concept) => (
          <span
            key={concept}
            className="inline-flex items-center gap-1 bg-rose-950/30 text-rose-300 border border-rose-800/40 px-3 py-1 rounded-full text-sm animate-pill-appear"
          >
            {concept}
            <button
              onClick={() => removeConcept(concept)}
              className="ml-0.5 text-rose-400/60 hover:text-rose-300 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
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
          </span>
        ))}
        {config.concepts.length === 0 && (
          <span className="text-zinc-600 text-sm">
            No concepts yet. Add topics like &quot;nature&quot;, &quot;space&quot;, &quot;jazz&quot;.
          </span>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a concept..."
          className="flex-1 bg-[--color-elevated] border border-[--color-border] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/50 transition-colors"
        />
        <button
          onClick={addConcept}
          disabled={!input.trim()}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
      {error && <p className="text-rose-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
