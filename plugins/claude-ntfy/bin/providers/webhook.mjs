import { post } from '../lib/http.mjs';

export const id = 'webhook';

export function fromConfig(cfg, env) {
  const url = env.WEBHOOK_URL || cfg?.webhook?.url;
  return url ? { url, headers: cfg?.webhook?.headers || {} } : null;
}

export function render(message) {
  return { title: message.title, body: message.body, kind: message.kind, project: message.project };
}

export function send(payload, cfg) {
  const body = JSON.stringify({ ...payload, ts: new Date().toISOString() });
  return post(cfg.url, { headers: { 'Content-Type': 'application/json', ...cfg.headers }, body });
}
