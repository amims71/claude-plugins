#!/bin/bash
# Pauses every Claude Code agent once plan usage crosses its threshold, until
# the user approves continuing on usage credits for the rest of that window.
# Usage numbers come from usage-state.json, written by statusline.sh.

dir="${CREDIT_GATE_DIR:-$HOME/.claude/credit-gate}"
state="$dir/usage-state.json"
approval="$dir/credit-approval.json"
denial="$dir/credit-denied"
lock="$dir/credit-gate.lock"
five_hour_limit="${CLAUDE_PLUGIN_OPTION_FIVE_HOUR_THRESHOLD:-95}"
seven_day_limit="${CLAUDE_PLUGIN_OPTION_SEVEN_DAY_THRESHOLD:-98}"
dialog_seconds=540
now=$(date +%s)

event=$(jq -r '.hook_event_name // empty')

if [ "$event" = "SessionStart" ]; then
  [ -f "$state" ] || jq -n '{systemMessage: "credit-gate is not watching usage yet. Run /credit-gate:setup once."}'
  exit 0
fi

[ -f "$state" ] || exit 0

# Prints each window that is over its threshold and not yet approved, as "name resets_at used".
pending_windows() {
  local approved
  approved=$(cat "$approval" 2>/dev/null || echo '{}')
  jq -r --argjson now "$now" --argjson approved "$approved" \
     --argjson five "$five_hour_limit" --argjson seven "$seven_day_limit" '
    [["five_hour", $five], ["seven_day", $seven]][] as [$name, $limit]
    | .rate_limits[$name] // empty
    | select(.resets_at > $now and .used_percentage >= $limit)
    | select(($approved[$name] // 0) < .resets_at)
    | "\($name) \(.resets_at) \(.used_percentage)"' "$state"
}

stop() {
  jq -n --arg reason "$1" '{continue: false, stopReason: $reason}'
  exit 0
}

pending=$(pending_windows)
[ -z "$pending" ] && exit 0

stop_reason="Plan usage limit crossed, paused so usage credits are not spent. Send any message to be asked again."

# A new prompt means the user is here, so ask again even after an earlier Stop.
if [ "$event" = "UserPromptSubmit" ]; then
  rm -f "$denial"
elif [ -f "$denial" ]; then
  stop "$stop_reason"
fi

# A lock older than the dialog's own timeout was left by a hook that was killed.
if [ -d "$lock" ] && [ $((now - $(stat -f %m "$lock"))) -gt $((dialog_seconds + 30)) ]; then
  rmdir "$lock"
fi

# One agent shows the dialog; the others wait for its answer.
if ! mkdir "$lock" 2>/dev/null; then
  while [ -d "$lock" ]; do sleep 2; done
  [ -z "$(pending_windows)" ] && exit 0
  stop "$stop_reason"
fi
trap 'rmdir "$lock" 2>/dev/null' EXIT

summary=$(echo "$pending" | awk '{
  label = ($1 == "five_hour") ? "5-hour" : "Weekly"
  printf "%s usage: %s%%\\n", label, $3
}')
answer=$(osascript -e "display dialog \"Claude plan limit crossed.\n\n${summary}\nContinue all agents on usage credits until this window resets?\" with title \"Claude usage credits\" buttons {\"Stop\", \"Allow credits\"} default button \"Stop\" with icon caution giving up after $dialog_seconds" 2>/dev/null)

if [[ "$answer" == *"Allow credits"* ]]; then
  approved=$(cat "$approval" 2>/dev/null || echo '{}')
  while read -r name resets_at _; do
    approved=$(echo "$approved" | jq --arg n "$name" --argjson r "$resets_at" '.[$n] = $r')
  done <<< "$pending"
  echo "$approved" > "$approval"
  rm -f "$denial"
  exit 0
fi

touch "$denial"
stop "$stop_reason"
