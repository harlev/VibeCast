"use client";

import { useCallback } from "react";
import { useCastStatus } from "@/hooks/use-cast-status";
import { AppConfig } from "@/types/config";

export function useConfig() {
  const { config } = useCastStatus();

  const updateConfig = useCallback(async (partial: Partial<AppConfig>) => {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update config");
    }
    return (await res.json()) as AppConfig;
  }, []);

  return { config, updateConfig };
}
