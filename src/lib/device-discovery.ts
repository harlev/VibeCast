import { Bonjour, Service } from "bonjour-service";
import { CastDevice } from "@/types/cast";

let bonjourInstance: Bonjour | null = null;
let cachedDevices: CastDevice[] = [];
let lastScanTime = 0;
const SCAN_COOLDOWN_MS = 5000;

function getBonjourInstance(): Bonjour {
  if (!bonjourInstance) {
    bonjourInstance = new Bonjour();
  }
  return bonjourInstance;
}

export async function discoverDevices(
  timeoutMs: number = 5000
): Promise<CastDevice[]> {
  const now = Date.now();

  // Return cached results if within cooldown
  if (cachedDevices.length > 0 && now - lastScanTime < SCAN_COOLDOWN_MS) {
    return cachedDevices;
  }

  return new Promise((resolve) => {
    const devices: CastDevice[] = [];
    const bonjour = getBonjourInstance();

    const browser = bonjour.find({ type: "googlecast" });

    const onUp = (service: Service) => {
      const existing = devices.find(
        (d) => d.host === service.host && d.port === service.port
      );
      if (!existing && service.host) {
        devices.push({
          id: service.txt?.id || `${service.host}:${service.port}`,
          name:
            service.txt?.fn ||
            service.name ||
            `Chromecast (${service.host})`,
          host: service.host,
          port: service.port,
        });
      }
    };

    browser.on("up", onUp);

    setTimeout(() => {
      browser.stop();
      cachedDevices = devices;
      lastScanTime = Date.now();
      resolve(devices);
    }, timeoutMs);
  });
}
