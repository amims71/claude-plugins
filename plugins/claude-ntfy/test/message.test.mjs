import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classify, clean, projectName, lastAssistantTextFromRaw,
  buildStopMessage, buildNotificationMessage, KIND,
} from '../bin/lib/message.mjs';

test('classify: trailing question → needs-you', () => {
  assert.equal(classify('Should I proceed?'), KIND.NEEDS_YOU);
});
test('classify: error words → error', () => {
  assert.equal(classify('The build failed with an exception'), KIND.ERROR);
});
test('classify: otherwise → completion', () => {
  assert.equal(classify('Opened PR #12'), KIND.COMPLETION);
});
test('clean: keeps http links, strips markdown + backticks', () => {
  assert.equal(clean('See [the PR](https://x.test/1) **now** `code`'), 'See the PR https://x.test/1 now code');
});
test('projectName: basename of cwd', () => {
  assert.equal(projectName('/home/u/proj/'), 'proj');
  assert.equal(projectName(''), '');
});
test('lastAssistantTextFromRaw: returns last assistant text', () => {
  const raw = [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'first' }] } }),
    JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'ignored' }] } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'second' }] } }),
  ].join('\n');
  assert.equal(lastAssistantTextFromRaw(raw), 'second');
});
test('buildStopMessage: needs-you title + kind + project', () => {
  const raw = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Want me to merge?' }] } });
  const m = buildStopMessage({ transcriptRaw: raw, cwd: '/home/u/proj', titlePrefix: 'Claude Code' });
  assert.equal(m.kind, KIND.NEEDS_YOU);
  assert.equal(m.title, 'Claude Code · proj — needs you');
  assert.equal(m.project, 'proj');
});
test('buildStopMessage: empty transcript → null', () => {
  assert.equal(buildStopMessage({ transcriptRaw: '', cwd: '/x', titlePrefix: 'Claude Code' }), null);
});
test('buildNotificationMessage: attention kind + default body', () => {
  const m = buildNotificationMessage({ message: '', cwd: '/a/b', titlePrefix: 'Claude Code' });
  assert.equal(m.kind, KIND.ATTENTION);
  assert.equal(m.title, 'Claude Code · b');
  assert.equal(m.body, 'Claude Code needs your attention');
});
