import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { AppConfig, defaultConfig } from "@/types/config";

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");
const DATA_DIR = path.join(process.cwd(), "data");

class ConfigManager extends EventEmitter {
  private config: AppConfig;

  constructor() {
    super();
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.config = this.load();
  }

  private load(): AppConfig {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        return { ...defaultConfig, ...parsed };
      }
    } catch {
      // Corrupted file, use defaults
    }
    return { ...defaultConfig };
  }

  private save(): void {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<AppConfig>): AppConfig {
    this.config = { ...this.config, ...partial };
    this.save();
    this.emit("config-updated", this.getConfig());
    return this.getConfig();
  }
}

const globalForConfig = globalThis as unknown as {
  configManager: ConfigManager | undefined;
};

export const configManager =
  globalForConfig.configManager ?? new ConfigManager();

globalForConfig.configManager = configManager;
