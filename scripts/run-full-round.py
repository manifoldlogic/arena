#!/usr/bin/env python3
"""
run-full-round.py -- Generate JSONL entries for a full competition round.

Reads specs/competitors.json and specs/codebases.json, then creates one
JSONL entry per competitor×codebase pair with placeholder (null) scores.
Entries are appended to data/rounds.jsonl with source="pending" so that
score-batch.py can fill in real scores later.

Usage:
    python3 scripts/run-full-round.py \
        --round-prefix R25 \
        --query "How does the request lifecycle work?" \
        --category flow \
        --codebases all \
        --competitors all

    python3 scripts/run-full-round.py \
        --round-prefix R26 \
        --query "Where is auth configured?" \
        --category config \
        --codebases mattermost-webapp django \
        --competitors explore maproom
"""

import argparse
import json
import os
import sys
import tempfile
from datetime import datetime, timezone

SCHEMA_VERSION = 1

VALID_CATEGORIES = [
    "flow", "pattern", "relationship", "boundary", "lifecycle",
    "error-handling", "config", "performance", "security", "testing",
    "integration",
]


def get_repo_root():
    """Return the repository root directory."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(script_dir)


def get_data_dir():
    """Return the Arena data directory."""
    if "ARENA_DATA_DIR" in os.environ:
        return os.environ["ARENA_DATA_DIR"]
    return os.path.join(get_repo_root(), "data")


def load_competitors(repo_root):
    """Load competitor list from specs/competitors.json."""
    path = os.path.join(repo_root, "specs", "competitors.json")
    with open(path, "r") as f:
        data = json.load(f)
    return data["competitors"]


def load_codebases(repo_root):
    """Load codebase list from specs/codebases.json."""
    path = os.path.join(repo_root, "specs", "codebases.json")
    with open(path, "r") as f:
        data = json.load(f)
    return data["codebases"]


def parse_round_type(round_id):
    """Derive round_type from round_id prefix."""
    if round_id.startswith("BR"):
        return "bridge"
    elif round_id.startswith("CAL"):
        return "calibration"
    return "regular"


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


def build_pending_entry(round_id, competitor, codebase, query_text, category, phase):
    """Build a JSONL entry with placeholder (null) scores."""
    round_type = parse_round_type(round_id)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    session_id = "batch-{}".format(datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S"))

    return {
        "schema_version": SCHEMA_VERSION,
        "round_id": round_id,
        "competitor": competitor,
        "query_category": category,
        "query_text": query_text,
        "codebase": codebase,
        "phase": phase,
        "round_type": round_type,
        "precision": None,
        "recall": None,
        "insight": None,
        "total": None,
        "calls": 0,
        "time_s": 0.0,
        "round_winner": None,
        "judge_notes": None,
        "divergence_signal": None,
        "is_calibration": round_type == "calibration",
        "series1_scores": None,
        "series1_baseline": None,
        "timestamp": timestamp,
        "session_id": session_id,
        "source": "pending",
    }


def filter_names(available, requested, label):
    """Filter available items by requested names. 'all' means keep all."""
    if requested == ["all"]:
        return available
    available_names = [item["name"] for item in available]
    for name in requested:
        if name not in available_names:
            print("Error: {} '{}' not found. Available: {}".format(
                label, name, ", ".join(available_names)), file=sys.stderr)
            sys.exit(1)
    return [item for item in available if item["name"] in requested]


def print_summary_table(entries):
    """Print a summary table of generated entries."""
    if not entries:
        print("No entries generated.")
        return

    # Collect unique competitors and codebases
    competitors = sorted(set(e["competitor"] for e in entries))
    codebases = sorted(set(e["codebase"] for e in entries))

    # Column widths
    comp_width = max(len("Competitor"), max(len(c) for c in competitors))
    cb_width = max(len(c) for c in codebases)

    # Header
    header = "  {:<{}}".format("Competitor", comp_width)
    for cb in codebases:
        header += "  {:<{}}".format(cb, cb_width)
    print()
    print(header)
    print("  " + "-" * (len(header) - 2))

    # Rows
    for comp in competitors:
        row = "  {:<{}}".format(comp, comp_width)
        for cb in codebases:
            match = [e for e in entries if e["competitor"] == comp and e["codebase"] == cb]
            status = "pending" if match else "-"
            row += "  {:<{}}".format(status, cb_width)
        print(row)

    print()
    print("  Round: {}  |  Category: {}  |  Entries: {}".format(
        entries[0]["round_id"], entries[0]["query_category"], len(entries)))
    print("  Query: {}".format(entries[0]["query_text"] or "(none)"))
    print()


def build_parser():
    """Build and return the argument parser."""
    parser = argparse.ArgumentParser(
        description="Generate JSONL entries for a full competition round")
    parser.add_argument("--round-prefix", required=True,
                        help="Round identifier (e.g. R25, BR02, CAL03)")
    parser.add_argument("--query", default=None,
                        help="Query text for this round")
    parser.add_argument("--category", required=True,
                        choices=VALID_CATEGORIES,
                        help="Query category")
    parser.add_argument("--codebases", nargs="+", default=["all"],
                        help="Codebases to include (default: all)")
    parser.add_argument("--competitors", nargs="+", default=["all"],
                        help="Competitors to include (default: all)")
    parser.add_argument("--phase", type=int, default=2,
                        help="Competition phase (default: 2)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be generated without writing")
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    repo_root = get_repo_root()
    data_dir = get_data_dir()
    rounds_path = os.path.join(data_dir, "rounds.jsonl")

    # Load and filter competitors/codebases
    all_competitors = load_competitors(repo_root)
    all_codebases = load_codebases(repo_root)

    competitors = filter_names(all_competitors, args.competitors, "Competitor")
    codebases = filter_names(all_codebases, args.codebases, "Codebase")

    # Check for existing entries with this round_id
    existing = read_all_entries(rounds_path)
    existing_pairs = set()
    for e in existing:
        if e.get("round_id") == args.round_prefix:
            existing_pairs.add((e["competitor"], e["codebase"]))

    if existing_pairs:
        print("Warning: {} existing entries found for round {}:".format(
            len(existing_pairs), args.round_prefix), file=sys.stderr)
        for comp, cb in sorted(existing_pairs):
            print("  - {} × {}".format(comp, cb), file=sys.stderr)
        print("Skipping these pairs.", file=sys.stderr)

    # Generate entries
    new_entries = []
    for comp in competitors:
        for cb in codebases:
            pair = (comp["name"], cb["name"])
            if pair in existing_pairs:
                continue
            entry = build_pending_entry(
                round_id=args.round_prefix,
                competitor=comp["name"],
                codebase=cb["name"],
                query_text=args.query,
                category=args.category,
                phase=args.phase,
            )
            new_entries.append(entry)

    if not new_entries:
        print("No new entries to generate (all pairs already exist).")
        sys.exit(0)

    print_summary_table(new_entries)

    if args.dry_run:
        print("Dry run — no entries written.")
        sys.exit(0)

    # Append atomically
    all_entries = existing + new_entries
    atomic_write_jsonl(rounds_path, all_entries)

    print("Appended {} entries to {}".format(len(new_entries), rounds_path))


if __name__ == "__main__":
    main()
