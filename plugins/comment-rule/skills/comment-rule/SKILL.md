---
name: comment-rule
description: Defines when Claude should and should NOT write code comments. Apply on any code edit/write/refactor. The companion UserPromptSubmit hook nudges Claude to recall this skill every turn — the skill itself is what the reminder points at.
---

# The code commenting rule

**Default: write no comments.** A comment must justify its existence; the absence of a comment is the right answer almost always.

## When a comment IS warranted

Only when the **WHY** is non-obvious and a future reader would otherwise be confused or break the code:

- A hidden constraint (e.g. "API requires this header lowercased — server rejects mixed case").
- A subtle invariant (e.g. "must run before X is mounted, otherwise the event listener attaches to the wrong target").
- A workaround for a specific bug or spec quirk (e.g. "Safari 17 fires `focus` twice — debounce").
- Behavior that would surprise a competent reader of this code.

Keep it to **one line** wherever possible. Two lines max. Never a paragraph, never a multi-line block, never a docstring with sections.

## When a comment is NOT warranted (delete or skip)

- Restating WHAT the code does ("// increment counter", "// loop through users") — well-named identifiers already do that.
- Narrating the change or its origin ("// added to fix bug #123", "// used by the X flow", "// previously called Y"). That belongs in the PR description and rots as the codebase evolves.
- Section headers ("// === Helpers ===", "// --- Validation ---") inside a normal function body.
- Restating type annotations or signatures.
- TODO/FIXME without a tracked issue or owner — either fix it now or file it; don't leave drift markers.
- Commented-out code. Delete it; git remembers.

## How to apply

1. Before writing a comment, ask: *would removing this comment confuse a future reader who doesn't know about the current task?* If no, don't write it.
2. When editing existing code, treat redundant comments around your change as fair game to remove (don't go on a comment-stripping crusade in unrelated files).
3. If the user explicitly asks for verbose comments, follow the user — they override this rule.

## One-liner the hook prepends

The companion hook injects `Remember the code commenting rule.` into every prompt. That string is intentionally short — its job is just to make sure Claude looks at *this* skill before writing code, not to re-state the rule inline.
