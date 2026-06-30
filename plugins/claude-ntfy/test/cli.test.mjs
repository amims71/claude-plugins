// plugins/claude-ntfy/test/cli.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = new URL('../bin/notify.mjs', import.meta.url).pathname;

function run(args, env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { env: { ...process.env, ...env }, encoding: 'utf8' });
}

test('--set then --show reflects the provider', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'ntfy-')), 'config.json');
  const setEnv = { CLAUDE_NTFY_CONFIG_FILE: file };
  const s = run(['--set', 'provider=slack', 'slack.webhook=https://hooks.slack.test/x'], setEnv);
  assert.equal(s.status, 0);
  assert.match(s.stdout, /Saved to/);
  const show = run(['--show'], setEnv);
  assert.match(show.stdout, /provider: slack/);
});

test('--test with dry-run sends a sample per kind', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'ntfy-')), 'config.json');
  const env = { CLAUDE_NTFY_CONFIG_FILE: file, CLAUDE_NOTIFY_PROVIDER: 'slack', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x', NOTIFY_DRY_RUN: '1' };
  const r = run(['--test'], env);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /completion: dry-run/);
  assert.match(r.stdout, /error: dry-run/);
});

test('--test reports NOT configured when no webhook', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'ntfy-')), 'config.json');
  const env = { CLAUDE_NTFY_CONFIG_FILE: file, CLAUDE_NOTIFY_PROVIDER: 'slack', SLACK_WEBHOOK_URL: '' };
  const r = run(['--test', 'completion'], env);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /completion: NOT configured \(slack\)/);
});
