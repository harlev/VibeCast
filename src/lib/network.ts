import os from "os";

let cachedLanIp: string | null = null;
let serverPort: string = "3000";

export function getLanIp(): string {
  if (cachedLanIp) return cachedLanIp;

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        cachedLanIp = iface.address;
        return cachedLanIp;
      }
    }
  }

  return "127.0.0.1";
}

/** Call from any API route to detect the actual server port */
export function detectPort(hostHeader: string | null): void {
  if (hostHeader) {
    const portMatch = hostHeader.match(/:(\d+)$/);
    if (portMatch) {
      serverPort = portMatch[1];
    }
  }
}

export function getStreamUrl(videoId: string): string {
  // Cache-buster to prevent Chromecast from using stale cached media
  const cb = Date.now();
  return `http://${getLanIp()}:${serverPort}/api/video/stream/${videoId}?cb=${cb}`;
}
