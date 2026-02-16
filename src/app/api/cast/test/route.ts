import { NextRequest, NextResponse } from "next/server";
import { castManager } from "@/lib/cast-manager";
import { detectPort, getStreamUrl } from "@/lib/network";

export async function GET(request: NextRequest) {
  detectPort(request.headers.get("host"));

  // Auto-discover and connect if not already connected
  if (!castManager.isConnected()) {
    console.log("[Test] Discovering Chromecast devices...");
    const { discoverDevices } = await import("@/lib/device-discovery");
    const devices = await discoverDevices(5000);
    if (devices.length === 0) {
      return NextResponse.json({ error: "No Chromecast devices found" }, { status: 400 });
    }
    const target = devices.find(d => d.name.includes("TV")) || devices[0];
    console.log(`[Test] Found ${devices.length} device(s), connecting to: ${target.name}`);
    await castManager.connect(target);
    console.log("[Test] Connected!");
  }

  const localUrl = getStreamUrl("zhZikvuTVaw");
  console.log(`[Test] Loading: ${localUrl}`);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (castManager as any).client;
    if (!client) {
      return NextResponse.json({ error: "No client" }, { status: 500 });
    }

    const { DefaultMediaReceiver } = await import("castv2-client");

    const status = await new Promise<unknown>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client.launch(DefaultMediaReceiver, (err: Error | null, player: any) => {
        if (err) { reject(err); return; }

        const media = {
          contentId: localUrl,
          contentType: "video/mp4",
          streamType: "BUFFERED",
          metadata: { type: 0, metadataType: 0, title: "Cast Test" },
        };

        player.load(media, { autoplay: true }, (err: Error | null, status: unknown) => {
          if (err) { reject(err); return; }
          resolve(status);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        player.on("status", (s: any) => {
          console.log(`[Test] Player status: ${s.playerState}${s.idleReason ? ` (${s.idleReason})` : ""}`);
        });
      });
    });

    console.log(`[Test] Load result:`, JSON.stringify(status));
    return NextResponse.json({ success: true, url: localUrl, status });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Test] Error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
