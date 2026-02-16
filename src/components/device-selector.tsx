"use client";

import { useEffect } from "react";
import { useDevices } from "@/hooks/use-devices";
import { CastDevice } from "@/types/cast";
import { useCastStatus } from "@/hooks/use-cast-status";

interface DeviceSelectorProps {
  onDeviceSelect: (device: CastDevice) => void;
  selectedDeviceId?: string;
}

export function DeviceSelector({
  onDeviceSelect,
  selectedDeviceId,
}: DeviceSelectorProps) {
  const { devices, loading, scan, selectedDevice, setSelectedDevice } =
    useDevices();
  const { playback } = useCastStatus();

  useEffect(() => {
    scan();
  }, [scan]);

  // Propagate auto-selected device to parent
  useEffect(() => {
    if (selectedDevice && !selectedDeviceId) {
      onDeviceSelect(selectedDevice);
    }
  }, [selectedDevice, selectedDeviceId, onDeviceSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const device = devices.find((d) => d.id === e.target.value);
    if (device) {
      setSelectedDevice(device);
      onDeviceSelect(device);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={selectedDeviceId || selectedDevice?.id || ""}
          onChange={handleChange}
          className="px-3 py-1.5 bg-[--color-elevated] border border-[--color-border] rounded-lg text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-rose-500 pr-8"
          disabled={loading}
        >
          {devices.length === 0 && (
            <option value="">
              {loading ? "Scanning..." : "No devices found"}
            </option>
          )}
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      <button
        onClick={scan}
        disabled={loading}
        className="p-1.5 bg-[--color-elevated] border border-[--color-border] hover:border-zinc-600 rounded-lg text-zinc-400 hover:text-white transition-colors"
        title="Rescan for devices"
      >
        <svg
          className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
      {playback.connected && (
        <span className="flex items-center gap-1.5 text-xs text-green-400">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Connected
        </span>
      )}
    </div>
  );
}
