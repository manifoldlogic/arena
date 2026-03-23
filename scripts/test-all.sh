#!/bin/sh
# test-all.sh — CI orchestrator: run all test suites
#
# Runs (in order):
#   1. test-pipeline.sh — Python pipeline tests
#   2. test-api.sh — API integration tests (skips gracefully if ARENA-02 not ready)
#   3. test-e2e.sh — Cross-system consistency + dashboard smoke
#
# Does NOT include test-perf.sh (opt-in for CI).
#
# Exit 0 if all pass, 1 on any failure.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RESULTS=""
PASS=0
FAIL=0

run_suite() {
    SUITE_NAME="$1"
    SUITE_SCRIPT="$2"

    echo ""
    echo "================================================================"
    echo "  Running: $SUITE_NAME"
    echo "================================================================"
    echo ""

    if "$SUITE_SCRIPT"; then
        PASS=$((PASS + 1))
        RESULTS="$RESULTS\n  PASS  $SUITE_NAME"
    else
        FAIL=$((FAIL + 1))
        RESULTS="$RESULTS\n  FAIL  $SUITE_NAME"
    fi
}

echo "=== Arena Test Suite ==="

run_suite "Pipeline Tests" "$SCRIPT_DIR/test-pipeline.sh"
run_suite "API Integration" "$SCRIPT_DIR/test-api.sh"
run_suite "E2E Tests" "$SCRIPT_DIR/test-e2e.sh"

echo ""
echo "================================================================"
echo "  Test Suite Summary"
echo "================================================================"
printf "%b\n" "$RESULTS"
echo ""
echo "  Total: $((PASS + FAIL)) suites, $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "=== SOME TEST SUITES FAILED ==="
    exit 1
fi

echo ""
echo "=== ALL TEST SUITES PASSED ==="
exit 0
