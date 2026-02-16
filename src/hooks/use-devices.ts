"use client";

import { useState, useCallback } from "react";
import { CastDevice } from "@/types/cast";

export function useDevices() {
  const [devices, setDevices] = useState<CastDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<CastDevice | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cast/devices?timeout=5000");
      const data = await res.json();
      if (Array.isArray(data)) {
        setDevices(data);
        if (data.length > 0 && !selectedDevice) {
          setSelectedDevice(data[0]);
        }
      }
    } catch (error) {
      console.error("Device scan failed:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  return { devices, loading, scan, selectedDevice, setSelectedDevice };
}
