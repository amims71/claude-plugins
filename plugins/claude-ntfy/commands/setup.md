---
description: Configure which channel claude-ntfy pushes to (ntfy, Slack, Discord, or a generic webhook).
---

Help the user pick and configure a notification channel for claude-ntfy.

Steps:
1. Ask which channel they want: **ntfy** (default, phone app), **slack**, **discord**, or **webhook** (any JSON endpoint).
2. If they pick ntfy, tell them it auto-configures on next session start — nothing to do here unless they want a specific topic (`NTFY_TOPIC`).
3. If they pick slack / discord / webhook, ask for the webhook URL. Point them to where to create it:
   - Slack: an Incoming Webhook (https://api.slack.com/messaging/webhooks).
   - Discord: Channel → Edit → Integrations → Webhooks → New Webhook → Copy URL.
   - Webhook: any URL that accepts a JSON POST.
4. Persist it by running the plugin CLI (do NOT hand-edit JSON):

   `node "${CLAUDE_PLUGIN_ROOT}/bin/notify.mjs" --set provider=<id> <id>.webhook=<URL>`

   (for the generic webhook the key is `webhook.url=<URL>`)
5. Send a test to confirm delivery:

   `node "${CLAUDE_PLUGIN_ROOT}/bin/notify.mjs" --test completion`

6. Confirm the result to the user and remind them the webhook URL is private (stored in `~/.claude/ntfy-notify/config.json`, never committed).
