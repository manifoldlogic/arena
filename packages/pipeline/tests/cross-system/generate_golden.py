#!/usr/bin/env python3
"""Generate consistency-expected.json golden file from consistency-test-rounds.jsonl.

Implements the canonical standings computation logic:
  1. Load JSONL entries
  2. Deduplicate (same round_id+competitor: prefer source=score over agent)
  3. Exclude calibration rounds from standings
  4. Exclude agent-only entries (no total) from win/loss/tie computation
  5. Compute standings: overall, by_codebase, by_category
  6. Compute divergences from divergence_signal field
  7. Compute closest_calls (rounds with margin <= 1 between winner and runner-up)
  8. Compute dimension_totals (per-competitor precision/recall/insight sums)

The output JSON is the single source of truth that both Python and TypeScript
test suites assert against.
"""

import json
import os
import sys
from collections import defaultdict
from pathlib import Path

FIXTURE_DIR = Path(__file__).parent
FIXTURE_PATH = FIXTURE_DIR / "consistency-test-rounds.jsonl"
OUTPUT_PATH = FIXTURE_DIR / "consistency-expected.json"


def load_rounds(path):
    """Load JSONL file into list of dicts."""
    entries = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


def deduplicate(entries):
    """Deduplicate: for same (round_id, competitor), keep source=score over agent."""
    best = {}
    for entry in entries:
        key = (entry["round_id"], entry["competitor"])
        if key in best:
            existing = best[key]
            # Prefer score over agent
            if existing["source"] == "agent" and entry["source"] == "score":
                best[key] = entry
            # If both score, keep first (shouldn't happen in valid data)
        else:
            best[key] = entry
    return list(best.values())


def _scorable_entries(entries):
    """Filter to non-calibration entries that have a total (source=score after dedup)."""
    return [e for e in entries if not e.get("is_calibration", False) and e.get("total") is not None]


def _group_by(entries, key_fn):
    """Group entries by a key function."""
    groups = defaultdict(list)
    for e in entries:
        groups[key_fn(e)].append(e)
    return groups


def _compute_round_outcomes(round_entries):
    """For a set of entries in one round, determine win/tie/loss for each competitor.

    Returns dict: competitor -> 'win' | 'tie' | 'loss'
    """
    if not round_entries:
        return {}

    totals = {e["competitor"]: e["total"] for e in round_entries}
    max_total = max(totals.values())
    top_competitors = [c for c, t in totals.items() if t == max_total]

    outcomes = {}
    if len(top_competitors) == 1:
        for comp in totals:
            outcomes[comp] = "win" if comp == top_competitors[0] else "loss"
    else:
        for comp in totals:
            outcomes[comp] = "tie" if comp in top_competitors else "loss"
    return outcomes


def _compute_standings(entries):
    """Compute CompetitorStanding[] from a list of scorable entries.

    Returns list of standings sorted by total desc, then competitor asc.
    """
    scorable = _scorable_entries(entries)
    by_round = _group_by(scorable, lambda e: e["round_id"])

    stats = defaultdict(lambda: {"total": 0, "wins": 0, "ties": 0, "losses": 0, "rounds": 0,
                                  "precision": 0, "recall": 0, "insight": 0})

    for round_id, round_entries in by_round.items():
        outcomes = _compute_round_outcomes(round_entries)
        for entry in round_entries:
            comp = entry["competitor"]
            s = stats[comp]
            s["total"] += entry["total"]
            s["rounds"] += 1
            s["precision"] += entry.get("precision", 0)
            s["recall"] += entry.get("recall", 0)
            s["insight"] += entry.get("insight", 0)
            outcome = outcomes.get(comp, "loss")
            if outcome == "win":
                s["wins"] += 1
            elif outcome == "tie":
                s["ties"] += 1
            else:
                s["losses"] += 1

    standings = []
    for comp, s in stats.items():
        standings.append({
            "competitor": comp,
            "total": s["total"],
            "wins": s["wins"],
            "ties": s["ties"],
            "losses": s["losses"],
            "rounds": s["rounds"],
            "avg": round(s["total"] / s["rounds"], 2) if s["rounds"] > 0 else 0,
        })

    standings.sort(key=lambda x: (-x["total"], x["competitor"]))
    return standings


def _compute_dimension_totals(entries):
    """Compute per-competitor sums of precision, recall, insight from scorable entries.

    Returns dict: competitor -> {precision, recall, insight}
    Sorted by competitor name.
    """
    scorable = _scorable_entries(entries)
    dims = defaultdict(lambda: {"precision": 0, "recall": 0, "insight": 0})
    for e in scorable:
        comp = e["competitor"]
        dims[comp]["precision"] += e.get("precision", 0)
        dims[comp]["recall"] += e.get("recall", 0)
        dims[comp]["insight"] += e.get("insight", 0)

    result = {}
    for comp in sorted(dims.keys()):
        result[comp] = dims[comp]
    return result


def _compute_divergences(entries):
    """Extract divergence signal classification per round.

    Returns list of {round_id, divergence_signal, spread} sorted by round_id.
    Only includes rounds that have a divergence_signal set.
    """
    scorable = _scorable_entries(entries)
    by_round = _group_by(scorable, lambda e: e["round_id"])

    divergences = []
    for round_id in sorted(by_round.keys()):
        round_entries = by_round[round_id]
        signals = [e.get("divergence_signal") for e in round_entries if e.get("divergence_signal")]
        if not signals:
            continue
        # All entries in same round should have same signal
        signal = signals[0]
        totals = [e["total"] for e in round_entries]
        spread = max(totals) - min(totals) if len(totals) >= 2 else 0
        divergences.append({
            "round_id": round_id,
            "divergence_signal": signal,
            "spread": spread,
        })

    return divergences


def _compute_closest_calls(entries):
    """Find rounds where the margin between winner and runner-up is <= 1.

    Returns list of {round_id, margin, competitors} sorted by round_id.
    Includes ties (margin=0).
    """
    scorable = _scorable_entries(entries)
    by_round = _group_by(scorable, lambda e: e["round_id"])

    closest = []
    for round_id in sorted(by_round.keys()):
        round_entries = by_round[round_id]
        if len(round_entries) < 2:
            continue
        totals = sorted([e["total"] for e in round_entries], reverse=True)
        margin = totals[0] - totals[1]
        if margin <= 1:
            competitors = sorted([e["competitor"] for e in round_entries])
            closest.append({
                "round_id": round_id,
                "margin": margin,
                "competitors": competitors,
            })

    return closest


def generate_golden(fixture_path, output_path):
    """Generate the complete golden expected output."""
    raw_entries = load_rounds(fixture_path)
    entries = deduplicate(raw_entries)

    # Overall standings
    overall = _compute_standings(entries)

    # By codebase
    scorable = _scorable_entries(entries)
    by_codebase_groups = _group_by(scorable, lambda e: e["codebase"])
    by_codebase = {}
    for codebase in sorted(by_codebase_groups.keys()):
        by_codebase[codebase] = _compute_standings(by_codebase_groups[codebase])

    # By category
    by_category_groups = _group_by(scorable, lambda e: e.get("query_category", "unknown"))
    by_category = {}
    for cat in sorted(by_category_groups.keys()):
        by_category[cat] = _compute_standings(by_category_groups[cat])

    # Divergences
    divergences = _compute_divergences(entries)

    # Closest calls
    closest_calls = _compute_closest_calls(entries)

    # Dimension totals
    dimension_totals = _compute_dimension_totals(entries)

    golden = {
        "metadata": {
            "fixture": "consistency-test-rounds.jsonl",
            "total_raw_entries": len(raw_entries),
            "total_after_dedup": len(entries),
            "total_scorable": len(scorable),
            "generator": "generate_golden.py",
        },
        "overall": overall,
        "by_codebase": by_codebase,
        "by_category": by_category,
        "divergences": divergences,
        "closest_calls": closest_calls,
        "dimension_totals": dimension_totals,
    }

    with open(output_path, "w") as f:
        json.dump(golden, f, indent=2)
        f.write("\n")

    print(f"Generated golden file: {output_path}")
    print(f"  Raw entries: {len(raw_entries)}")
    print(f"  After dedup: {len(entries)}")
    print(f"  Scorable:    {len(scorable)}")
    print(f"  Competitors: {[s['competitor'] for s in overall]}")
    print(f"  Divergences: {len(divergences)}")
    print(f"  Closest:     {len(closest_calls)}")


if __name__ == "__main__":
    fixture = Path(sys.argv[1]) if len(sys.argv) > 1 else FIXTURE_PATH
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else OUTPUT_PATH
    generate_golden(fixture, output)
