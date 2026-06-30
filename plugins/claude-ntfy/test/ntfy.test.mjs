import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ntfy from '../bin/providers/ntfy.mjs';
import { deliver } from '../bin/providers/index.mjs';
import { KIND } from '../bin/lib/message.mjs';

test('ntfy.render: kind → tags + priority', () => {
  assert.deepEqual(
    ntfy.render({ title: 'T', body: 'B', kind: KIND.ERROR }),
    { title: 'T', body: 'B', priority: 'high', tags: 'warning' },
  );
  assert.equal(ntfy.render({ title: 'T', body: 'B', kind: KIND.COMPLETION }).priority, 'default');
});
test('ntfy.fromConfig: env NTFY_TOPIC wins', () => {
  assert.deepEqual(ntfy.fromConfig({}, { NTFY_TOPIC: 't', NTFY_SERVER: 'https://s' }), { topic: 't', server: 'https://s' });
});
test('ntfy.fromConfig: legacy top-level {topic, server}', () => {
  assert.deepEqual(ntfy.fromConfig({ topic: 'old', server: 'https://o' }, {}), { topic: 'old', server: 'https://o' });
});
test('ntfy.fromConfig: nested ntfy section', () => {
  assert.deepEqual(ntfy.fromConfig({ ntfy: { topic: 'n', server: 'https://n' } }, {}), { topic: 'n', server: 'https://n' });
});
test('ntfy.fromConfig: default server when omitted', () => {
  assert.deepEqual(ntfy.fromConfig({ ntfy: { topic: 'n' } }, {}), { topic: 'n', server: 'https://ntfy.sh' });
});
test('ntfy.fromConfig: nothing → null', () => {
  assert.equal(ntfy.fromConfig({}, {}), null);
  assert.equal(ntfy.fromConfig(null, {}), null);
});

test('deliver: unknown providerId returns unknown-provider', async () => {
  const result = await deliver({
    providerId: 'bogus',
    cfg: {},
    env: {},
    message: { title: 'T', body: 'B', kind: 'completion', project: 'p' },
  });
  assert.deepEqual(result, { delivered: false, reason: 'unknown-provider', id: 'bogus' });
});

test('deliver: ntfy with no config returns unconfigured', async () => {
  const result = await deliver({
    providerId: 'ntfy',
    cfg: {},
    env: {},
    message: { title: 'T', body: 'B', kind: 'completion', project: 'p' },
  });
  assert.deepEqual(result, { delivered: false, reason: 'unconfigured', id: 'ntfy' });
});

test('deliver: ntfy with valid config and dry-run returns true', async () => {
  const result = await deliver({
    providerId: 'ntfy',
    cfg: { ntfy: { topic: 't', server: 'https://s' } },
    env: { NOTIFY_DRY_RUN: '1' },
    message: { title: 'T', body: 'B', kind: 'completion', project: 'p' },
  });
  assert.deepEqual(result, { delivered: true, dryRun: true, id: 'ntfy' });
});
