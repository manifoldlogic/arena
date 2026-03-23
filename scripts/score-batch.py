#!/usr/bin/env python3
"""
score-batch.py -- Interactively score all pending entries for a round.

Finds all source="pending" entries in data/rounds.jsonl matching the given
round ID, then prompts the judge to enter precision/recall/insight scores
(1-5) for each competitor×codebase pair. After scoring, entries are updated
to source="score" with computed totals and divergence signals.

Usage:
    python3 scripts/score-batch.py R25
    python3 scripts/score-batch.py --round-id R25
"""

import argparse
import json
import os
import sys
import tempfile
from datetime import datetime, timezone

SCHEMA_VERSION = 1

VALID_DIVERGENCE_SIGNALS = ["gray", "yellow", "signal"]


def get_data_dir():
    """Return the Arena data directory."""
    if "ARENA_DATA_DIR" in os.environ:
        return os.environ["ARENA_DATA_DIR"]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    return os.path.join(repo_root, "data")


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


def compute_divergence_signal(spread):
    """Map score spread to divergence tier."""
    if spread <= 2:
        return "gray"
    elif spread <= 4:
        return "yellow"
    return "signal"


def prompt_score(prompt_text, min_val=1, max_val=5):
    """Prompt for an integer score within range. Returns the score."""
    while True:
        try:
            raw = input(prompt_text)
            val = int(raw.strip())
            if min_val <= val <= max_val:
                return val
            print("  Must be between {} and {}.".format(min_val, max_val))
        except ValueError:
            print("  Enter an integer.")
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(1)


def prompt_optional(prompt_text):
    """Prompt for optional free text. Empty string returns None."""
    try:
        raw = input(prompt_text)
        return raw.strip() or None
    except (EOFError, KeyboardInterrupt):
        print("\nAborted.")
        sys.exit(1)


def prompt_calls(prompt_text):
    """Prompt for tool call count (>= 0)."""
    while True:
        try:
            raw = input(prompt_text)
            if not raw.strip():
                return 0
            val = int(raw.strip())
            if val >= 0:
                return val
            print("  Must be >= 0.")
        except ValueError:
            print("  Enter an integer.")
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(1)


def prompt_time(prompt_text):
    """Prompt for wall-clock time in seconds (>= 0)."""
    while True:
        try:
            raw = input(prompt_text)
            if not raw.strip():
                return 0.0
            val = float(raw.strip())
            if val >= 0:
                return val
            print("  Must be >= 0.")
        except ValueError:
            print("  Enter a number.")
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(1)


def score_entry_interactive(entry, index, total):
    """Prompt the judge to score a single entry. Returns updated entry."""
    print()
    print("=" * 60)
    print("  Entry {}/{}: {} × {}".format(
        index, total, entry["competitor"], entry["codebase"]))
    print("  Round: {}  |  Category: {}".format(
        entry["round_id"], entry["query_category"]))
    if entry.get("query_text"):
        print("  Query: {}".format(entry["query_text"]))
    print("-" * 60)

    precision = prompt_score("  Precision (1-5): ")
    recall = prompt_score("  Recall    (1-5): ")
    insight = prompt_score("  Insight   (1-5): ")
    calls = prompt_calls("  Tool calls (0+, enter=0): ")
    time_s = prompt_time("  Time in seconds (0+, enter=0): ")
    notes = prompt_optional("  Judge notes (enter=skip): ")

    total_score = precision + recall + insight

    entry["precision"] = precision
    entry["recall"] = recall
    entry["insight"] = insight
    entry["total"] = total_score
    entry["calls"] = calls
    entry["time_s"] = time_s
    entry["judge_notes"] = notes
    entry["source"] = "score"
    entry["timestamp"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    print("  => Score: {}/15".format(total_score))
    return entry


def resolve_winners_and_divergence(entries, round_id):
    """Compute round_winner and divergence_signal across scored entries.

    Groups entries by codebase. Within each codebase, the competitor with
    the highest total wins. Divergence is computed from the spread across
    all competitors for the same codebase.
    """
    by_codebase = {}
    for e in entries:
        if e["round_id"] != round_id or e["source"] != "score":
            continue
        cb = e["codebase"]
        by_codebase.setdefault(cb, []).append(e)

    for cb, cb_entries in by_codebase.items():
        totals = [e["total"] for e in cb_entries if e["total"] is not None]
        if not totals:
            continue

        spread = max(totals) - min(totals)
        signal = compute_divergence_signal(spread)

        max_total = max(totals)
        winners = [e["competitor"] for e in cb_entries if e["total"] == max_total]

        for e in cb_entries:
            e["divergence_signal"] = signal
            if len(winners) == 1:
                e["round_winner"] = winners[0]
            else:
                e["round_winner"] = None  # tie


def print_results_table(scored_entries):
    """Print a results summary table."""
    if not scored_entries:
        return

    competitors = sorted(set(e["competitor"] for e in scored_entries))
    codebases = sorted(set(e["codebase"] for e in scored_entries))

    comp_width = max(len("Competitor"), max(len(c) for c in competitors))
    cb_width = max(max(len(c) for c in codebases), len("Total"))

    # Header
    header = "  {:<{}}".format("Competitor", comp_width)
    for cb in codebases:
        header += "  {:>{}}".format(cb, cb_width)
    header += "  {:>{}}".format("Total", cb_width)
    print()
    print(header)
    print("  " + "-" * (len(header) - 2))

    # Rows
    for comp in competitors:
        row = "  {:<{}}".format(comp, comp_width)
        comp_total = 0
        for cb in codebases:
            match = [e for e in scored_entries
                     if e["competitor"] == comp and e["codebase"] == cb]
            if match and match[0]["total"] is not None:
                score = match[0]["total"]
                comp_total += score
                row += "  {:>{}}".format("{}/15".format(score), cb_width)
            else:
                row += "  {:>{}}".format("-", cb_width)
        row += "  {:>{}}".format(str(comp_total), cb_width)
        print(row)

    # Winners row
    print()
    for cb in codebases:
        cb_entries = [e for e in scored_entries if e["codebase"] == cb]
        if cb_entries and cb_entries[0].get("round_winner"):
            print("  {} winner: {} (divergence: {})".format(
                cb, cb_entries[0]["round_winner"],
                cb_entries[0].get("divergence_signal", "?")))
        elif cb_entries:
            print("  {} : tie (divergence: {})".format(
                cb, cb_entries[0].get("divergence_signal", "?")))
    print()


def build_parser():
    """Build and return the argument parser."""
    parser = argparse.ArgumentParser(
        description="Interactively score pending entries for a competition round")
    parser.add_argument("round_id", nargs="?", default=None,
                        help="Round identifier (e.g. R25)")
    parser.add_argument("--round-id", dest="round_id_flag", default=None,
                        help="Round identifier (alternative to positional)")
    parser.add_argument("--list-pending", action="store_true",
                        help="List all rounds with pending entries and exit")
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    data_dir = get_data_dir()
    rounds_path = os.path.join(data_dir, "rounds.jsonl")

    if not os.path.exists(rounds_path):
        print("Error: {} not found.".format(rounds_path), file=sys.stderr)
        sys.exit(1)

    all_entries = read_all_entries(rounds_path)

    # List pending rounds if requested
    if args.list_pending:
        pending_rounds = {}
        for e in all_entries:
            if e.get("source") == "pending":
                rid = e["round_id"]
                pending_rounds.setdefault(rid, 0)
                pending_rounds[rid] += 1
        if not pending_rounds:
            print("No pending entries found.")
        else:
            print("Pending rounds:")
            for rid, count in sorted(pending_rounds.items()):
                print("  {} — {} entries".format(rid, count))
        sys.exit(0)

    # Resolve round_id from positional or flag
    round_id = args.round_id or args.round_id_flag
    if not round_id:
        print("Error: round_id required. Use --list-pending to see available rounds.",
              file=sys.stderr)
        sys.exit(1)

    # Find pending entries for this round
    pending_indices = []
    for i, e in enumerate(all_entries):
        if e.get("round_id") == round_id and e.get("source") == "pending":
            pending_indices.append(i)

    if not pending_indices:
        print("No pending entries found for round {}.".format(round_id))
        # Check if scored entries exist
        scored = [e for e in all_entries
                  if e.get("round_id") == round_id and e.get("source") == "score"]
        if scored:
            print("(Found {} already-scored entries for this round.)".format(len(scored)))
        sys.exit(0)

    print("Found {} pending entries for round {}.".format(len(pending_indices), round_id))
    print("Enter scores for each competitor×codebase pair.")
    print("Press Ctrl+C at any time to abort (no changes will be saved).")

    # Score each pending entry interactively
    scored_entries = []
    for seq, idx in enumerate(pending_indices, 1):
        entry = all_entries[idx]
        scored = score_entry_interactive(entry, seq, len(pending_indices))
        scored_entries.append(scored)
        all_entries[idx] = scored

    # Compute winners and divergence across all scored entries for this round
    resolve_winners_and_divergence(all_entries, round_id)

    # Print results
    round_entries = [e for e in all_entries
                     if e.get("round_id") == round_id and e.get("source") == "score"]
    print_results_table(round_entries)

    # Write atomically
    atomic_write_jsonl(rounds_path, all_entries)
    print("Updated {} entries in {}".format(len(scored_entries), rounds_path))


if __name__ == "__main__":
    main()
