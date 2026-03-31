#!/bin/sh
# setup-codebases.sh — Initialize and verify benchmark codebase submodules.
# Idempotent: safe to run repeatedly. Exits non-zero on failure.

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

cd "$REPO_ROOT"

echo "Initializing benchmark codebases..."

# Init + update all submodules (idempotent: no-op if already initialized)
git submodule update --init --recursive

# Verify each expected submodule
FAILED=0
for dir in codebases/django codebases/fastapi codebases/mattermost-webapp codebases/clap; do
    if [ -d "$dir/.git" ] || [ -f "$dir/.git" ]; then
        SHA=$(git -C "$dir" rev-parse --short HEAD)
        echo "  OK: $dir ($SHA)"
    else
        echo "  FAIL: $dir not initialized" >&2
        FAILED=1
    fi
done

if [ "$FAILED" -ne 0 ]; then
    echo "Some codebases failed to initialize." >&2
    exit 1
fi

echo "All codebases ready."
