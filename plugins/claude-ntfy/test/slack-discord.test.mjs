// plugins/claude-ntfy/test/slack-discord.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as slack from '../bin/providers/slack.mjs';
import * as discord from '../bin/providers/discord.mjs';
import { KIND } from '../bin/lib/message.mjs';

test('slack.render: emoji title + colored attachment', () => {
  const p = slack.render({ title: 'Done', body: 'the body', kind: KIND.COMPLETION });
  assert.match(p.text, /✅/);
  assert.match(p.text, /Done/);
  assert.equal(p.attachments[0].color, '#36a64f');
  assert.equal(p.attachments[0].text, 'the body');
  assert.equal(p.attachments[0].fallback, 'the body');
});
test('slack.render: error color', () => {
  assert.equal(slack.render({ title: 'T', body: 'b', kind: KIND.ERROR }).attachments[0].color, '#d64541');
});
test('slack.fromConfig: env wins over cfg', () => {
  assert.deepEqual(slack.fromConfig({ slack: { webhook: 'c' } }, { SLACK_WEBHOOK_URL: 'e' }), { webhook: 'e' });
  assert.deepEqual(slack.fromConfig({ slack: { webhook: 'c' } }, {}), { webhook: 'c' });
  assert.equal(slack.fromConfig({}, {}), null);
});
test('discord.render reuses slack payload', () => {
  const msg = { title: 'T', body: 'b', kind: KIND.NEEDS_YOU };
  assert.deepEqual(discord.render(msg), slack.render(msg));
});
test('discord.fromConfig: DISCORD_WEBHOOK_URL', () => {
  assert.deepEqual(discord.fromConfig({}, { DISCORD_WEBHOOK_URL: 'd' }), { webhook: 'd' });
  assert.deepEqual(discord.fromConfig({ discord: { webhook: 'c' } }, {}), { webhook: 'c' });
});
