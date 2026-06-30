import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveProviderId, setKeys, loadConfig } from '../bin/lib/config.mjs';

test('resolveProviderId: env > cfg > ntfy', () => {
  assert.equal(resolveProviderId({ provider: 'slack' }, { CLAUDE_NOTIFY_PROVIDER: 'discord' }), 'discord');
  assert.equal(resolveProviderId({ provider: 'slack' }, {}), 'slack');
  assert.equal(resolveProviderId({}, {}), 'ntfy');
  assert.equal(resolveProviderId(null, {}), 'ntfy');
});
test('setKeys: merges nested dotted keys and persists', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'ntfy-')), 'config.json');
  setKeys({ provider: 'slack', 'slack.webhook': 'https://hook' }, file);
  let cfg = loadConfig(file);
  assert.equal(cfg.provider, 'slack');
  assert.equal(cfg.slack.webhook, 'https://hook');
  setKeys({ 'slack.webhook': 'https://hook2' }, file);
  assert.equal(loadConfig(file).slack.webhook, 'https://hook2');
  assert.equal(loadConfig(file).provider, 'slack');
});
test('loadConfig: missing file → null', () => {
  assert.equal(loadConfig(join(tmpdir(), 'does-not-exist-xyz.json')), null);
});
