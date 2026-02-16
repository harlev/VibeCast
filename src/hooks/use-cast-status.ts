"use client";

import { useContext } from "react";
import { CastStatusContext } from "@/components/cast-status-provider";

export function useCastStatus() {
  const context = useContext(CastStatusContext);
  if (!context) {
    throw new Error("useCastStatus must be used within CastStatusProvider");
  }
  return context;
}
