#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:-sheet-assisted-welcome-workflow}"
VISIBILITY="${2:-private}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required to create the GitHub repository." >&2
  exit 1
fi

gh repo create "$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --push
