#!/bin/sh
# =============================================================================
# aider-runner.sh — Non-interactive Aider wrapper for competition harness
# =============================================================================
#
# Invokes Aider in non-interactive mode with fixed flags for automated
# competition use. Accepts competition parameters as CLI arguments and
# constructs the full Aider invocation.
#
# Captures stdout/stderr to separate log files, enforces a wall-clock timeout,
# records structured exit codes, and writes metadata.json with run details.
#
# Usage:
#   ./aider-runner.sh --codebase-dir <path> --output-dir <path> \
#     --timeout <seconds> --model <name> --message <text> [options]
#   ./aider-runner.sh --help
#
# Environment:
#   AIDER_BIN   Override the Aider binary path
#               (default: specs/competitors/aider/.venv/bin/aider)
#
# Exit codes:
#   0   Success (Aider exited 0)
#   1   Aider error (Aider exited non-zero, not timeout)
#   2   Setup error (bad arguments, missing binary, etc.)
#   124 Timeout (wall-clock limit exceeded)
#
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# Aider binary resolution
# ---------------------------------------------------------------------------
AIDER_BIN="${AIDER_BIN:-specs/competitors/aider/.venv/bin/aider}"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
CODEBASE_DIR=""
OUTPUT_DIR=""
TIMEOUT=""
MODEL=""
MESSAGE=""
MESSAGE_FILE=""
EDIT_FORMAT="diff"
AIDER_TIMEOUT=""

# ---------------------------------------------------------------------------
# Runtime state (used by write_metadata)
# ---------------------------------------------------------------------------
AIDER_EXIT=2
AIDER_VERSION="unknown"
START_TIME=""
START_EPOCH=""
END_TIME=""
END_EPOCH=""
WALL_TIME=0
EXIT_REASON="setup_error"

# ---------------------------------------------------------------------------
# usage — print help and exit
# ---------------------------------------------------------------------------
usage() {
    printf "Usage: %s [options]\n" "$0"
    printf "\n"
    printf "Non-interactive Aider wrapper for the Arena competition harness.\n"
    printf "\n"
    printf "Required flags (one of --message or --message-file must be given):\n"
    printf "  --message <text>         Prompt text to send to Aider\n"
    printf "  --message-file <path>    Path to a file containing the prompt\n"
    printf "  --codebase-dir <path>    Path to the codebase working directory\n"
    printf "  --output-dir <path>      Directory for Aider output artifacts\n"
    printf "  --timeout <seconds>      Overall timeout in seconds (positive integer)\n"
    printf "  --model <name>           Model identifier to pass to Aider\n"
    printf "\n"
    printf "Optional flags:\n"
    printf "  --edit-format <format>   Aider edit format (default: diff)\n"
    printf "  --aider-timeout <secs>   Per-API-call timeout passed to Aider\n"
    printf "  --help, -h               Show this help message\n"
}

# ---------------------------------------------------------------------------
# write_metadata — write metadata.json to OUTPUT_DIR (called on all exit paths)
# ---------------------------------------------------------------------------
write_metadata() {
    # Guard: if OUTPUT_DIR was never set or created, skip
    if [ -z "$OUTPUT_DIR" ] || [ ! -d "$OUTPUT_DIR" ]; then
        return
    fi

    # Capture end time if not already set
    if [ -z "$END_TIME" ]; then
        END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        END_EPOCH=$(date +%s)
    fi

    # Calculate wall time
    if [ -n "$START_EPOCH" ] && [ -n "$END_EPOCH" ]; then
        WALL_TIME=$((END_EPOCH - START_EPOCH))
    fi

    # Calculate llm_history_size_bytes
    LLM_HISTORY_SIZE=0
    if [ -f "$OUTPUT_DIR/llm-history.txt" ]; then
        LLM_HISTORY_SIZE=$(wc -c < "$OUTPUT_DIR/llm-history.txt")
    fi

    # Map exit code to exit reason
    case "$AIDER_EXIT" in
        0)   EXIT_REASON="success" ;;
        1)   EXIT_REASON="aider_error" ;;
        124) EXIT_REASON="timeout" ;;
        2)   EXIT_REASON="setup_error" ;;
        *)   EXIT_REASON="unknown_error" ;;
    esac

    jq -n \
        --arg aider_version "$AIDER_VERSION" \
        --arg model "$MODEL" \
        --arg edit_format "$EDIT_FORMAT" \
        --arg start_time "${START_TIME:-}" \
        --arg end_time "$END_TIME" \
        --argjson wall_time "$WALL_TIME" \
        --argjson timeout_seconds "${TIMEOUT:-0}" \
        --argjson exit_code "$AIDER_EXIT" \
        --arg exit_reason "$EXIT_REASON" \
        --arg stdin_source "/dev/null" \
        --argjson llm_history_size_bytes "$LLM_HISTORY_SIZE" \
        '{
          aider_version: $aider_version,
          model: $model,
          edit_format: $edit_format,
          start_time_utc: $start_time,
          end_time_utc: $end_time,
          wall_time_seconds: $wall_time,
          timeout_seconds: $timeout_seconds,
          exit_code: $exit_code,
          exit_reason: $exit_reason,
          files_modified: [],
          diff_size_bytes: 0,
          llm_history_size_bytes: $llm_history_size_bytes,
          stdin_source: $stdin_source
        }' > "$OUTPUT_DIR/metadata.json"
}

# ---------------------------------------------------------------------------
# Argument parsing — POSIX while/case, no getopt
# ---------------------------------------------------------------------------
while [ $# -gt 0 ]; do
    case "$1" in
        --codebase-dir)
            CODEBASE_DIR="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --message)
            MESSAGE="$2"
            shift 2
            ;;
        --message-file)
            MESSAGE_FILE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --model)
            MODEL="$2"
            shift 2
            ;;
        --edit-format)
            EDIT_FORMAT="$2"
            shift 2
            ;;
        --aider-timeout)
            AIDER_TIMEOUT="$2"
            shift 2
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            printf "Error: Unknown argument '%s'\n" "$1" >&2
            usage >&2
            exit 2
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Validation — all failures exit code 2
# ---------------------------------------------------------------------------

# --codebase-dir is required
if [ -z "$CODEBASE_DIR" ]; then
    printf "Error: --codebase-dir is required\n" >&2
    exit 2
fi

# --codebase-dir must exist and be a directory
if [ ! -d "$CODEBASE_DIR" ]; then
    printf "Error: --codebase-dir '%s' does not exist or is not a directory\n" "$CODEBASE_DIR" >&2
    exit 2
fi

# --output-dir is required
if [ -z "$OUTPUT_DIR" ]; then
    printf "Error: --output-dir is required\n" >&2
    exit 2
fi

# Attempt to create output directory
if ! mkdir -p "$OUTPUT_DIR" 2>/dev/null; then
    printf "Error: cannot create --output-dir '%s'\n" "$OUTPUT_DIR" >&2
    exit 2
fi

# --timeout is required and must be a positive integer
if [ -z "$TIMEOUT" ]; then
    printf "Error: --timeout is required\n" >&2
    exit 2
fi
if ! printf '%d' "$TIMEOUT" >/dev/null 2>&1 || [ "$TIMEOUT" -le 0 ] 2>/dev/null; then
    printf "Error: --timeout must be a positive integer, got '%s'\n" "$TIMEOUT" >&2
    exit 2
fi

# --model is required
if [ -z "$MODEL" ]; then
    printf "Error: --model is required\n" >&2
    exit 2
fi

# --message and --message-file: exactly one required
if [ -n "$MESSAGE" ] && [ -n "$MESSAGE_FILE" ]; then
    printf "Error: --message and --message-file are mutually exclusive\n" >&2
    exit 2
fi
if [ -z "$MESSAGE" ] && [ -z "$MESSAGE_FILE" ]; then
    printf "Error: either --message or --message-file is required\n" >&2
    exit 2
fi

# If --message-file given, the file must exist
if [ -n "$MESSAGE_FILE" ] && [ ! -f "$MESSAGE_FILE" ]; then
    printf "Error: --message-file '%s' does not exist\n" "$MESSAGE_FILE" >&2
    exit 2
fi

# Aider binary must exist and be executable
if [ ! -f "$AIDER_BIN" ] || [ ! -x "$AIDER_BIN" ]; then
    printf "Error: Aider is not installed at '%s'\n" "$AIDER_BIN" >&2
    printf "Install Aider to the venv or set AIDER_BIN to override.\n" >&2
    exit 2
fi

# timeout command must be available
if ! command -v timeout >/dev/null 2>&1; then
    printf "Error: 'timeout' command not found (required for wall-clock enforcement)\n" >&2
    exit 2
fi

# jq must be available (for metadata.json generation)
if ! command -v jq >/dev/null 2>&1; then
    printf "Error: 'jq' command not found (required for metadata generation)\n" >&2
    exit 2
fi

# ---------------------------------------------------------------------------
# Install EXIT trap to ensure metadata is always written
# ---------------------------------------------------------------------------
trap 'write_metadata' EXIT

# ---------------------------------------------------------------------------
# Capture Aider version
# ---------------------------------------------------------------------------
AIDER_VERSION=$("$AIDER_BIN" --version 2>/dev/null) || {
    printf "Error: failed to get Aider version from '%s --version'\n" "$AIDER_BIN" >&2
    exit 2
}
# Strip to first version-like token (e.g., "aider 0.42.0" -> "0.42.0")
AIDER_VERSION=$(printf '%s' "$AIDER_VERSION" | sed 's/^[^0-9]*//' | head -1)
if [ -z "$AIDER_VERSION" ]; then
    AIDER_VERSION="unknown"
fi

# ---------------------------------------------------------------------------
# Record start time
# ---------------------------------------------------------------------------
START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_EPOCH=$(date +%s)

# ---------------------------------------------------------------------------
# Construct Aider command
# ---------------------------------------------------------------------------
AIDER_CMD="$AIDER_BIN"
AIDER_CMD="$AIDER_CMD --yes-always"
AIDER_CMD="$AIDER_CMD --no-stream"
AIDER_CMD="$AIDER_CMD --no-pretty"
AIDER_CMD="$AIDER_CMD --no-fancy-input"
AIDER_CMD="$AIDER_CMD --no-auto-lint"
AIDER_CMD="$AIDER_CMD --no-auto-commits"
AIDER_CMD="$AIDER_CMD --llm-history-file $OUTPUT_DIR/llm-history.txt"
AIDER_CMD="$AIDER_CMD --model $MODEL"
AIDER_CMD="$AIDER_CMD --edit-format $EDIT_FORMAT"

if [ -n "$MESSAGE" ]; then
    AIDER_CMD="$AIDER_CMD --message $MESSAGE"
else
    AIDER_CMD="$AIDER_CMD --message-file $MESSAGE_FILE"
fi

if [ -n "$AIDER_TIMEOUT" ]; then
    AIDER_CMD="$AIDER_CMD --timeout $AIDER_TIMEOUT"
fi

# ---------------------------------------------------------------------------
# Execute Aider with timeout, output capture, and stdin from /dev/null
# ---------------------------------------------------------------------------
cd "$CODEBASE_DIR"

# Disable set -e for the invocation so we can capture the exit code
set +e
# shellcheck disable=SC2086
timeout --kill-after=30 "$TIMEOUT" \
    $AIDER_CMD \
    < /dev/null \
    > "$OUTPUT_DIR/stdout.log" \
    2> "$OUTPUT_DIR/stderr.log"
AIDER_EXIT=$?
set -e

# ---------------------------------------------------------------------------
# Record end time
# ---------------------------------------------------------------------------
END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
END_EPOCH=$(date +%s)

# ---------------------------------------------------------------------------
# Exit with the Aider/timeout exit code
# (metadata.json is written by the EXIT trap)
# ---------------------------------------------------------------------------
exit "$AIDER_EXIT"
