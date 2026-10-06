# credit-gate

Stops every Claude Code agent from spending usage credits until you say so.

On a claude.ai plan with usage credits turned on, Claude Code keeps going on credits once your 5-hour or weekly allowance runs out, without asking. credit-gate watches your plan usage. When it crosses a threshold, every session, subagent and workflow agent on your Mac pauses on one dialog:

> **Claude plan limit crossed.**
> 5-hour usage: 95%
> Continue all agents on usage credits until this window resets?
> [Stop] [Allow credits]

- **Allow credits**: everything continues until that window resets. When the next window crosses its threshold, you're asked again.
- **Stop**, or no answer within 9 minutes: all agents halt with a message saying why. Your next message asks again.

## Install

```
/plugin install credit-gate@amim
/credit-gate:setup
```

Setup is needed once because plugins can't configure the status line, and the status line is where Claude Code reports plan usage. Setup points your status line at a small recorder in `~/.claude/credit-gate/`. If you already have a status line, it's kept: the recorder runs first and your own output is still what you see. A backup of your settings is saved as `settings.json.bak-credit-gate`.

Until setup has run, each new session shows a reminder, and the gate lets everything through.

## Thresholds

| Option | Default |
| --- | --- |
| 5-hour threshold | 95% |
| Weekly threshold | 98% |

Change them in `/config` under credit-gate. They sit below 100% on purpose; see the limits below.

## Requirements

- macOS (the dialog uses `osascript`)
- `jq` (built into macOS 15 and later; otherwise `brew install jq`)
- A claude.ai Pro, Max or Team seat that reports plan usage to the status line. If `/credit-gate:setup` runs but your status line shows `usage: n/a` after a reply, your plan doesn't report it and the gate can't work.

## Limits

- **One more turn.** Hooks can't block the model request itself, only the tool call or prompt after it. Each running agent can spend about one more turn before it reaches the gate. That's why the thresholds sit below 100%.
- **Needs a visible session.** Usage is refreshed only while an interactive session's status line is on screen. If only background agents are running, the numbers can go stale.
- **Local only.** It guards Claude Code on this Mac. For a hard limit enforced by Anthropic, set a spend limit at claude.ai/settings/usage, or ask your Team admin to.

## Remove

```
/credit-gate:setup remove
/plugin uninstall credit-gate@amim
```

`remove` puts your original status line back.

## Test

```
plugins/credit-gate/test/credit-gate.test.sh
```

The tests use fake usage numbers and a fake `osascript`, so no dialog appears.
