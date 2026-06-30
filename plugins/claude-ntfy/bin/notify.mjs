#!/usr/bin/env node
// claude-ntfy: turn Claude Code lifecycle events into ntfy push notifications.
// One entry, branches on hook_event_name. No deps. Never fails the hook (always exits 0).
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import https from 'node:https';

const CONFIG_DIR = join(homedir(), '.claude', 'ntfy-notify');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const DEFAULT_SERVER = 'https://ntfy.sh';
const TITLE_PREFIX = process.env.NTFY_TITLE_PREFIX || 'Claude Code';
const BODY_CAP = 1500;

run().catch(() => {}).finally(() => process.exit(0));

async function run() {
  const input = parseJSON(await readStdin()) || {};
  switch (input.hook_event_name) {
    case 'SessionStart': return onSessionStart();
    case 'Stop': return onStop(input);
    case 'Notification': return onNotification(input);
  }
}

// --- events -----------------------------------------------------------------

// First run only: mint a private topic, save it, welcome-push, show subscribe steps.
async function onSessionStart() {
  if (process.env.NTFY_TOPIC || loadConfig()) return; // env- or file-configured already
  const cfg = { topic: 'claude-' + randomUUID(), server: DEFAULT_SERVER };
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + '\n');
  } catch { return; }
  await postNtfy(cfg, { title: `${TITLE_PREFIX}`, tags: 'white_check_mark', body: 'claude-ntfy connected — Claude Code updates will arrive here.' });
  emit({
    systemMessage: subscribeInstructions(cfg),
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'claude-ntfy minted a new ntfy topic and showed the user one-time subscribe instructions.' },
  });
}

// Turn-end: push what Claude last said (PR link / decision / error), de-marked-down.
async function onStop(input) {
  const cfg = loadConfig();
  if (!cfg) return;
  let body = clean(lastAssistantText(input.transcript_path));
  if (!body) return;
  const cp = [...body];
  if (cp.length > BODY_CAP) body = cp.slice(0, BODY_CAP).join('') + '…';
  await postNtfy(cfg, { ...classify(body, input.cwd), body });
}

// Permission / attention prompts.
async function onNotification(input) {
  const cfg = loadConfig();
  if (!cfg) return;
  const body = String(input.message || 'Claude Code needs your attention').trim();
  await postNtfy(cfg, { title: titleFor(input.cwd), tags: 'bell', priority: 'high', body });
}

// --- formatting -------------------------------------------------------------

function classify(body, cwd) {
  if (body.replace(/\s+/g, '').slice(-1) === '?')
    return { title: `${titleFor(cwd)} — needs you`, tags: 'question', priority: 'high' };
  if (/\b(error|errored|failed|failure|exception|traceback)\b|couldn't|can't/i.test(body))
    return { title: `${titleFor(cwd)} — error`, tags: 'warning', priority: 'high' };
  return { title: titleFor(cwd), tags: 'white_check_mark', priority: 'default' };
}

function titleFor(cwd) {
  const proj = cwd ? String(cwd).replace(/[/\\]+$/, '').split(/[/\\]/).pop() : '';
  return proj ? `${TITLE_PREFIX} · ${proj}` : TITLE_PREFIX;
}

// Drop markdown noise but keep http(s) links — the ntfy app makes them tappable.
function clean(s) {
  return String(s || '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 $2')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`/g, '')
    .trim();
}

// Last non-empty assistant text message in the JSONL transcript.
function lastAssistantText(path) {
  if (!path) return '';
  let raw;
  try { raw = readFileSync(path, 'utf8'); } catch { return ''; }
  let last = '';
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const obj = parseJSON(line);
    if (!obj || obj.type !== 'assistant' || !Array.isArray(obj.message?.content)) continue;
    const text = obj.message.content.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
    if (text.trim()) last = text;
  }
  return last;
}

// --- io ---------------------------------------------------------------------

function loadConfig() {
  if (process.env.NTFY_TOPIC)
    return { topic: process.env.NTFY_TOPIC, server: process.env.NTFY_SERVER || DEFAULT_SERVER };
  const cfg = parseJSON(safeRead(CONFIG_FILE));
  if (cfg?.topic) return { topic: cfg.topic, server: process.env.NTFY_SERVER || cfg.server || DEFAULT_SERVER };
  return null;
}

function postNtfy({ server, topic }, { title, body, priority = 'default', tags }) {
  return new Promise((resolve) => {
    let url;
    try { url = new URL(`${String(server).replace(/\/$/, '')}/${topic}`); } catch { return resolve(); }
    if (process.env.NTFY_DRY_RUN) { // testable seam: print instead of sending
      process.stderr.write(`[dry-run] ${url}\n  Title: ${title}\n  Priority: ${priority}\n  Tags: ${tags || ''}\n  Body: ${body}\n`);
      return resolve();
    }
    const data = Buffer.from(body || '', 'utf8');
    const headers = { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': data.length, Priority: priority };
    if (title) headers.Title = headerSafe(title);
    if (tags) headers.Tags = tags;
    const lib = url.protocol === 'http:' ? http : https;
    const req = lib.request(url, { method: 'POST', headers, timeout: 5000 }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', () => resolve());
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.end(data);
  });
}

function subscribeInstructions({ topic, server }) {
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
    'To reuse an existing ntfy topic instead, set the NTFY_TOPIC env var.',
  ].join('\n');
}

// --- tiny helpers -----------------------------------------------------------

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
function safeRead(p) { try { return readFileSync(p, 'utf8'); } catch { return ''; } }
function emit(obj) { process.stdout.write(JSON.stringify(obj)); }
// ntfy Title is an HTTP header. Strip newlines, then re-emit UTF-8 as latin1 so Node's
// latin1 header serialization sends real UTF-8 bytes (ntfy decodes Title as UTF-8).
function headerSafe(s) {
  const t = String(s).replace(/[\r\n]+/g, ' ').trim() || TITLE_PREFIX;
  return Buffer.from(t, 'utf8').toString('latin1');
}
