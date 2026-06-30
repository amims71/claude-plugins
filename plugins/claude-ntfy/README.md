# claude-ntfy

Push Claude Code updates to your phone via [ntfy](https://ntfy.sh) — and make them
*useful*. Instead of a static "your turn" message, the **Stop** hook pushes what
Claude actually said at the end of the turn: the PR link, the decision it needs from
you, or the error it hit.

## What you get

| Event | Push |
| --- | --- |
| **Stop** (turn ends) | Claude's closing message, de-marked-down. Title/priority adapt: ends in a question → `… — needs you` (❓, high); mentions an error → `… — error` (⚠, high); otherwise a plain completion. `https://` links stay tappable. |
| **Notification** | Permission prompts and "needs attention" messages (🔔, high). |
| **SessionStart** | First run only: mints your private topic and shows subscribe steps. Silent afterwards. |

## Install

```
/plugin marketplace add amims71/claude-plugins
/plugin install claude-ntfy@amim
```

On your next session the plugin mints a **private topic** and prints one-time
subscribe instructions. Then:

1. Install the **ntfy** app ([iOS](https://apps.apple.com/app/ntfy/id1625396347) /
   [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy)) — or
   open `https://ntfy.sh/<your-topic>` in any browser.
2. In the app: **＋ → Subscribe to topic** → paste the topic name.
3. Done. A "connected ✅" push is waiting (ntfy.sh caches it ~12h).

The topic is saved to `~/.claude/ntfy-notify/config.json` — never committed, and it
survives `/plugin update`.

## Configuration (all optional)

Set these in `~/.claude/settings.json` under `"env"`, or in your shell:

| Var | Default | Purpose |
| --- | --- | --- |
| `NTFY_TOPIC` | *(auto-generated)* | Use a specific topic. Set this to an existing topic (e.g. one your `notify-me` CLI already uses) to unify everything on one subscription. When set, no topic is generated. |
| `NTFY_SERVER` | `https://ntfy.sh` | Self-hosted ntfy server. |
| `NTFY_TITLE_PREFIX` | `Claude Code` | Leading text in every push title. |
| `NTFY_DRY_RUN` | *(off)* | Print the payload to stderr instead of sending — handy for testing a hook locally. |

## Requirements

Node (ships with Claude Code) — no `npm install`, no `jq`/`curl`/bash. Runs the same
on macOS, Linux, and Windows.

## Privacy

Anyone who knows your topic name can read pushes sent to it and post to it. The
generated topic is a random UUID, so it's effectively unguessable — but don't share
it. To rotate, delete `~/.claude/ntfy-notify/config.json` (a new topic is minted
next session) or set `NTFY_TOPIC` yourself.
