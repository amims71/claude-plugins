import * as ntfy from './ntfy.mjs';
import * as slack from './slack.mjs';
import * as discord from './discord.mjs';
import * as webhook from './webhook.mjs';

export const providers = { ntfy, slack, discord, webhook };

function redact(cfg) {
  const r = { ...cfg };
  for (const k of ['webhook', 'url', 'topic']) if (r[k]) r[k] = String(r[k]).slice(0, 24) + '…';
  return r;
}

export async function deliver({ providerId, cfg, env, message }) {
  const provider = providers[providerId];
  if (!provider) return { delivered: false, reason: 'unknown-provider', id: providerId };
  const pcfg = provider.fromConfig(cfg, env);
  if (!pcfg) return { delivered: false, reason: 'unconfigured', id: provider.id };
  const payload = provider.render(message);
  if (env.NOTIFY_DRY_RUN || env.NTFY_DRY_RUN) {
    process.stderr.write(`[dry-run] provider=${provider.id}\n${JSON.stringify({ config: redact(pcfg), payload }, null, 2)}\n`);
    return { delivered: true, dryRun: true, id: provider.id };
  }
  try {
    await provider.send(payload, pcfg);
  } catch {
    /* never fail a hook */
  }
  return { delivered: true, id: provider.id };
}
