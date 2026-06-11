// Token resolution: MONDAY_API_TOKEN env var wins (CI, agents, one-off use),
// otherwise ~/.config/mondayctl/config.json written by `mondayctl auth`.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".config", "mondayctl");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export function getToken(): string | null {
  const env = process.env.MONDAY_API_TOKEN;
  if (env && env.trim()) return env.trim();
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as { token?: string };
    return cfg.token?.trim() || null;
  } catch {
    return null;
  }
}

export function saveToken(token: string): string {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify({ token }, null, 2) + "\n", { mode: 0o600 });
  return CONFIG_PATH;
}
