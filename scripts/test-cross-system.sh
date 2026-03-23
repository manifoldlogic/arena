#!/bin/sh
# test-cross-system.sh — Run cross-system consistency tests
#
# Validates that BOTH Python and TypeScript standings computations
# produce identical results from the same JSONL fixture.
# Steps:
#   1. Regenerate golden file from fixture (Python)
#   2. Run Python consistency tests via pytest
#   3. Run TypeScript consistency tests via vitest
#
# Exit 0 if all pass, 1 on any failure.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CROSS_SYSTEM_DIR="$REPO_ROOT/packages/pipeline/tests/cross-system"

PASS=0
FAIL=0

echo "=== Cross-System Consistency Tests ==="
echo ""

# Step 1: Regenerate golden file
echo "[1/3] Regenerating golden file from fixture..."
python3 "$CROSS_SYSTEM_DIR/generate_golden.py"
echo ""

# Step 2: Run Python consistency tests
echo "[2/3] Running Python consistency tests..."
if (cd "$CROSS_SYSTEM_DIR" && python3 -m pytest test_cross_system.py -v); then
    PASS=$((PASS + 1))
    echo "  PASSED: Python cross-system"
else
    FAIL=$((FAIL + 1))
    echo "  FAILED: Python cross-system"
fi
echo ""

# Step 3: Run TypeScript consistency tests
echo "[3/3] Running TypeScript consistency tests..."
if (cd "$REPO_ROOT" && npx vitest run packages/schemas/src/__tests__/consistency.test.ts --reporter=verbose); then
    PASS=$((PASS + 1))
    echo "  PASSED: TypeScript cross-system"
else
    FAIL=$((FAIL + 1))
    echo "  FAILED: TypeScript cross-system"
fi

echo ""
echo "=== Cross-System Summary ==="
echo "  Passed: $PASS / $((PASS + FAIL))"
echo "  Failed: $FAIL / $((PASS + FAIL))"

if [ "$FAIL" -gt 0 ]; then
    echo "=== Cross-system consistency tests FAILED ==="
    exit 1
fi

echo "=== All cross-system consistency tests PASSED ==="
exit 0
