#!/bin/sh
# setup.sh — Ensure maproom index exists for the target codebase.
# Usage: setup.sh <codebase_path> <repo_name>
# Re-entrant: safe to run when index already exists (incremental scan).

set -e

CODEBASE_PATH="${1:?Usage: setup.sh <codebase_path> <repo_name>}"
REPO_NAME="${2:?Usage: setup.sh <codebase_path> <repo_name>}"

if [ ! -d "$CODEBASE_PATH" ]; then
  echo "ERROR: codebase path does not exist: $CODEBASE_PATH" >&2
  exit 1
fi

if ! command -v maproom >/dev/null 2>&1; then
  echo "ERROR: maproom CLI not found in PATH" >&2
  exit 1
fi

# Check whether the repo already has an index by looking at maproom status.
# If the repo appears in status output, run an incremental scan (fast no-op
# when nothing changed). Otherwise, run a full initial scan.
if maproom status 2>/dev/null | grep -qF "Repository: ${REPO_NAME}"; then
  echo "Index found for ${REPO_NAME} — running incremental scan..."
else
  echo "No index found for ${REPO_NAME} — running initial scan..."
fi

maproom scan --path "$CODEBASE_PATH" --repo "$REPO_NAME"

echo "Maproom index ready for ${REPO_NAME}."
