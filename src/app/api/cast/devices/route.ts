import { NextRequest, NextResponse } from "next/server";
import { discoverDevices } from "@/lib/device-discovery";

export async function GET(request: NextRequest) {
  const timeout = parseInt(
    request.nextUrl.searchParams.get("timeout") || "5000",
    10
  );
  const clampedTimeout = Math.min(Math.max(timeout, 1000), 15000);

  try {
    const devices = await discoverDevices(clampedTimeout);
    return NextResponse.json(devices);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
