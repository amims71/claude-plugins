import { post } from '../lib/http.mjs';
import { KIND } from '../lib/message.mjs';

const DEFAULT_SERVER = 'https://ntfy.sh';
const STYLE = {
  [KIND.COMPLETION]: { tags: 'white_check_mark', priority: 'default' },
  [KIND.NEEDS_YOU]: { tags: 'question', priority: 'high' },
  [KIND.ERROR]: { tags: 'warning', priority: 'high' },
  [KIND.ATTENTION]: { tags: 'bell', priority: 'high' },
};

export const id = 'ntfy';

export function fromConfig(cfg, env) {
  if (env.NTFY_TOPIC) return { topic: env.NTFY_TOPIC, server: env.NTFY_SERVER || DEFAULT_SERVER };
  const n = cfg?.ntfy || (cfg?.topic ? { topic: cfg.topic, server: cfg.server } : null);
  if (n?.topic) return { topic: n.topic, server: env.NTFY_SERVER || n.server || DEFAULT_SERVER };
  return null;
}

export function render(message) {
  const s = STYLE[message.kind] || STYLE[KIND.COMPLETION];
  return { title: message.title, body: message.body, priority: s.priority, tags: s.tags };
}

export function send(payload, cfg) {
  const url = `${String(cfg.server).replace(/\/$/, '')}/${cfg.topic}`;
  const headers = { 'Content-Type': 'text/plain; charset=utf-8', Priority: payload.priority };
  if (payload.title) headers.Title = headerSafe(payload.title);
  if (payload.tags) headers.Tags = payload.tags;
  return post(url, { headers, body: payload.body || '' });
}

// ntfy Title is an HTTP header — strip newlines and anything outside printable latin1.
function headerSafe(s) {
  return String(s).replace(/[\r\n]+/g, ' ').replace(/[^\x20-\xFF]/g, '').trim() || (process.env.NTFY_TITLE_PREFIX || 'Claude Code');
}
