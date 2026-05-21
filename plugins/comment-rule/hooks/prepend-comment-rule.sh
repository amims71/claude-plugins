#!/bin/bash
set -euo pipefail
jq -n '{
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: "Remember the code commenting rule."
  }
}'
