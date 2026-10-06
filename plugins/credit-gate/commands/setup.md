---
description: Connect credit-gate to your status line so it can see plan usage (run once), or remove it.
---

credit-gate reads plan usage from the status line, which a plugin cannot configure on its own. Set it up for the user.

Steps:
1. If the user asked to remove or undo credit-gate's status line, run `"${CLAUDE_PLUGIN_ROOT}/scripts/setup.sh" remove` and report its output. Stop there.
2. Otherwise run `"${CLAUDE_PLUGIN_ROOT}/scripts/setup.sh"` (do NOT hand-edit settings.json) and report its output.
3. Tell the user how the gate behaves:
   - At 5-hour usage ≥ the 5-hour threshold (default 95%) or weekly usage ≥ the weekly threshold (default 98%), every agent pauses and one macOS dialog asks **Allow credits** or **Stop**.
   - **Allow credits** lasts until that window resets. **Stop**, or no answer within 9 minutes, halts all agents; the user's next message asks again.
   - Thresholds can be changed in `/config` under the credit-gate plugin.
4. Mention the limits: each running agent can spend about one more turn before it reaches the gate, and usage refreshes only while an interactive session's status line is on screen.
