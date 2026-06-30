import { post } from '../lib/http.mjs';
import { KIND } from '../lib/message.mjs';

const STYLE = {
  [KIND.COMPLETION]: { color: '#36a64f', emoji: '✅' },
  [KIND.NEEDS_YOU]: { color: '#f4b740', emoji: '❓' },
  [KIND.ERROR]: { color: '#d64541', emoji: '⚠️' },
  [KIND.ATTENTION]: { color: '#f4b740', emoji: '🔔' },
};

export const id = 'slack';

export function fromConfig(cfg, env) {
  const webhook = env.SLACK_WEBHOOK_URL || cfg?.slack?.webhook;
  return webhook ? { webhook } : null;
}

export function render(message) {
  const s = STYLE[message.kind] || STYLE[KIND.COMPLETION];
  return {
    text: `${s.emoji} *${message.title}*`,
    attachments: [{ color: s.color, text: message.body, fallback: message.body }],
  };
}

export function send(payload, cfg) {
  return post(cfg.webhook, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}
