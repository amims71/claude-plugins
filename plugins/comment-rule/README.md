# comment-rule

A [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin that keeps Claude's code-commenting discipline consistent across long sessions and seats. No per-machine setup — install once, the hook + rule travel together.

## Why this exists

If you put the commenting rule in `CLAUDE.md` or memory, Claude follows it at the **start** of a session — diffs come back clean, no noise. But as the conversation grows, that rule slides further from the active context. By the time you're a few hundred turns in (or after a context compaction), Claude has effectively forgotten it: comments start creeping back in, then multiply, and you're back to stripping `// increment counter`-style noise out of every PR.

The fix is to never let the rule fall out of context in the first place. This plugin's `UserPromptSubmit` hook re-injects the single line `Remember the code commenting rule.` on **every** turn — cheap (one short string, no token bloat), unmissable (the hook fires before Claude reads the prompt), and pointed at a skill that holds the actual rule. So:

- **Turn 1**: Claude sees the reminder, consults the skill, writes clean code.
- **Turn 500**: Claude sees the reminder, consults the skill, writes clean code.

Same behavior at the end of a long session as at the start. That's the whole point.

## What it ships

1. **`UserPromptSubmit` hook** (`hooks/prepend-comment-rule.sh`) that injects the literal one-liner `Remember the code commenting rule.` into every prompt Claude sees. Tiny per-turn token cost — roughly one short sentence.
2. **`comment-rule` skill** (`skills/comment-rule/SKILL.md`) containing the actual rule (when to comment, when not to). The skill's name + description are advertised in the system prompt at session start so Claude can discover it; the body is read on-demand. Skill discovery is **model-driven, not deterministic** — that's precisely why the hook exists. The hook guarantees the reminder fires every turn even when Claude wouldn't have consulted the skill on its own. Steady-state per-turn cost is just the hook's one-liner; the skill body is not re-injected every request.

The hook reminds (every turn, guaranteed). The skill is the rule (loaded on-demand when the reminder lands). Shipping both in one plugin means neither is dangling.

## Install

This plugin lives in the **`amim` marketplace** (`amims71/claude-plugins`). Add the marketplace once, then install the plugin:

```
/plugin marketplace add amims71/claude-plugins
/plugin install comment-rule@amim
```

That's it. The hook registers automatically, the skill becomes discoverable, no `settings.json` editing required.

To uninstall:

```
/plugin uninstall comment-rule@amim
```

The hook unregisters cleanly — no leftover entries in user/project settings.

To pull in updates later:

```
/plugin marketplace update amim
/plugin install comment-rule@amim   # re-installs at the latest version
```

## Verify it's wired up

After install, in any Claude Code session:

```
/hooks
```

You should see `UserPromptSubmit` listing the plugin's `prepend-comment-rule.sh` script.

Submit any prompt — Claude's first action will reflect the rule (no superfluous comments; redundant ones it encounters in its diff get removed).

## Requirements

None beyond a POSIX `bash` (already present on every Claude Code seat — macOS, Linux, Windows via Git Bash / WSL). The hook is a single `printf` of a static JSON object; no `jq` or other external tool is invoked.

## Files

```
plugins/comment-rule/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks.json                  # registers UserPromptSubmit
│   └── prepend-comment-rule.sh     # emits the one-line reminder as JSON
├── skills/
│   └── comment-rule/
│       └── SKILL.md                # the rule itself (when to comment, when not to)
└── README.md
```

## License

MIT. Use it, fork it, change the rule wording in `SKILL.md` to taste — that's the only file most people will want to edit.
