import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as webhook from '../bin/providers/webhook.mjs';

test('webhook.render: canonical fields, no ts', () => {
  assert.deepEqual(
    webhook.render({ title: 'T', body: 'b', kind: 'error', project: 'proj' }),
    { title: 'T', body: 'b', kind: 'error', project: 'proj' },
  );
});
test('webhook.fromConfig: env or cfg', () => {
  assert.deepEqual(webhook.fromConfig({ webhook: { url: 'u', headers: { X: '1' } } }, {}), { url: 'u', headers: { X: '1' } });
  assert.deepEqual(webhook.fromConfig({}, { WEBHOOK_URL: 'e' }), { url: 'e', headers: {} });
  assert.deepEqual(webhook.fromConfig({ webhook: { url: 'u' } }, {}), { url: 'u', headers: {} });
  assert.equal(webhook.fromConfig({}, {}), null);
});
test('webhook.send: POSTs JSON (with ts) to the url', async () => {
  const got = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => { res.end('ok'); server.close(); resolve({ body, ct: req.headers['content-type'] }); });
    });
    server.listen(0, '127.0.0.1', async () => {
      const url = `http://127.0.0.1:${server.address().port}/hook`;
      try {
        await webhook.send(webhook.render({ title: 'T', body: 'b', kind: 'error', project: 'p' }), { url, headers: {} });
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
  const json = JSON.parse(got.body);
  assert.equal(json.title, 'T');
  assert.equal(json.kind, 'error');
  assert.equal(typeof json.ts, 'string');
  assert.match(got.ct, /application\/json/);
});
