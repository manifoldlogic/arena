#!/bin/sh
# =============================================================================
# aggregate-results.sh — Generate aggregate reports from scored rounds
# =============================================================================
#
# Produces per-codebase, per-competitor, per-category, cross-series,
# and tool-selection-matrix reports from scored round data.
#
# Usage:
#   ./aggregate-results.sh
#   ./aggregate-results.sh --help
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
    printf "Usage: %s\n" "$0"
    printf "\n"
    printf "Aggregate all scored round results into summary reports.\n"
    printf "\n"
    printf "Options:\n"
    printf "  --help    Show this help message\n"
    printf "\n"
    printf "Input:  results/scored/\n"
    printf "Output: results/aggregated/\n"
    exit 0
}

# Parse arguments
while [ $# -gt 0 ]; do
    case "$1" in
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

printf "Aggregating results...\n"

# TODO: Implement aggregation
printf "Aggregation not yet implemented.\n"
