#!/bin/sh
# =============================================================================
# setup-codebase.sh — Clone and prepare a codebase for competition
# =============================================================================
#
# Clones the specified codebase at its pinned SHA and runs any
# competitor-specific setup/indexing scripts.
#
# Usage:
#   ./setup-codebase.sh --codebase <name>
#   ./setup-codebase.sh --help
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

CODEBASE=""

usage() {
    printf "Usage: %s --codebase <name>\n" "$0"
    printf "\n"
    printf "Clone and prepare a codebase for the competition.\n"
    printf "\n"
    printf "Options:\n"
    printf "  --codebase <name>    Codebase to set up (e.g., fastapi, django, mattermost-webapp)\n"
    printf "  --help               Show this help message\n"
    printf "\n"
    printf "Reads codebase metadata from config/codebases.json.\n"
    exit 0
}

# Parse arguments
while [ $# -gt 0 ]; do
    case "$1" in
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

if [ -z "$CODEBASE" ]; then
    printf "Error: Missing required --codebase argument.\n" >&2
    printf "Run '%s --help' for usage.\n" "$0" >&2
    exit 1
fi

printf "Setting up codebase: %s\n" "$CODEBASE"

# TODO: Implement codebase setup (clone at pinned SHA, run index scripts)
printf "Codebase setup not yet implemented.\n"
