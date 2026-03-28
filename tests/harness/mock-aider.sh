#!/bin/sh
# =============================================================================
# mock-aider.sh — Stub replacement for Aider in integration tests
# =============================================================================
#
# Accepts all Aider flags, writes dummy output to --llm-history-file if
# provided, and exits with MOCK_AIDER_EXIT_CODE (default 0).
#
# =============================================================================

LLM_HISTORY_FILE=""

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

# Exit with configurable code
exit "${MOCK_AIDER_EXIT_CODE:-0}"
