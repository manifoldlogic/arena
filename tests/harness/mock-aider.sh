#!/bin/sh
# =============================================================================
# mock-aider.sh — Stub replacement for Aider in integration tests
# =============================================================================
#
# Accepts all Aider flags, writes dummy output to --llm-history-file if
# provided, and exits with MOCK_AIDER_EXIT_CODE (default 0).
#
# Environment:
#   MOCK_AIDER_EXIT_CODE   Exit code to return (default 0)
#   MOCK_AIDER_SLEEP       Sleep this many seconds before exiting (for timeout tests)
#   MOCK_AIDER_STDERR      Write this string to stderr before exiting
#   MOCK_AIDER_MODIFY_FILE If set, write a trivial change to this file path
#                          (enables git diff testing)
#   MOCK_AIDER_INVOCATION_LOG  If set, write each argument on its own line to
#                              this file path (enables argument inspection)
#
# =============================================================================

LLM_HISTORY_FILE=""

# Handle --version early (before full flag parsing)
if [ "${1:-}" = "--version" ]; then
    printf "aider 0.42.0-mock\n"
    exit 0
fi

# Log invocation arguments (one per line) if requested
if [ -n "${MOCK_AIDER_INVOCATION_LOG:-}" ]; then
    for _arg in "$@"; do
        printf '%s\n' "$_arg"
    done > "$MOCK_AIDER_INVOCATION_LOG"
fi

# Parse flags to find --llm-history-file
while [ $# -gt 0 ]; do
    case "$1" in
        --llm-history-file)
            LLM_HISTORY_FILE="$2"
            shift 2
            ;;
        --message|--message-file|--model|--edit-format|--timeout)
            # Flags that consume a value
            shift 2
            ;;
        --yes-always|--no-stream|--no-pretty|--no-fancy-input|--no-auto-lint|--no-auto-commits)
            # Boolean flags
            shift
            ;;
        *)
            # Skip anything else
            shift
            ;;
    esac
done

# Write dummy output if --llm-history-file was given
if [ -n "$LLM_HISTORY_FILE" ]; then
    printf "mock-aider: dummy llm history output\n" > "$LLM_HISTORY_FILE"
fi

# Modify a file if requested (for git diff testing)
if [ -n "${MOCK_AIDER_MODIFY_FILE:-}" ]; then
    printf "mock-aider modification\n" >> "$MOCK_AIDER_MODIFY_FILE"
fi

# Write mock stdout
printf "mock-aider stdout output\n"

# Write mock stderr if requested
if [ -n "${MOCK_AIDER_STDERR:-}" ]; then
    printf "%s\n" "$MOCK_AIDER_STDERR" >&2
fi

# Sleep if requested (for timeout testing)
if [ -n "${MOCK_AIDER_SLEEP:-}" ]; then
    sleep "$MOCK_AIDER_SLEEP"
fi

# Exit with configurable code
exit "${MOCK_AIDER_EXIT_CODE:-0}"
