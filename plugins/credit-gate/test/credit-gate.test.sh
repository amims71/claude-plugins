#!/bin/bash
# Runs credit-gate's scripts against fake usage and a fake osascript. Usage: test/credit-gate.test.sh

root="$(cd "$(dirname "$0")/.." && pwd)"
gate="$root/scripts/credit-gate.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
export CREDIT_GATE_DIR="$tmp/gate" CLAUDE_CONFIG_DIR="$tmp/claude"
mkdir -p "$CREDIT_GATE_DIR" "$CLAUDE_CONFIG_DIR" "$tmp/bin"

# The fake dialog answers with $DIALOG_ANSWER and counts how often it was shown.
cat > "$tmp/bin/osascript" <<EOF
#!/bin/bash
echo x >> "$tmp/dialogs"
echo "button returned:\$DIALOG_ANSWER"
EOF
chmod +x "$tmp/bin/osascript"
export PATH="$tmp/bin:$PATH"

failures=0
check() {
  if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1: expected [$3], got [$2]"; failures=$((failures + 1)); fi
}

now=$(date +%s)
usage() {
  jq -n --argjson f "$1" --argjson s "$2" --argjson r5 "${3:-$((now + 3600))}" --argjson r7 $((now + 86400)) \
    '{rate_limits: {five_hour: {used_percentage: $f, resets_at: $r5}, seven_day: {used_percentage: $s, resets_at: $r7}}}' \
    > "$CREDIT_GATE_DIR/usage-state.json"
}
reset() { rm -rf "$CREDIT_GATE_DIR"/credit-* "$tmp/dialogs"; }
run() {
  local out
  out=$(echo "{\"hook_event_name\":\"${1:-PreToolUse}\"}" | "$gate")
  [ -z "$out" ] && echo allowed || echo "$out" | jq -r '.continue'
}
dialogs() { [ -f "$tmp/dialogs" ] && wc -l < "$tmp/dialogs" | tr -d ' ' || echo 0; }

check "SessionStart before setup nudges" "$(echo '{"hook_event_name":"SessionStart"}' | "$gate" | jq -r '.systemMessage | test("setup")')" "true"
check "no usage recorded allows" "$(run)" "allowed"

usage 94 97
check "under both thresholds allows" "$(run)" "allowed"
check "SessionStart after setup is silent" "$(echo '{"hook_event_name":"SessionStart"}' | "$gate")" ""

usage 95 10; reset
check "5-hour at 95 and Stop halts" "$(DIALOG_ANSWER=Stop run)" "false"
check "after Stop, tools halt without a second dialog" "$(DIALOG_ANSWER=Stop run; dialogs)" "false
1"
check "after Stop, a new prompt asks again" "$(DIALOG_ANSWER=Stop run UserPromptSubmit; dialogs)" "false
2"

reset
check "Allow credits lets work continue" "$(DIALOG_ANSWER="Allow credits" run)" "allowed"
check "approval holds without asking again" "$(run; dialogs)" "allowed
1"

usage 96 98
check "weekly crossing after 5-hour approval asks again" "$(DIALOG_ANSWER=Stop run)" "false"
check "approved 5-hour window not re-approved" "$(jq -r 'keys | join(",")' "$CREDIT_GATE_DIR/credit-approval.json")" "five_hour"

reset; usage 100 1 $((now - 5))
check "window past its reset is ignored" "$(run)" "allowed"

reset; usage 99 1
mkdir "$CREDIT_GATE_DIR/credit-gate.lock"
(sleep 2; jq -n --argjson r $((now + 3600)) '{five_hour: $r}' > "$CREDIT_GATE_DIR/credit-approval.json"; rmdir "$CREDIT_GATE_DIR/credit-gate.lock") &
check "waiting agent continues when the other dialog allows" "$(run; dialogs)" "allowed
0"

reset; mkdir "$CREDIT_GATE_DIR/credit-gate.lock"
(sleep 2; rmdir "$CREDIT_GATE_DIR/credit-gate.lock") &
check "waiting agent halts when the other dialog does not allow" "$(run; dialogs)" "false
0"

reset; mkdir "$CREDIT_GATE_DIR/credit-gate.lock"; touch -t 202001010000 "$CREDIT_GATE_DIR/credit-gate.lock"
check "lock left by a killed hook is cleared" "$(DIALOG_ANSWER=Stop run; dialogs)" "false
1"

CLAUDE_PLUGIN_OPTION_FIVE_HOUR_THRESHOLD=100
reset; usage 99 1
check "custom threshold from plugin option" "$(CLAUDE_PLUGIN_OPTION_FIVE_HOUR_THRESHOLD=100 run)" "allowed"

# Status line recorder
rm -f "$CREDIT_GATE_DIR/usage-state.json"
line=$(echo '{"rate_limits":{"five_hour":{"used_percentage":16,"resets_at":1},"seven_day":{"used_percentage":3,"resets_at":2}}}' | "$root/scripts/statusline.sh")
check "status line shows usage" "$line" "5h: 16%  7d: 3%"
check "status line records usage" "$(jq -r '.rate_limits.five_hour.used_percentage' "$CREDIT_GATE_DIR/usage-state.json")" "16"
echo '{"model":{}}' | "$root/scripts/statusline.sh" > /dev/null
check "input without usage keeps the last record" "$(jq -r '.rate_limits.five_hour.used_percentage' "$CREDIT_GATE_DIR/usage-state.json")" "16"
check "wrapped status line shows the user's own output" "$(echo '{"rate_limits":{}}' | "$root/scripts/statusline.sh" "echo \"it's mine\"")" "it's mine"

# Setup
settings="$CLAUDE_CONFIG_DIR/settings.json"
echo '{"model":"opus"}' > "$settings"
"$root/scripts/setup.sh" > /dev/null
check "setup adds the status line" "$(jq -r '.statusLine.command' "$settings")" "$CREDIT_GATE_DIR/statusline.sh"
check "setup keeps other settings" "$(jq -r '.model' "$settings")" "opus"
"$root/scripts/setup.sh" > /dev/null
check "setup twice changes nothing" "$(jq -r '.statusLine.command' "$settings")" "$CREDIT_GATE_DIR/statusline.sh"
"$root/scripts/setup.sh" remove > /dev/null
check "remove with no earlier status line deletes it" "$(jq -r '.statusLine // "none"' "$settings")" "none"

mine='echo "it'"'"'s mine"'
jq --arg c "$mine" '.statusLine = {type: "command", command: $c, padding: 1}' "$settings" > "$settings.tmp" && mv "$settings.tmp" "$settings"
"$root/scripts/setup.sh" > /dev/null
check "setup wraps an existing status line" "$(echo '{}' | sh -c "$(jq -r '.statusLine.command' "$settings")")" "it's mine"
check "setup keeps the existing status line's other fields" "$(jq -r '.statusLine.padding' "$settings")" "1"
"$root/scripts/setup.sh" remove > /dev/null
check "remove restores the original status line" "$(jq -c '.statusLine' "$settings")" "$(jq -nc --arg c "$mine" '{type: "command", command: $c, padding: 1}')"

echo
[ "$failures" -eq 0 ] && echo "All tests passed." || { echo "$failures failed."; exit 1; }
