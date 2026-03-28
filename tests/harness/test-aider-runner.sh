#!/bin/sh
# =============================================================================
# test-aider-runner.sh — Integration tests for aider-runner.sh
# =============================================================================
#
# Uses AIDER_BIN=tests/harness/mock-aider.sh to test argument validation
# without a live Aider installation.
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUNNER="$REPO_ROOT/scripts/harness/aider-runner.sh"
MOCK_AIDER="$REPO_ROOT/tests/harness/mock-aider.sh"

PASS_COUNT=0
FAIL_COUNT=0

# Temporary directory for test fixtures
TEST_TMPDIR=""
cleanup() {
    if [ -n "$TEST_TMPDIR" ] && [ -d "$TEST_TMPDIR" ]; then
        rm -rf "$TEST_TMPDIR"
    fi
}
trap cleanup EXIT

TEST_TMPDIR="$(mktemp -d)"
FAKE_CODEBASE="$TEST_TMPDIR/codebase"
FAKE_OUTPUT="$TEST_TMPDIR/output"
FAKE_MESSAGE_FILE="$TEST_TMPDIR/prompt.txt"
mkdir -p "$FAKE_CODEBASE"
printf "Test prompt content\n" > "$FAKE_MESSAGE_FILE"

# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------
assert_exit_code() {
    _test_name="$1"
    _expected="$2"
    shift 2

    _actual=0
    "$@" >/dev/null 2>&1 || _actual=$?

    if [ "$_actual" -eq "$_expected" ]; then
        printf "  PASS: %s (exit %d)\n" "$_test_name" "$_actual"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        printf "  FAIL: %s (expected exit %d, got %d)\n" "$_test_name" "$_expected" "$_actual" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
printf "=== aider-runner.sh integration tests ===\n\n"

printf "%s\n" "-- Argument validation --"

# Missing --codebase-dir -> exit 2
assert_exit_code "missing --codebase-dir" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --message "hello" --output-dir "$FAKE_OUTPUT" \
        --timeout 60 --model gpt-4

# Missing both --message and --message-file -> exit 2
assert_exit_code "missing --message and --message-file" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --timeout 60 --model gpt-4

# Non-existent --codebase-dir -> exit 2
assert_exit_code "non-existent --codebase-dir" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$TEST_TMPDIR/nonexistent" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout 60 --model gpt-4

# Non-numeric --timeout -> exit 2
assert_exit_code "non-numeric --timeout" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout abc --model gpt-4

# Zero --timeout -> exit 2
assert_exit_code "zero --timeout" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout 0 --model gpt-4

# Missing --message-file target -> exit 2
assert_exit_code "missing --message-file target" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message-file "$TEST_TMPDIR/no-such-file.txt" --timeout 60 --model gpt-4

# AIDER_BIN pointing to non-existent file -> exit 2
assert_exit_code "AIDER_BIN non-existent" 2 \
    env AIDER_BIN="$TEST_TMPDIR/no-such-aider" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout 60 --model gpt-4

# Both --message and --message-file -> exit 2
assert_exit_code "both --message and --message-file" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --message-file "$FAKE_MESSAGE_FILE" \
        --timeout 60 --model gpt-4

# Unknown argument -> exit 2
assert_exit_code "unknown argument" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --bogus-flag value

# Missing --model -> exit 2
assert_exit_code "missing --model" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout 60

# Missing --timeout -> exit 2
assert_exit_code "missing --timeout" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --model gpt-4

# Missing --output-dir -> exit 2
assert_exit_code "missing --output-dir" 2 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" \
        --message "hello" --timeout 60 --model gpt-4

printf "\n-- Help flag --\n"

# --help exits 0
assert_exit_code "--help exits 0" 0 \
    sh "$RUNNER" --help

printf "\n-- Valid invocations --\n"

# Valid invocation with --message -> exit 0
assert_exit_code "valid with --message" 0 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello world" --timeout 60 --model gpt-4

# Valid invocation with --message-file -> exit 0
assert_exit_code "valid with --message-file" 0 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message-file "$FAKE_MESSAGE_FILE" --timeout 60 --model gpt-4

# Valid invocation with --edit-format override -> exit 0
assert_exit_code "valid with --edit-format" 0 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout 60 --model gpt-4 --edit-format whole

# Valid invocation with --aider-timeout -> exit 0
assert_exit_code "valid with --aider-timeout" 0 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout 60 --model gpt-4 --aider-timeout 30

# Verify mock wrote llm-history file
if [ -f "$FAKE_OUTPUT/llm-history.txt" ]; then
    printf "  PASS: mock-aider wrote llm-history.txt\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: mock-aider did not write llm-history.txt\n" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

printf "\n-- shellcheck --\n"

# Run shellcheck on aider-runner.sh
if shellcheck --shell=sh "$RUNNER"; then
    printf "  PASS: shellcheck --shell=sh passes\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: shellcheck --shell=sh found errors\n" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Run shellcheck on mock-aider.sh
if shellcheck --shell=sh "$MOCK_AIDER"; then
    printf "  PASS: shellcheck --shell=sh mock-aider.sh passes\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: shellcheck --shell=sh mock-aider.sh found errors\n" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
printf "\n=== Results: %d passed, %d failed ===\n" "$PASS_COUNT" "$FAIL_COUNT"

if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
fi
