// plugins/claude-ntfy/test/hook.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = new URL('../bin/notify.mjs', import.meta.url).pathname;

function runHook(input, env = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    input: JSON.stringify(input),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

test('Stop hook + NOTIFY_DRY_RUN → prints resolved provider (slack)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ntfy-'));
  const transcript = join(dir, 't.jsonl');
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Opened PR #9 https://x.test/9' }] } }) + '\n');
  const r = runHook(
    { hook_event_name: 'Stop', transcript_path: transcript, cwd: '/x/proj' },
    { NOTIFY_DRY_RUN: '1', CLAUDE_NOTIFY_PROVIDER: 'slack', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/abc' },
  );
  assert.equal(r.status, 0);
  assert.match(r.stderr, /provider=slack/);
  assert.match(r.stderr, /Opened PR #9/);
});

test('Stop hook with unconfigured provider → no-op, exit 0, no output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ntfy-'));
  const transcript = join(dir, 't.jsonl');
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'done' }] } }) + '\n');
  const r = runHook(
    { hook_event_name: 'Stop', transcript_path: transcript, cwd: '/x/proj' },
    { CLAUDE_NOTIFY_PROVIDER: 'slack', SLACK_WEBHOOK_URL: '', NOTIFY_DRY_RUN: '1', CLAUDE_NTFY_CONFIG_FILE: join(dir, 'nope.json') },
  );
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stderr, /provider=/);
});
