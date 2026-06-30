import { post } from '../lib/http.mjs';
import { render as slackRender } from './slack.mjs';

export const id = 'discord';

export function fromConfig(cfg, env) {
  const webhook = env.DISCORD_WEBHOOK_URL || cfg?.discord?.webhook;
  return webhook ? { webhook } : null;
}

// Discord accepts Slack-formatted payloads at the /slack sub-path.
export const render = slackRender;

export function send(payload, cfg) {
  const url = String(cfg.webhook).replace(/\/+$/, '') + '/slack';
  return post(url, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}
