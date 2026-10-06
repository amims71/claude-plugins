#!/bin/bash
# Points the user's status line at credit-gate's usage recorder, keeping any
# status line they already had. "setup.sh remove" puts the original back.
set -e

claude_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
settings="$claude_dir/settings.json"
dir="${CREDIT_GATE_DIR:-$claude_dir/credit-gate}"
recorder="$dir/statusline.sh"
saved="$dir/original-statusline.json"

[ -f "$settings" ] || echo '{}' > "$settings"
current=$(jq -c '.statusLine // empty' "$settings")

write_status_line() {
  cp "$settings" "$settings.bak-credit-gate"
  jq --argjson s "$1" 'if $s == null then del(.statusLine) else .statusLine = $s end' \
    "$settings" > "$settings.tmp" && mv "$settings.tmp" "$settings"
}

if [ "$1" = "remove" ]; then
  if [[ "$current" != *"$recorder"* ]]; then
    echo "credit-gate is not in your status line; nothing to remove."
    exit 0
  fi
  write_status_line "$(cat "$saved" 2>/dev/null || echo null)"
  rm -f "$saved"
  echo "Status line restored. credit-gate stops seeing usage, so it will no longer pause agents."
  exit 0
fi

mkdir -p "$dir"
cp "$(dirname "$0")/statusline.sh" "$recorder"
chmod +x "$recorder"

if [[ "$current" == *"$recorder"* ]]; then
  echo "Already set up; refreshed $recorder."
  exit 0
fi

if [ -n "$current" ]; then
  echo "$current" > "$saved"
  original=$(echo "$current" | jq -r '.command // empty')
  quoted="'$(printf '%s' "$original" | sed "s/'/'\\\\''/g")'"
  write_status_line "$(echo "$current" | jq --arg c "$recorder $quoted" '.command = $c')"
  echo "Your status line now records plan usage and still shows your own output."
else
  write_status_line "$(jq -n --arg c "$recorder" '{type: "command", command: $c}')"
  echo "Status line set to show plan usage, for example: 5h: 16%  7d: 3%"
fi
echo "Usage is recorded at the next status line refresh, after Claude's next reply."
