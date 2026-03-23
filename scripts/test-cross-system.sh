#!/bin/sh
# test-cross-system.sh — Run cross-system consistency tests
#
# Validates that Python standings computation matches the golden file.
# Steps:
#   1. Regenerate golden file from fixture
#   2. Run Python consistency tests via pytest
#
# Exit 0 if all pass, 1 on any failure.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CROSS_SYSTEM_DIR="$REPO_ROOT/packages/pipeline/tests/cross-system"

echo "=== Cross-System Consistency Tests ==="
echo ""

# Step 1: Regenerate golden file
echo "[1/2] Regenerating golden file from fixture..."
python3 "$CROSS_SYSTEM_DIR/generate_golden.py"
echo ""

# Step 2: Run Python consistency tests
echo "[2/2] Running Python consistency tests..."
cd "$CROSS_SYSTEM_DIR"
python3 -m pytest test_cross_system.py -v
RESULT=$?

echo ""
if [ "$RESULT" -eq 0 ]; then
    echo "=== All cross-system consistency tests PASSED ==="
else
    echo "=== Cross-system consistency tests FAILED ==="
fi

exit "$RESULT"
