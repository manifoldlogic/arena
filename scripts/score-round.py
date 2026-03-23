#!/usr/bin/env python3
"""
score-round.py -- CLI tool for manually scoring Arena competition rounds.

Accepts per-competitor scoring data, validates against the schema, computes
divergence_signal, and appends a valid JSONL line to data/rounds.jsonl using
atomic write (write-to-temp + os.replace).

Usage:
    python3 scripts/score-round.py \
        --round-id R24 --competitor maproom \
        --precision 4 --recall 5 --insight 3 \
        --calls 42 --time-s 156.3 \
        --codebase mattermost-webapp --category flow \
        --query "How does X work?" \
        --winner maproom --notes "Found all paths"
"""

import argparse
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone

SCHEMA_VERSION = 1

VALID_CATEGORIES = [
    "flow", "pattern", "relationship", "boundary", "lifecycle",
    "error-handling", "config", "performance", "security", "testing",
    "integration",
]

VALID_CODEBASES = ["mattermost-webapp", "django", "fastapi"]

VALID_DIVERGENCE_SIGNALS = ["gray", "yellow", "signal"]

ROUND_ID_PATTERN = re.compile(r"^(R|BR|CAL)\d+$")


def get_data_dir():
    """Return the Arena data directory."""
    if "ARENA_DATA_DIR" in os.environ:
        return os.environ["ARENA_DATA_DIR"]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    return os.path.join(repo_root, "data")


def parse_round_type(round_id):
    """Derive round_type from round_id prefix."""
    if round_id.startswith("BR"):
        return "bridge"
    elif round_id.startswith("CAL"):
        return "calibration"
    return "regular"


def compute_divergence_signal(spread):
    """Map score spread to divergence tier."""
    if spread <= 2:
        return "gray"
    elif spread <= 4:
        return "yellow"
    return "signal"


def read_round_entries(rounds_path, round_id):
    """Read all score entries for a given round_id from rounds.jsonl."""
    entries = []
    if not os.path.exists(rounds_path):
        return entries
    with open(rounds_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            if entry.get("round_id") == round_id and entry.get("source") == "score":
                entries.append(entry)
    return entries


def read_all_entries(rounds_path):
    """Read all entries from rounds.jsonl."""
    entries = []
    if not os.path.exists(rounds_path):
        return entries
    with open(rounds_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entries.append(json.loads(line))
    return entries


def atomic_write_jsonl(rounds_path, entries):
    """Write all entries to rounds.jsonl atomically via temp + rename."""
    data_dir = os.path.dirname(rounds_path)
    os.makedirs(data_dir, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=data_dir, suffix=".jsonl.tmp")
    try:
        with os.fdopen(fd, "w") as f:
            for entry in entries:
                f.write(json.dumps(entry) + "\n")
        os.replace(tmp_path, rounds_path)
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


def validate_args(args):
    """Validate CLI arguments. Returns list of error strings."""
    errors = []

    if not ROUND_ID_PATTERN.match(args.round_id):
        errors.append("round_id '{}' must match format R01, BR01, CAL01 etc.".format(args.round_id))

    if not args.competitor or not args.competitor.strip():
        errors.append("competitor must be a non-empty string")

    for field in ["precision", "recall", "insight"]:
        val = getattr(args, field)
        if val < 1 or val > 5:
            errors.append("{} must be between 1 and 5 (got {})".format(field, val))

    if args.calls < 0:
        errors.append("calls must be >= 0 (got {})".format(args.calls))

    if args.time_s < 0:
        errors.append("time_s must be >= 0 (got {})".format(args.time_s))

    if args.category not in VALID_CATEGORIES:
        errors.append("category '{}' not valid. Must be one of: {}".format(
            args.category, ", ".join(VALID_CATEGORIES)))

    if args.codebase not in VALID_CODEBASES:
        errors.append("codebase '{}' not valid. Must be one of: {}".format(
            args.codebase, ", ".join(VALID_CODEBASES)))

    if args.divergence_signal and args.divergence_signal not in VALID_DIVERGENCE_SIGNALS:
        errors.append("divergence_signal '{}' not valid. Must be one of: {}".format(
            args.divergence_signal, ", ".join(VALID_DIVERGENCE_SIGNALS)))

    return errors


def build_entry(args, divergence_signal):
    """Build a JSONL entry dict from parsed CLI args."""
    total = args.precision + args.recall + args.insight
    round_type = parse_round_type(args.round_id)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    session_id = args.session_id if args.session_id else "manual-{}".format(
        datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S"))

    return {
        "schema_version": SCHEMA_VERSION,
        "round_id": args.round_id,
        "competitor": args.competitor,
        "query_category": args.category,
        "query_text": args.query,
        "codebase": args.codebase,
        "phase": args.phase,
        "round_type": round_type,
        "precision": args.precision,
        "recall": args.recall,
        "insight": args.insight,
        "total": total,
        "calls": args.calls,
        "time_s": args.time_s,
        "round_winner": args.winner,
        "judge_notes": args.notes,
        "divergence_signal": divergence_signal,
        "is_calibration": round_type == "calibration",
        "series1_scores": None,
        "series1_baseline": None,
        "timestamp": timestamp,
        "session_id": session_id,
        "source": "score",
    }


def resolve_divergence_signal(args, new_total, rounds_path):
    """Determine divergence_signal for the new entry.

    If --divergence-signal is provided, use it directly.
    Otherwise, compute from the spread across all score entries for the same
    round_id (including the entry being added).
    Returns (signal_value, should_update_existing).
    """
    if args.divergence_signal:
        return args.divergence_signal, False

    existing = read_round_entries(rounds_path, args.round_id)
    totals = [e["total"] for e in existing if e.get("total") is not None]
    totals.append(new_total)

    if len(totals) < 2:
        return None, False

    spread = max(totals) - min(totals)
    signal = compute_divergence_signal(spread)
    return signal, len(existing) > 0


def score_round(args):
    """Main scoring logic. Returns the appended entry dict."""
    errors = validate_args(args)
    if errors:
        for e in errors:
            print("Error: {}".format(e), file=sys.stderr)
        sys.exit(1)

    data_dir = get_data_dir()
    os.makedirs(data_dir, exist_ok=True)
    rounds_path = os.path.join(data_dir, "rounds.jsonl")

    total = args.precision + args.recall + args.insight
    signal, update_existing = resolve_divergence_signal(args, total, rounds_path)

    entry = build_entry(args, signal)

    if update_existing:
        # Rewrite file to update divergence_signal on existing round entries
        all_entries = read_all_entries(rounds_path)
        for e in all_entries:
            if e.get("round_id") == args.round_id and e.get("source") == "score":
                e["divergence_signal"] = signal
        all_entries.append(entry)
        atomic_write_jsonl(rounds_path, all_entries)
    else:
        # Simple atomic append: write to temp, then append
        all_entries = read_all_entries(rounds_path)
        all_entries.append(entry)
        atomic_write_jsonl(rounds_path, all_entries)

    print("Scored {} in {}: {}/15 (divergence: {})".format(
        args.competitor, args.round_id, total, signal))
    return entry


def build_parser():
    """Build and return the argument parser."""
    parser = argparse.ArgumentParser(
        description="Score an Arena competition round")
    parser.add_argument("--round-id", required=True,
                        help="Round identifier (e.g. R24, BR01, CAL01)")
    parser.add_argument("--competitor", required=True,
                        help="Competitor name (e.g. maproom, explore)")
    parser.add_argument("--precision", type=int, required=True,
                        help="Precision score (1-5)")
    parser.add_argument("--recall", type=int, required=True,
                        help="Recall score (1-5)")
    parser.add_argument("--insight", type=int, required=True,
                        help="Insight score (1-5)")
    parser.add_argument("--calls", type=int, required=True,
                        help="Tool call count (>= 0)")
    parser.add_argument("--time-s", type=float, required=True,
                        help="Wall-clock time in seconds (>= 0)")
    parser.add_argument("--codebase", required=True,
                        help="Target codebase (mattermost-webapp, django, fastapi)")
    parser.add_argument("--category", required=True,
                        help="Query category ({})".format(", ".join(VALID_CATEGORIES)))
    parser.add_argument("--query", default=None,
                        help="Full query text (optional)")
    parser.add_argument("--winner", default=None,
                        help="Round winner competitor name (optional)")
    parser.add_argument("--notes", default=None,
                        help="Judge notes (optional)")
    parser.add_argument("--phase", type=int, default=2,
                        help="Competition phase (default: 2)")
    parser.add_argument("--session-id", default=None,
                        help="Session identifier (default: auto-generated)")
    parser.add_argument("--divergence-signal", default=None,
                        choices=VALID_DIVERGENCE_SIGNALS,
                        help="Override divergence signal (default: auto-computed)")
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    score_round(args)


if __name__ == "__main__":
    main()
