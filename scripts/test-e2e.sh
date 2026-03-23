#!/bin/sh
# test-e2e.sh — Full end-to-end test suite
#
# Runs:
#   1. Cross-system consistency tests (Python + TypeScript)
#   2. Dashboard smoke tests
#   3. Reports combined results
#
# Exit 0 if all pass, 1 on any failure.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

PASS=0
FAIL=0

echo "=== End-to-End Test Suite ==="
echo ""

# Step 1: Cross-system consistency
echo "[1/2] Cross-system consistency tests..."
if "$SCRIPT_DIR/test-cross-system.sh"; then
    PASS=$((PASS + 1))
    echo "  PASSED: cross-system consistency"
else
    FAIL=$((FAIL + 1))
    echo "  FAILED: cross-system consistency"
fi
echo ""

# Step 2: Dashboard smoke tests
echo "[2/2] Dashboard smoke tests..."
if pnpm --filter web-ui test 2>&1; then
    PASS=$((PASS + 1))
    echo "  PASSED: dashboard smoke"
else
    FAIL=$((FAIL + 1))
    echo "  FAILED: dashboard smoke"
fi

echo ""
echo "=== E2E Summary ==="
echo "  Passed: $PASS / $((PASS + FAIL))"
echo "  Failed: $FAIL / $((PASS + FAIL))"

if [ "$FAIL" -gt 0 ]; then
    echo "=== E2E tests FAILED ==="
    exit 1
fi

echo "=== All E2E tests PASSED ==="
exit 0
