#!/usr/bin/env node
// claude-ntfy: turn Claude Code lifecycle events into push notifications across providers.
// Hook mode (stdin JSON) branches on hook_event_name; CLI mode (argv) configures/tests.
// No deps. Never fails the hook (always exits 0).
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadConfig, resolveProviderId, setKeys, CONFIG_FILE } from './lib/config.mjs';
import { buildStopMessage, buildNotificationMessage, KIND } from './lib/message.mjs';
import { providers, deliver } from './providers/index.mjs';

const TITLE_PREFIX = process.env.NTFY_TITLE_PREFIX || 'Claude Code';
const DEFAULT_SERVER = 'https://ntfy.sh';

main().catch(() => {}).finally(() => process.exit(0));

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length) return cli(argv);
  const input = parseJSON(await readStdin()) || {};
  switch (input.hook_event_name) {
    case 'SessionStart': return onSessionStart();
    case 'Stop': return onStop(input);
    case 'Notification': return onNotification(input);
  }
}

async function onSessionStart() {
  const env = process.env;
  const cfg = loadConfig();
  const providerId = resolveProviderId(cfg, env);
  const provider = providers[providerId];
  if (!provider) {
    emit({ systemMessage: `claude-ntfy: unknown provider "${providerId}". Run /claude-ntfy setup to configure a channel.` });
    return;
  }
  if (provider.fromConfig(cfg, env)) return; // already configured → silent
  if (providerId === 'ntfy') return mintNtfy(env);
  emit({ systemMessage: `claude-ntfy: provider "${providerId}" is selected but not configured yet. Run /claude-ntfy setup to add its webhook.` });
}

async function mintNtfy(env) {
  const topic = 'claude-' + randomUUID();
  const server = DEFAULT_SERVER;
  try { setKeys({ provider: 'ntfy', 'ntfy.topic': topic, 'ntfy.server': server }); } catch { return; }
  try {
    await providers.ntfy.send(
      providers.ntfy.render({ title: TITLE_PREFIX, body: 'claude-ntfy connected — Claude Code updates will arrive here.', kind: KIND.COMPLETION }),
      { topic, server },
    );
  } catch {}
  emit({
    systemMessage: subscribeInstructions(topic, server),
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'claude-ntfy minted a new ntfy topic and showed the user one-time subscribe instructions.' },
  });
}

async function onStop(input) {
  const env = process.env;
  const cfg = loadConfig();
  let raw = '';
  try { raw = input.transcript_path ? readFileSync(input.transcript_path, 'utf8') : ''; } catch {}
  const message = buildStopMessage({ transcriptRaw: raw, cwd: input.cwd, titlePrefix: TITLE_PREFIX });
  if (!message) return;
  await deliver({ providerId: resolveProviderId(cfg, env), cfg, env, message });
}

async function onNotification(input) {
  const env = process.env;
  const cfg = loadConfig();
  const message = buildNotificationMessage({ message: input.message, cwd: input.cwd, titlePrefix: TITLE_PREFIX });
  await deliver({ providerId: resolveProviderId(cfg, env), cfg, env, message });
}

async function cli(argv) {
  // Implemented in Task 7.
  process.stderr.write('usage: notify.mjs [--set k=v ...] [--test [kind]] [--show]\n');
}

function subscribeInstructions(topic, server) {
  const url = `${String(server).replace(/\/$/, '')}/${topic}`;
  return [
    '📲 claude-ntfy is set up. Your private push topic:',
    '',
    `    ${topic}`,
    '',
    'Subscribe once to get Claude Code updates on your phone:',
    '  1. Install the "ntfy" app (App Store / Google Play), or open the URL below in a browser.',
    `  2. In the app: tap ＋ → "Subscribe to topic" → paste:  ${topic}`,
    `  3. Web alternative: ${url}`,
    '',
    `Topic saved to ${CONFIG_FILE} (never committed; survives plugin updates).`,
    'To use a different channel (Slack, Discord, webhook), run /claude-ntfy setup.',
  ].join('\n');
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let d = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (d += c));
    process.stdin.on('end', () => resolve(d));
    process.stdin.on('error', () => resolve(d));
  });
}

function parseJSON(s) { try { return JSON.parse(s); } catch { return null; } }
function emit(obj) { process.stdout.write(JSON.stringify(obj)); }
