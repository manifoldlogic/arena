#!/usr/bin/env python3
"""
generate-scoreboard.py -- Reads rounds.jsonl, computes standings, writes SCOREBOARD.md.

Idempotent: safe to re-run at any time. Produces identical output for identical input.

Usage:
    python3 generate-scoreboard.py
"""

import json
import os
import sys
from collections import defaultdict


def get_data_dir():
    """Return the Olympics data directory."""
    return os.environ.get("OLYMPICS_DATA_DIR", "/workspace/olympics")


def load_rounds(data_dir):
    """Load and parse rounds from rounds.jsonl.

    Args:
        data_dir: Path to the Olympics data directory.

    Returns:
        List of parsed JSON dicts. Malformed lines are skipped with stderr warning.
    """
    rounds_path = os.path.join(data_dir, "rounds.jsonl")
    if not os.path.exists(rounds_path):
        return []

    entries = []
    with open(rounds_path, "r") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                entries.append(entry)
            except json.JSONDecodeError as e:
                print("Warning: skipping malformed line {} in rounds.jsonl: {}".format(
                    line_num, e), file=sys.stderr)
    return entries


def deduplicate(entries):
    """Deduplicate entries by (round_id, competitor), preferring source="score".

    Args:
        entries: List of parsed JSON dicts.

    Returns:
        Deduplicated list of dicts.
    """
    groups = defaultdict(list)
    for entry in entries:
        key = (entry.get("round_id"), entry.get("competitor"))
        groups[key].append(entry)

    result = []
    for key, group in groups.items():
        # Prefer source="score" over source="agent"
        score_entries = [e for e in group if e.get("source") == "score"]
        if score_entries:
            result.append(score_entries[0])
        else:
            result.append(group[0])
    return result


def _is_calibration(entry):
    """Check if an entry is a calibration round."""
    return entry.get("round_type") == "calibration" or entry.get("is_calibration") is True


def _compute_standings(entries):
    """Compute standings from a list of non-calibration entries.

    Returns:
        List of dicts: [{"competitor", "total", "wins", "ties", "losses", "rounds"}]
        sorted by total descending, then competitor name ascending.
    """
    if not entries:
        return []

    # Aggregate totals per competitor
    totals = defaultdict(int)
    rounds_count = defaultdict(int)
    wins = defaultdict(int)
    ties = defaultdict(int)
    losses = defaultdict(int)

    for entry in entries:
        comp = entry.get("competitor")
        total = entry.get("total")
        if total is None:
            continue
        totals[comp] += total
        rounds_count[comp] += 1

    # Group by round_id for W/T/L
    by_round = defaultdict(list)
    for entry in entries:
        if entry.get("total") is not None:
            by_round[entry.get("round_id")].append(entry)

    for round_id, round_entries in by_round.items():
        round_totals = [(e.get("competitor"), e.get("total")) for e in round_entries]
        max_total = max(t for _, t in round_totals)
        all_equal = all(t == max_total for _, t in round_totals)

        for comp, total in round_totals:
            if all_equal and len(round_totals) > 1:
                ties[comp] += 1
            elif total == max_total:
                wins[comp] += 1
            else:
                losses[comp] += 1

    competitors = sorted(totals.keys())
    standings = []
    for comp in competitors:
        standings.append({
            "competitor": comp,
            "total": totals[comp],
            "wins": wins[comp],
            "ties": ties[comp],
            "losses": losses[comp],
            "rounds": rounds_count[comp],
        })

    standings.sort(key=lambda x: (-x["total"], x["competitor"]))
    return standings


def _standings_table(standings):
    """Render a standings table as markdown lines."""
    lines = []
    lines.append("| Competitor | Total Score | W | T | L | Rounds |")
    lines.append("|------------|------------|---|---|---|--------|")
    for s in standings:
        lines.append("| {} | {} | {} | {} | {} | {} |".format(
            s["competitor"], s["total"], s["wins"], s["ties"], s["losses"], s["rounds"]))
    return lines


def _compute_divergence(entries):
    """Compute divergence info for each round.

    Returns:
        List of dicts: [{"round_id", "codebase", "spread", "signal"}]
    """
    by_round = defaultdict(list)
    for entry in entries:
        if entry.get("total") is not None:
            by_round[entry.get("round_id")].append(entry)

    divergences = []
    seen = set()
    for entry in entries:
        rid = entry.get("round_id")
        if rid in seen:
            continue
        if rid not in by_round:
            continue
        seen.add(rid)

        round_entries = by_round[rid]
        codebase = round_entries[0].get("codebase", "unknown")

        # Use divergence_signal field if present on any entry in the round
        signal = None
        for e in round_entries:
            if e.get("divergence_signal"):
                signal = e.get("divergence_signal")
                break

        totals = [e.get("total") for e in round_entries if e.get("total") is not None]
        if len(totals) >= 2:
            spread = max(totals) - min(totals)
        else:
            spread = 0

        if signal is None:
            # Compute from spread
            if spread >= 5:
                signal = "signal"
            elif spread >= 3:
                signal = "yellow"
            else:
                signal = "gray"

        divergences.append({
            "round_id": rid,
            "codebase": codebase,
            "spread": spread,
            "signal": signal,
        })

    return divergences


def generate_scoreboard(entries):
    """Generate the SCOREBOARD.md content and divergence messages.

    Args:
        entries: List of deduplicated entry dicts.

    Returns:
        Tuple of (markdown_string, list_of_divergence_messages).
    """
    # Separate calibration from competition
    competition = [e for e in entries if not _is_calibration(e) and e.get("total") is not None]
    calibration = [e for e in entries if _is_calibration(e)]

    lines = []
    messages = []

    # --- Section 1: Overall Standings ---
    lines.append("# Olympics Scoreboard")
    lines.append("")
    lines.append("## 1. Overall Standings")
    lines.append("")
    standings = _compute_standings(competition)
    lines.extend(_standings_table(standings))
    lines.append("")

    # --- Section 2: Per-Codebase Breakdown ---
    lines.append("## 2. Per-Codebase Breakdown")
    lines.append("")
    codebases = sorted(set(e.get("codebase", "unknown") for e in competition))
    for cb in codebases:
        lines.append("### {}".format(cb))
        lines.append("")
        cb_entries = [e for e in competition if e.get("codebase") == cb]
        cb_standings = _compute_standings(cb_entries)
        lines.extend(_standings_table(cb_standings))
        lines.append("")

    # --- Section 3: Per-Query-Category Breakdown ---
    lines.append("## 3. Per-Query-Category Breakdown")
    lines.append("")
    categories = sorted(set(e.get("query_category", "unknown") for e in competition))
    for cat in categories:
        lines.append("### {}".format(cat))
        lines.append("")
        cat_entries = [e for e in competition if e.get("query_category") == cat]
        cat_standings = _compute_standings(cat_entries)
        lines.extend(_standings_table(cat_standings))
        lines.append("")

    # --- Section 4: Round-by-Round Details ---
    lines.append("## 4. Round-by-Round Details")
    lines.append("")
    lines.append("| Round | Competitor | Precision | Recall | Insight | Total | Calls | Time (s) | Divergence |")
    lines.append("|-------|------------|-----------|--------|---------|-------|-------|----------|------------|")

    # Sort by round_id then competitor
    all_with_scores = [e for e in entries if e.get("total") is not None and not _is_calibration(e)]
    all_with_scores.sort(key=lambda e: (e.get("round_id", ""), e.get("competitor", "")))
    for e in all_with_scores:
        lines.append("| {} | {} | {} | {} | {} | {} | {} | {} | {} |".format(
            e.get("round_id", ""),
            e.get("competitor", ""),
            e.get("precision", ""),
            e.get("recall", ""),
            e.get("insight", ""),
            e.get("total", ""),
            e.get("calls", ""),
            e.get("time_s", ""),
            e.get("divergence_signal", ""),
        ))
    lines.append("")

    # --- Section 5: Divergence Signals ---
    lines.append("## 5. Divergence Signals")
    lines.append("")

    divergences = _compute_divergence(competition)

    gray = [d for d in divergences if d["signal"] == "gray"]
    yellow = [d for d in divergences if d["signal"] == "yellow"]
    signal = [d for d in divergences if d["signal"] == "signal"]

    lines.append("### Gray (spread 0-2): query failed as discriminator")
    lines.append("")
    lines.append("| Round | Codebase | Spread |")
    lines.append("|-------|----------|--------|")
    for d in gray:
        lines.append("| {} | {} | {} |".format(d["round_id"], d["codebase"], d["spread"]))
    lines.append("")

    lines.append("### Yellow (spread 3-4): moderate discrimination")
    lines.append("")
    lines.append("| Round | Codebase | Spread |")
    lines.append("|-------|----------|--------|")
    for d in yellow:
        lines.append("| {} | {} | {} |".format(d["round_id"], d["codebase"], d["spread"]))
    lines.append("")

    lines.append("### Signal (spread 5+): strong tool difference")
    lines.append("")
    lines.append("| Round | Codebase | Spread |")
    lines.append("|-------|----------|--------|")
    for d in signal:
        lines.append("| {} | {} | {} |".format(d["round_id"], d["codebase"], d["spread"]))
    lines.append("")

    # Build stderr messages for divergences
    tier_labels = {
        "gray": "Gray",
        "yellow": "Yellow",
        "signal": "Signal",
    }
    tier_descriptions = {
        "gray": "query failed as discriminator",
        "yellow": "moderate discrimination",
        "signal": "strong tool difference",
    }
    for d in divergences:
        label = tier_labels[d["signal"]]
        desc = tier_descriptions[d["signal"]]
        msg = "[olympics:INFO] {} round: {} on {} -- spread {} ({})".format(
            label, d["round_id"], d["codebase"], d["spread"], desc)
        messages.append(msg)

    # --- Section 6: Closest Calls ---
    lines.append("## 6. Closest Calls")
    lines.append("")
    lines.append("Rounds where winning margin <= 1.")
    lines.append("")
    lines.append("| Round | Codebase | Competitors | Totals | Margin |")
    lines.append("|-------|----------|-------------|--------|--------|")

    by_round = defaultdict(list)
    for e in competition:
        by_round[e.get("round_id")].append(e)

    for rid in sorted(by_round.keys()):
        round_entries = by_round[rid]
        round_totals = [(e.get("competitor"), e.get("total")) for e in round_entries]
        totals_vals = [t for _, t in round_totals]
        if len(totals_vals) < 2:
            continue
        margin = max(totals_vals) - min(totals_vals)
        if margin <= 1:
            codebase = round_entries[0].get("codebase", "unknown")
            comps = ", ".join(c for c, _ in sorted(round_totals))
            tots = ", ".join(str(t) for _, t in sorted(round_totals))
            lines.append("| {} | {} | {} | {} | {} |".format(
                rid, codebase, comps, tots, margin))
    lines.append("")

    # --- Section 7: Dimension Totals ---
    lines.append("## 7. Dimension Totals")
    lines.append("")
    lines.append("| Competitor | Total Precision | Total Recall | Total Insight |")
    lines.append("|------------|----------------|--------------|---------------|")

    dim_totals = defaultdict(lambda: {"precision": 0, "recall": 0, "insight": 0})
    for e in competition:
        comp = e.get("competitor")
        dim_totals[comp]["precision"] += e.get("precision", 0)
        dim_totals[comp]["recall"] += e.get("recall", 0)
        dim_totals[comp]["insight"] += e.get("insight", 0)

    for comp in sorted(dim_totals.keys()):
        d = dim_totals[comp]
        lines.append("| {} | {} | {} | {} |".format(
            comp, d["precision"], d["recall"], d["insight"]))
    lines.append("")

    # --- Section 8: Bridge Rounds ---
    lines.append("## 8. Bridge Rounds")
    lines.append("")
    lines.append("| Round | Competitor | S2 Precision | S2 Recall | S2 Insight | S2 Total | S1 Precision | S1 Recall | S1 Insight |")
    lines.append("|-------|------------|-------------|----------|-----------|---------|-------------|----------|-----------|")

    bridge_entries = [e for e in entries if e.get("round_type") == "bridge"]
    bridge_entries.sort(key=lambda e: (e.get("round_id", ""), e.get("competitor", "")))
    for e in bridge_entries:
        s1 = e.get("series1_scores") or {}
        lines.append("| {} | {} | {} | {} | {} | {} | {} | {} | {} |".format(
            e.get("round_id", ""),
            e.get("competitor", ""),
            e.get("precision", ""),
            e.get("recall", ""),
            e.get("insight", ""),
            e.get("total", ""),
            s1.get("precision", ""),
            s1.get("recall", ""),
            s1.get("insight", ""),
        ))
    lines.append("")

    # --- Section 9: Calibration Rounds ---
    lines.append("## 9. Calibration Rounds")
    lines.append("")
    lines.append("*These rounds are excluded from competition standings.*")
    lines.append("")
    lines.append("| Round | Competitor | Precision | Recall | Insight | Total |")
    lines.append("|-------|------------|-----------|--------|---------|-------|")

    calibration.sort(key=lambda e: (e.get("round_id", ""), e.get("competitor", "")))
    for e in calibration:
        lines.append("| {} | {} | {} | {} | {} | {} |".format(
            e.get("round_id", ""),
            e.get("competitor", ""),
            e.get("precision", ""),
            e.get("recall", ""),
            e.get("insight", ""),
            e.get("total", ""),
        ))
    lines.append("")

    return "\n".join(lines), messages


def main():
    """Main entry point: load, dedup, generate, write."""
    data_dir = get_data_dir()
    entries = load_rounds(data_dir)
    entries = deduplicate(entries)
    markdown, messages = generate_scoreboard(entries)

    # Write SCOREBOARD.md
    scoreboard_path = os.path.join(data_dir, "SCOREBOARD.md")
    with open(scoreboard_path, "w") as f:
        f.write(markdown)

    # Print divergence messages to stderr
    for msg in messages:
        print(msg, file=sys.stderr)


if __name__ == "__main__":
    main()
