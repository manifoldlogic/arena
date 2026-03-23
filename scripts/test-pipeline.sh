#!/bin/sh
# test-pipeline.sh — Run all pipeline tests
#
# 1. Python pytest (cross-system consistency + any future pipeline tests)
# 2. Aggregates pass/fail
# Exit 0 if all pass, 1 on any failure.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0

echo "=== Pipeline Tests ==="
echo ""

# Step 1: Python cross-system consistency tests
echo "[1/1] Running Python pytest..."
if (cd "$REPO_ROOT/packages/pipeline/tests/cross-system" && python3 -m pytest test_cross_system.py -v); then
    PASS=$((PASS + 1))
    echo "  PASSED: Python cross-system tests"
else
    FAIL=$((FAIL + 1))
    echo "  FAILED: Python cross-system tests"
fi

echo ""
echo "=== Pipeline Test Summary ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
    echo "=== Pipeline tests FAILED ==="
    exit 1
fi

echo "=== All pipeline tests PASSED ==="
exit 0
