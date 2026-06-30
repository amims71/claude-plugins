import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
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

test('ntfy.send round-trips a UTF-8 title (·/accents) through the latin1 Title header', async () => {
  const title = 'Claude Code · café';
  const received = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => { res.end('ok'); server.close(); resolve(req.headers.title); });
    server.listen(0, '127.0.0.1', async () => {
      const url = `http://127.0.0.1:${server.address().port}`;
      try { await ntfy.send({ title, body: 'b', priority: 'default', tags: 'bell' }, { topic: 't', server: url }); }
      catch (err) { server.close(); reject(err); }
    });
  });
  // Node emits header values as latin1 bytes; decoding back as UTF-8 must reproduce the original title.
  assert.equal(Buffer.from(received, 'latin1').toString('utf8'), title);
});
