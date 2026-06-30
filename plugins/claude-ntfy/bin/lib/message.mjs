export const KIND = {
  COMPLETION: 'completion',
  NEEDS_YOU: 'needs-you',
  ERROR: 'error',
  ATTENTION: 'attention',
};
export const BODY_CAP = 1500;

export function classify(body) {
  const s = String(body || '');
  if (s.replace(/\s+/g, '').slice(-1) === '?') return KIND.NEEDS_YOU;
  if (/\b(error|errored|failed|failure|exception|traceback)\b|couldn't|can't/i.test(s)) return KIND.ERROR;
  return KIND.COMPLETION;
}

export function clean(s) {
  return String(s || '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 $2')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`/g, '')
    .trim();
}

export function projectName(cwd) {
  return cwd ? String(cwd).replace(/[/\\]+$/, '').split(/[/\\]/).pop() : '';
}

export function cap(body, max = BODY_CAP) {
  const cp = [...String(body || '')];
  return cp.length > max ? cp.slice(0, max).join('') + '…' : String(body || '');
}

export function titleFor(prefix, cwd) {
  const proj = projectName(cwd);
  return proj ? `${prefix} · ${proj}` : prefix;
}

export function lastAssistantTextFromRaw(raw) {
  let last = '';
  for (const line of String(raw || '').split('\n')) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (!obj || obj.type !== 'assistant' || !Array.isArray(obj.message?.content)) continue;
    const text = obj.message.content.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
    if (text.trim()) last = text;
  }
  return last;
}

export function buildStopMessage({ transcriptRaw, cwd, titlePrefix }) {
  const body = cap(clean(lastAssistantTextFromRaw(transcriptRaw)));
  if (!body) return null;
  const kind = classify(body);
  const base = titleFor(titlePrefix, cwd);
  const title = kind === KIND.NEEDS_YOU ? `${base} — needs you`
    : kind === KIND.ERROR ? `${base} — error` : base;
  return { title, body, kind, project: projectName(cwd) };
}

export function buildNotificationMessage({ message, cwd, titlePrefix }) {
  const body = String(message || 'Claude Code needs your attention').trim();
  return { title: titleFor(titlePrefix, cwd), body, kind: KIND.ATTENTION, project: projectName(cwd) };
}
