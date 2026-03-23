#!/bin/sh
# =============================================================================
# score-round.sh — Comparative scoring of a completed round
# =============================================================================
#
# Invokes Opus to score all competitor outputs for a round comparatively
# on 3 judged dimensions (Precision, Recall, Insight).
#
# Usage:
#   ./score-round.sh --round-id <id> --codebase <name>
#   ./score-round.sh --help
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ROUND_ID=""
CODEBASE=""

usage() {
    printf "Usage: %s --round-id <id> --codebase <name>\n" "$0"
    printf "\n"
    printf "Score a completed round by comparing all competitor outputs.\n"
    printf "\n"
    printf "Options:\n"
    printf "  --round-id <id>      Round identifier (e.g., R01, BR01)\n"
    printf "  --codebase <name>    Codebase name (e.g., fastapi, django, mattermost-webapp)\n"
    printf "  --help               Show this help message\n"
    printf "\n"
    printf "Input:  results/raw/{codebase}/{round-id}/\n"
    printf "Output: results/scored/{codebase}/{round-id}.json\n"
    exit 0
}

# Parse arguments
while [ $# -gt 0 ]; do
    case "$1" in
        --round-id)
            ROUND_ID="$2"
            shift 2
            ;;
        --codebase)
            CODEBASE="$2"
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

if [ -z "$ROUND_ID" ] || [ -z "$CODEBASE" ]; then
    printf "Error: Missing required arguments.\n" >&2
    printf "Run '%s --help' for usage.\n" "$0" >&2
    exit 1
fi

printf "Scoring round %s on codebase %s...\n" "$ROUND_ID" "$CODEBASE"

# TODO: Implement comparative scoring
printf "Scoring not yet implemented.\n"
