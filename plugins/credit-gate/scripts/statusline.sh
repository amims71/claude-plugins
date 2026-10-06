#!/bin/bash
# Status line that records the plan usage Claude Code reports, for credit-gate.sh to read.
# With an argument, that command is the user's own status line: it gets the same
# input and its output is shown instead of the default usage line.

input=$(cat)
dir="${CREDIT_GATE_DIR:-$HOME/.claude/credit-gate}"
state="$dir/usage-state.json"

if echo "$input" | jq -e '.rate_limits' > /dev/null 2>&1; then
  mkdir -p "$dir"
  echo "$input" | jq --arg now "$(date +%s)" '{updated_at: ($now | tonumber), rate_limits}' \
    > "$state.tmp" && mv "$state.tmp" "$state"
fi

if [ -n "$1" ]; then
  echo "$input" | sh -c "$1"
else
  echo "$input" | jq -r '
    if .rate_limits then
      "5h: \(.rate_limits.five_hour.used_percentage // "-")%  7d: \(.rate_limits.seven_day.used_percentage // "-")%"
    else "usage: n/a" end'
fi
