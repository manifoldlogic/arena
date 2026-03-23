#!/bin/sh
# =============================================================================
# run-round.sh — Execute a single competition round
# =============================================================================
#
# Round Execution Protocol (from architecture.md Component 2):
#
#   Step 1: Verify codebase is cloned at correct SHA
#   Step 2: Verify each active competitor's index exists (or create it)
#   Step 3: Launch all active competitors on the same query
#           NOTE: "Parallel" means the same query is posed to each competitor,
#           NOT simultaneous execution. Competitors run sequentially with
#           per-competitor timestamps to avoid API rate limit collisions and
#           produce valid per-competitor wall times.
#   Step 4: Capture per competitor: agent output, tool call count, wall-clock
#           time, agent ID
#   Step 5: Write all raw outputs to results/raw/{codebase}/{round-id}/
#           (one file per competitor)
#   Step 6: Compute live divergence signal: max score spread across competitors
#   Step 7: Judge scores all competitor outputs comparatively on 3 dimensions
#   Step 8: Write comparative scored result to
#           results/scored/{codebase}/{round-id}.json
#
# Usage:
#   ./run-round.sh --codebase <name> --query <file> --phase <n> --round-id <id>
#   ./run-round.sh --help
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Defaults
CODEBASE=""
QUERY=""
PHASE=""
ROUND_ID=""

usage() {
    printf "Usage: %s --codebase <name> --query <file> --phase <n> --round-id <id>\n" "$0"
    printf "\n"
    printf "Execute a single competition round for all active competitors.\n"
    printf "\n"
    printf "Options:\n"
    printf "  --codebase <name>    Codebase to run against (e.g., fastapi, django, mattermost-webapp)\n"
    printf "  --query <file>       Path to the query file (relative to queries/)\n"
    printf "  --phase <n>          Competition phase number (1, 2, or 3)\n"
    printf "  --round-id <id>      Unique round identifier (e.g., R01, BR01)\n"
    printf "  --help               Show this help message\n"
    printf "\n"
    printf "Results are written to:\n"
    printf "  Raw outputs:   results/raw/{codebase}/{round-id}/\n"
    printf "  Scored output: results/scored/{codebase}/{round-id}.json\n"
    exit 0
}

# Parse arguments
while [ $# -gt 0 ]; do
    case "$1" in
        --codebase)
            CODEBASE="$2"
            shift 2
            ;;
        --query)
            QUERY="$2"
            shift 2
            ;;
        --phase)
            PHASE="$2"
            shift 2
            ;;
        --round-id)
            ROUND_ID="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            printf "Error: Unknown argument '%s'\n" "$1" >&2
            printf "Run '%s --help' for usage.\n" "$0" >&2
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$CODEBASE" ] || [ -z "$QUERY" ] || [ -z "$PHASE" ] || [ -z "$ROUND_ID" ]; then
    printf "Error: Missing required arguments.\n" >&2
    printf "Run '%s --help' for usage.\n" "$0" >&2
    exit 1
fi

printf "=== Round Execution ===\n"
printf "Codebase: %s\n" "$CODEBASE"
printf "Query:    %s\n" "$QUERY"
printf "Phase:    %s\n" "$PHASE"
printf "Round ID: %s\n" "$ROUND_ID"
printf "\n"

# Create output directory
OUTPUT_DIR="$BASE_DIR/results/raw/$CODEBASE/$ROUND_ID"
mkdir -p "$OUTPUT_DIR"

# TODO: Implement full round execution protocol (Steps 1-8)
printf "Round execution not yet implemented. Output directory created at:\n"
printf "  %s\n" "$OUTPUT_DIR"
