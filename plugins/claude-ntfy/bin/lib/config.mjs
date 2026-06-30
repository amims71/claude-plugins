import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export const CONFIG_FILE = process.env.CLAUDE_NTFY_CONFIG_FILE
  || join(homedir(), '.claude', 'ntfy-notify', 'config.json');
export const CONFIG_DIR = dirname(CONFIG_FILE);

export function loadConfig(file = CONFIG_FILE) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

export function resolveProviderId(cfg, env) {
  return env.CLAUDE_NOTIFY_PROVIDER || cfg?.provider || 'ntfy';
}

export function setKeys(updates, file = CONFIG_FILE) {
  const cfg = loadConfig(file) || {};
  for (const [path, value] of Object.entries(updates)) {
    const parts = path.split('.');
    let node = cfg;
    while (parts.length > 1) {
      const p = parts.shift();
      if (typeof node[p] !== 'object' || node[p] === null) node[p] = {};
      node = node[p];
    }
    node[parts[0]] = value;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
  return cfg;
}
