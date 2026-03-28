#!/bin/sh
# =============================================================================
# aider-runner.sh — Non-interactive Aider wrapper for competition harness
# =============================================================================
#
# Invokes Aider in non-interactive mode with fixed flags for automated
# competition use. Accepts competition parameters as CLI arguments and
# constructs the full Aider invocation.
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
# Execute Aider
# ---------------------------------------------------------------------------
# TODO: ARENA-46.2002 will wrap this invocation with timeout enforcement
# and stdin piping. The AIDER_CMD variable is structured so that task can
# wrap it cleanly with: timeout --kill-after=30 "$TIMEOUT" $AIDER_CMD
cd "$CODEBASE_DIR"
$AIDER_CMD
