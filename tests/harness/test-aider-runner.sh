#!/bin/sh
# =============================================================================
# test-aider-runner.sh — Integration tests for aider-runner.sh
# =============================================================================
#
# Uses AIDER_BIN=tests/harness/mock-aider.sh to test argument validation,
# output capture, timeout, exit codes, and metadata generation without a
# live Aider installation.
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

assert_file_exists() {
    _test_name="$1"
    _file="$2"

    if [ -f "$_file" ]; then
        printf "  PASS: %s\n" "$_test_name"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        printf "  FAIL: %s (file not found: %s)\n" "$_test_name" "$_file" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

assert_file_contains() {
    _test_name="$1"
    _file="$2"
    _pattern="$3"

    if [ -f "$_file" ] && grep -q "$_pattern" "$_file"; then
        printf "  PASS: %s\n" "$_test_name"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        printf "  FAIL: %s (pattern '%s' not found in %s)\n" "$_test_name" "$_pattern" "$_file" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

assert_file_not_contains() {
    _test_name="$1"
    _file="$2"
    _pattern="$3"

    if [ -f "$_file" ] && grep -iqE "$_pattern" "$_file"; then
        printf "  FAIL: %s (pattern '%s' found in %s)\n" "$_test_name" "$_pattern" "$_file" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        printf "  PASS: %s\n" "$_test_name"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
}

assert_json_field() {
    _test_name="$1"
    _file="$2"
    _field="$3"
    _expected="$4"

    if [ ! -f "$_file" ]; then
        printf "  FAIL: %s (file not found: %s)\n" "$_test_name" "$_file" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return
    fi

    _actual=$(jq -r "$_field" "$_file" 2>/dev/null)
    if [ "$_actual" = "$_expected" ]; then
        printf "  PASS: %s\n" "$_test_name"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        printf "  FAIL: %s (expected '%s', got '%s')\n" "$_test_name" "$_expected" "$_actual" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

assert_valid_json() {
    _test_name="$1"
    _file="$2"

    if [ -f "$_file" ] && jq . "$_file" >/dev/null 2>&1; then
        printf "  PASS: %s\n" "$_test_name"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        printf "  FAIL: %s (invalid JSON in %s)\n" "$_test_name" "$_file" >&2
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

# Clean output dir for fresh tests
rm -rf "$FAKE_OUTPUT"

# Valid invocation with --message -> exit 0
assert_exit_code "valid with --message" 0 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello world" --timeout 60 --model gpt-4

# Valid invocation with --message-file -> exit 0
rm -rf "$FAKE_OUTPUT"
assert_exit_code "valid with --message-file" 0 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message-file "$FAKE_MESSAGE_FILE" --timeout 60 --model gpt-4

# Valid invocation with --edit-format override -> exit 0
rm -rf "$FAKE_OUTPUT"
assert_exit_code "valid with --edit-format" 0 \
    env AIDER_BIN="$MOCK_AIDER" sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout 60 --model gpt-4 --edit-format whole

# Valid invocation with --aider-timeout -> exit 0
rm -rf "$FAKE_OUTPUT"
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

printf "\n-- Output capture --\n"

# Run a fresh invocation to test output capture
rm -rf "$FAKE_OUTPUT"
env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_STDERR="mock stderr output" \
    sh "$RUNNER" \
    --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

# Test stdout captured to stdout.log
assert_file_exists "stdout.log exists" "$FAKE_OUTPUT/stdout.log"
assert_file_contains "stdout.log has mock stdout" "$FAKE_OUTPUT/stdout.log" "mock-aider stdout output"

# Test stderr captured to stderr.log
assert_file_exists "stderr.log exists" "$FAKE_OUTPUT/stderr.log"
assert_file_contains "stderr.log has mock stderr" "$FAKE_OUTPUT/stderr.log" "mock stderr output"

# Verify stdout and stderr are separate (stdout.log should NOT contain stderr content)
assert_file_not_contains "stdout.log does not contain stderr" "$FAKE_OUTPUT/stdout.log" "mock stderr output"

printf "\n-- Exit code propagation --\n"

# Aider exits 0 -> wrapper exits 0
rm -rf "$FAKE_OUTPUT"
assert_exit_code "exit code 0 propagated (success)" 0 \
    env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_EXIT_CODE=0 sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout 60 --model gpt-4

# Aider exits 1 -> wrapper exits 1
rm -rf "$FAKE_OUTPUT"
assert_exit_code "exit code 1 propagated (aider error)" 1 \
    env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_EXIT_CODE=1 sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout 60 --model gpt-4

# Timeout: mock sleeps 10s, timeout is 2s -> exit 124
rm -rf "$FAKE_OUTPUT"
assert_exit_code "exit code 124 on timeout" 124 \
    env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_SLEEP=10 sh "$RUNNER" \
        --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
        --message "hello" --timeout 2 --model gpt-4

printf "\n-- Metadata: successful run --\n"

# Fresh successful run for metadata tests
rm -rf "$FAKE_OUTPUT"
env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_EXIT_CODE=0 \
    sh "$RUNNER" \
    --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

assert_file_exists "metadata.json exists after success" "$FAKE_OUTPUT/metadata.json"
assert_valid_json "metadata.json is valid JSON after success" "$FAKE_OUTPUT/metadata.json"
assert_json_field "exit_code is 0" "$FAKE_OUTPUT/metadata.json" ".exit_code" "0"
assert_json_field "exit_reason is success" "$FAKE_OUTPUT/metadata.json" ".exit_reason" "success"
assert_json_field "model is gpt-4" "$FAKE_OUTPUT/metadata.json" ".model" "gpt-4"
assert_json_field "edit_format is diff" "$FAKE_OUTPUT/metadata.json" ".edit_format" "diff"
assert_json_field "stdin_source is /dev/null" "$FAKE_OUTPUT/metadata.json" ".stdin_source" "/dev/null"
assert_json_field "timeout_seconds is 60" "$FAKE_OUTPUT/metadata.json" ".timeout_seconds" "60"

# aider_version should be populated (not empty/unknown)
_ver=$(jq -r '.aider_version' "$FAKE_OUTPUT/metadata.json" 2>/dev/null)
if [ -n "$_ver" ] && [ "$_ver" != "unknown" ] && [ "$_ver" != "null" ]; then
    printf "  PASS: aider_version populated (%s)\n" "$_ver"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: aider_version not populated (got '%s')\n" "$_ver" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# wall_time_seconds should be a non-negative number
_wt=$(jq -r '.wall_time_seconds' "$FAKE_OUTPUT/metadata.json" 2>/dev/null)
if [ -n "$_wt" ] && [ "$_wt" != "null" ] && [ "$_wt" -ge 0 ] 2>/dev/null; then
    printf "  PASS: wall_time_seconds is non-negative (%s)\n" "$_wt"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: wall_time_seconds invalid (got '%s')\n" "$_wt" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# start_time_utc and end_time_utc should be present
_st=$(jq -r '.start_time_utc' "$FAKE_OUTPUT/metadata.json" 2>/dev/null)
if [ -n "$_st" ] && [ "$_st" != "null" ] && [ "$_st" != "" ]; then
    printf "  PASS: start_time_utc is present\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: start_time_utc missing\n" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

_et=$(jq -r '.end_time_utc' "$FAKE_OUTPUT/metadata.json" 2>/dev/null)
if [ -n "$_et" ] && [ "$_et" != "null" ] && [ "$_et" != "" ]; then
    printf "  PASS: end_time_utc is present\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: end_time_utc missing\n" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# llm_history_size_bytes should be > 0 (mock wrote llm-history.txt)
_lhs=$(jq -r '.llm_history_size_bytes' "$FAKE_OUTPUT/metadata.json" 2>/dev/null)
if [ -n "$_lhs" ] && [ "$_lhs" != "null" ] && [ "$_lhs" -gt 0 ] 2>/dev/null; then
    printf "  PASS: llm_history_size_bytes > 0 (%s)\n" "$_lhs"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: llm_history_size_bytes should be > 0 (got '%s')\n" "$_lhs" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# No API key patterns in metadata.json
assert_file_not_contains "no API key patterns in metadata.json" \
    "$FAKE_OUTPUT/metadata.json" "api.key|anthropic|openai"

printf "\n-- Metadata: error run --\n"

rm -rf "$FAKE_OUTPUT"
env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_EXIT_CODE=1 \
    sh "$RUNNER" \
    --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

assert_file_exists "metadata.json exists after error" "$FAKE_OUTPUT/metadata.json"
assert_valid_json "metadata.json is valid JSON after error" "$FAKE_OUTPUT/metadata.json"
assert_json_field "exit_code is 1 after error" "$FAKE_OUTPUT/metadata.json" ".exit_code" "1"
assert_json_field "exit_reason is aider_error" "$FAKE_OUTPUT/metadata.json" ".exit_reason" "aider_error"

printf "\n-- Metadata: timeout run --\n"

rm -rf "$FAKE_OUTPUT"
env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_SLEEP=10 \
    sh "$RUNNER" \
    --codebase-dir "$FAKE_CODEBASE" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 2 --model gpt-4 \
    >/dev/null 2>&1 || true

assert_file_exists "metadata.json exists after timeout" "$FAKE_OUTPUT/metadata.json"
assert_valid_json "metadata.json is valid JSON after timeout" "$FAKE_OUTPUT/metadata.json"
assert_json_field "exit_code is 124 after timeout" "$FAKE_OUTPUT/metadata.json" ".exit_code" "124"
assert_json_field "exit_reason is timeout" "$FAKE_OUTPUT/metadata.json" ".exit_reason" "timeout"

printf "\n-- All 5 output artifacts (happy path) --\n"

# Run a fresh invocation and check all 5 artifacts exist
rm -rf "$FAKE_OUTPUT"
GIT_CODEBASE="$TEST_TMPDIR/git-codebase"
mkdir -p "$GIT_CODEBASE"
(cd "$GIT_CODEBASE" && git init -q && git config user.email "test@test.com" && git config user.name "Test" && printf "initial\n" > file.txt && git add file.txt && git commit -q -m "init")

env AIDER_BIN="$MOCK_AIDER" \
    sh "$RUNNER" \
    --codebase-dir "$GIT_CODEBASE" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

assert_file_exists "artifact: stdout.log" "$FAKE_OUTPUT/stdout.log"
assert_file_exists "artifact: stderr.log" "$FAKE_OUTPUT/stderr.log"
assert_file_exists "artifact: llm-history.txt" "$FAKE_OUTPUT/llm-history.txt"
assert_file_exists "artifact: changes.diff" "$FAKE_OUTPUT/changes.diff"
assert_file_exists "artifact: metadata.json" "$FAKE_OUTPUT/metadata.json"

printf "\n-- changes.diff: empty when no file changes --\n"

# In a git repo with no modifications, changes.diff should be empty but present
rm -rf "$FAKE_OUTPUT"
CLEAN_GIT="$TEST_TMPDIR/clean-git"
mkdir -p "$CLEAN_GIT"
(cd "$CLEAN_GIT" && git init -q && git config user.email "test@test.com" && git config user.name "Test" && printf "clean\n" > file.txt && git add file.txt && git commit -q -m "init")

env AIDER_BIN="$MOCK_AIDER" \
    sh "$RUNNER" \
    --codebase-dir "$CLEAN_GIT" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

assert_file_exists "changes.diff exists (no changes)" "$FAKE_OUTPUT/changes.diff"

# File should be empty (0 bytes)
_diff_bytes=$(wc -c < "$FAKE_OUTPUT/changes.diff")
if [ "$_diff_bytes" -eq 0 ]; then
    printf "  PASS: changes.diff is empty (0 bytes)\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: changes.diff should be empty, got %d bytes\n" "$_diff_bytes" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

printf "\n-- changes.diff: contains actual diff when mock modifies a file --\n"

# Create a git repo, have mock-aider modify a tracked file, verify diff
rm -rf "$FAKE_OUTPUT"
MODIFY_GIT="$TEST_TMPDIR/modify-git"
mkdir -p "$MODIFY_GIT"
(cd "$MODIFY_GIT" && git init -q && git config user.email "test@test.com" && git config user.name "Test" && printf "original content\n" > target.txt && git add target.txt && git commit -q -m "init")

env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_MODIFY_FILE="$MODIFY_GIT/target.txt" \
    sh "$RUNNER" \
    --codebase-dir "$MODIFY_GIT" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

assert_file_exists "changes.diff exists (with changes)" "$FAKE_OUTPUT/changes.diff"

# Diff should be non-empty
_diff_bytes=$(wc -c < "$FAKE_OUTPUT/changes.diff")
if [ "$_diff_bytes" -gt 0 ]; then
    printf "  PASS: changes.diff is non-empty (%d bytes)\n" "$_diff_bytes"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: changes.diff should be non-empty for modified file\n" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Diff should mention the target file
assert_file_contains "changes.diff mentions target.txt" "$FAKE_OUTPUT/changes.diff" "target.txt"
assert_file_contains "changes.diff has diff header" "$FAKE_OUTPUT/changes.diff" "diff --git"

printf "\n-- Non-git codebase dir: changes.diff empty, diff_capture_error true --\n"

rm -rf "$FAKE_OUTPUT"
NON_GIT_DIR="$TEST_TMPDIR/non-git-dir"
mkdir -p "$NON_GIT_DIR"

_nongit_exit=0
env AIDER_BIN="$MOCK_AIDER" \
    sh "$RUNNER" \
    --codebase-dir "$NON_GIT_DIR" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || _nongit_exit=$?

# Exit code should be Aider's exit code (0), not 2
if [ "$_nongit_exit" -eq 0 ]; then
    printf "  PASS: non-git codebase exits with Aider exit code (0), not 2\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: non-git codebase should exit 0 (Aider exit), got %d\n" "$_nongit_exit" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

assert_file_exists "changes.diff exists (non-git)" "$FAKE_OUTPUT/changes.diff"

# changes.diff should be empty
_diff_bytes=$(wc -c < "$FAKE_OUTPUT/changes.diff")
if [ "$_diff_bytes" -eq 0 ]; then
    printf "  PASS: changes.diff is empty in non-git dir\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: changes.diff should be empty in non-git dir, got %d bytes\n" "$_diff_bytes" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

assert_json_field "diff_capture_error is true (non-git)" "$FAKE_OUTPUT/metadata.json" ".diff_capture_error" "true"

printf "\n-- Timeout: partial artifacts present --\n"

rm -rf "$FAKE_OUTPUT"
TIMEOUT_GIT="$TEST_TMPDIR/timeout-git"
mkdir -p "$TIMEOUT_GIT"
(cd "$TIMEOUT_GIT" && git init -q && git config user.email "test@test.com" && git config user.name "Test" && printf "x\n" > f.txt && git add f.txt && git commit -q -m "init")

env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_SLEEP=10 \
    sh "$RUNNER" \
    --codebase-dir "$TIMEOUT_GIT" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 2 --model gpt-4 \
    >/dev/null 2>&1 || true

assert_file_exists "stdout.log exists after timeout" "$FAKE_OUTPUT/stdout.log"
assert_file_exists "stderr.log exists after timeout" "$FAKE_OUTPUT/stderr.log"
assert_file_exists "metadata.json exists after timeout (2)" "$FAKE_OUTPUT/metadata.json"
assert_file_exists "changes.diff exists after timeout" "$FAKE_OUTPUT/changes.diff"
assert_json_field "exit_code is 124 after timeout (2)" "$FAKE_OUTPUT/metadata.json" ".exit_code" "124"

printf "\n-- Metadata: files_modified is valid JSON array --\n"

# Test with the diff that has changes (from the modify-git test above)
rm -rf "$FAKE_OUTPUT"
MODIFY_GIT2="$TEST_TMPDIR/modify-git2"
mkdir -p "$MODIFY_GIT2"
(cd "$MODIFY_GIT2" && git init -q && git config user.email "test@test.com" && git config user.name "Test" && printf "original\n" > code.py && git add code.py && git commit -q -m "init")

env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_MODIFY_FILE="$MODIFY_GIT2/code.py" \
    sh "$RUNNER" \
    --codebase-dir "$MODIFY_GIT2" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

# files_modified must be a JSON array
_fm_type=$(jq -r '.files_modified | type' "$FAKE_OUTPUT/metadata.json" 2>/dev/null)
if [ "$_fm_type" = "array" ]; then
    printf "  PASS: files_modified is a JSON array\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: files_modified should be array, got '%s'\n" "$_fm_type" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# files_modified should contain code.py
_fm_contains=$(jq -r '.files_modified | map(select(. == "code.py")) | length' "$FAKE_OUTPUT/metadata.json" 2>/dev/null)
if [ "$_fm_contains" -gt 0 ] 2>/dev/null; then
    printf "  PASS: files_modified contains code.py\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: files_modified should contain code.py\n" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Empty files_modified for clean repo
rm -rf "$FAKE_OUTPUT"
env AIDER_BIN="$MOCK_AIDER" \
    sh "$RUNNER" \
    --codebase-dir "$CLEAN_GIT" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

_fm_len=$(jq -r '.files_modified | length' "$FAKE_OUTPUT/metadata.json" 2>/dev/null)
if [ "$_fm_len" -eq 0 ] 2>/dev/null; then
    printf "  PASS: files_modified is empty array for clean repo\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: files_modified should be empty for clean repo, got length %s\n" "$_fm_len" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

printf "\n-- Metadata: diff_size_bytes matches wc -c --\n"

# Use the modify-git2 output that has a non-empty diff
_expected_size=$(wc -c < "$FAKE_OUTPUT/changes.diff")
_meta_size=$(jq -r '.diff_size_bytes' "$FAKE_OUTPUT/metadata.json" 2>/dev/null)

# For this test, re-run with modified file to get a non-trivial diff_size_bytes
rm -rf "$FAKE_OUTPUT"
MODIFY_GIT3="$TEST_TMPDIR/modify-git3"
mkdir -p "$MODIFY_GIT3"
(cd "$MODIFY_GIT3" && git init -q && git config user.email "test@test.com" && git config user.name "Test" && printf "original\n" > data.txt && git add data.txt && git commit -q -m "init")

env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_MODIFY_FILE="$MODIFY_GIT3/data.txt" \
    sh "$RUNNER" \
    --codebase-dir "$MODIFY_GIT3" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

_expected_size=$(wc -c < "$FAKE_OUTPUT/changes.diff")
_meta_size=$(jq -r '.diff_size_bytes' "$FAKE_OUTPUT/metadata.json" 2>/dev/null)
if [ "$_meta_size" = "$_expected_size" ]; then
    printf "  PASS: diff_size_bytes (%s) matches wc -c changes.diff (%s)\n" "$_meta_size" "$_expected_size"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: diff_size_bytes (%s) does not match wc -c changes.diff (%s)\n" "$_meta_size" "$_expected_size" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Also check diff_size_bytes is > 0 for a modified file
if [ "$_meta_size" -gt 0 ] 2>/dev/null; then
    printf "  PASS: diff_size_bytes > 0 for modified file\n"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    printf "  FAIL: diff_size_bytes should be > 0 for modified file\n" >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Check diff_size_bytes is 0 for clean repo
rm -rf "$FAKE_OUTPUT"
env AIDER_BIN="$MOCK_AIDER" \
    sh "$RUNNER" \
    --codebase-dir "$CLEAN_GIT" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

assert_json_field "diff_size_bytes is 0 for clean repo" "$FAKE_OUTPUT/metadata.json" ".diff_size_bytes" "0"

printf "\n-- Metadata: diff_capture_error is false for valid git repos --\n"

assert_json_field "diff_capture_error is false for git repo" "$FAKE_OUTPUT/metadata.json" ".diff_capture_error" "false"

printf "\n-- Security: no API key patterns --\n"

# Use a fresh run
rm -rf "$FAKE_OUTPUT"
env AIDER_BIN="$MOCK_AIDER" \
    sh "$RUNNER" \
    --codebase-dir "$CLEAN_GIT" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

assert_file_not_contains "no API key patterns in metadata.json (2)" \
    "$FAKE_OUTPUT/metadata.json" "api.key|anthropic|openai"
assert_file_not_contains "no API key patterns in stdout.log" \
    "$FAKE_OUTPUT/stdout.log" "api.key|anthropic|openai"

printf "\n-- Error path: mock exits 1, artifacts present --\n"

rm -rf "$FAKE_OUTPUT"
env AIDER_BIN="$MOCK_AIDER" MOCK_AIDER_EXIT_CODE=1 \
    sh "$RUNNER" \
    --codebase-dir "$CLEAN_GIT" --output-dir "$FAKE_OUTPUT" \
    --message "hello" --timeout 60 --model gpt-4 \
    >/dev/null 2>&1 || true

assert_file_exists "stdout.log exists after error" "$FAKE_OUTPUT/stdout.log"
assert_file_exists "stderr.log exists after error" "$FAKE_OUTPUT/stderr.log"
assert_file_exists "metadata.json exists after error (2)" "$FAKE_OUTPUT/metadata.json"
assert_file_exists "changes.diff exists after error" "$FAKE_OUTPUT/changes.diff"

printf "\n-- Help documents all 5 artifacts --\n"

_help_output=$(sh "$RUNNER" --help 2>&1)
for _artifact in "stdout.log" "stderr.log" "llm-history.txt" "changes.diff" "metadata.json"; do
    if printf '%s' "$_help_output" | grep -q "$_artifact"; then
        printf "  PASS: --help documents %s\n" "$_artifact"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        printf "  FAIL: --help does not document %s\n" "$_artifact" >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

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
