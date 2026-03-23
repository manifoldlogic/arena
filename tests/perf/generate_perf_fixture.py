#!/usr/bin/env python3
"""Generate perf-1000-rounds.jsonl for performance benchmarking.

Produces 500 rounds x 2 competitors = 1000 entries.
Seeded PRNG (seed=42) for deterministic output.
Distributes across 3 codebases, 8 categories, varied scores.
"""

import json
import random
import sys
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent.parent / "packages" / "pipeline" / "tests" / "fixtures"
OUTPUT_PATH = OUTPUT_DIR / "perf-1000-rounds.jsonl"

CODEBASES = ["mattermost-webapp", "django", "fastapi"]
CATEGORIES = ["flow", "pattern", "relationship", "boundary",
              "lifecycle", "error-handling", "config", "performance"]
COMPETITORS = ["alpha", "beta"]

SEED = 42


def generate():
    random.seed(SEED)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    entries = []
    for round_num in range(1, 501):
        round_id = f"R{round_num:04d}"
        codebase = CODEBASES[round_num % len(CODEBASES)]
        category = CATEGORIES[round_num % len(CATEGORIES)]

        # Determine round winner based on scores
        scores = {}
        for comp in COMPETITORS:
            p = random.randint(2, 5)
            r = random.randint(2, 5)
            i = random.randint(1, 5)
            total = p + r + i
            calls = random.randint(3, 20)
            time_s = round(random.uniform(15.0, 120.0), 1)
            scores[comp] = total

            entries.append({
                "schema_version": 1,
                "round_id": round_id,
                "competitor": comp,
                "round_type": "regular",
                "codebase": codebase,
                "phase": 1,
                "query_category": category,
                "precision": p,
                "recall": r,
                "insight": i,
                "total": total,
                "calls": calls,
                "time_s": time_s,
                "source": "score",
                "round_winner": None,  # Set below
                "is_calibration": False,
                "timestamp": f"2026-01-{(round_num % 28) + 1:02d}T{(round_num % 12) + 8:02d}:00:00Z",
                "session_id": f"S{(round_num // 10) + 1:04d}",
            })

        # Determine winner
        max_score = max(scores.values())
        winners = [c for c, s in scores.items() if s == max_score]
        winner = None if len(winners) > 1 else winners[0]

        # Update round_winner for both entries
        for entry in entries[-len(COMPETITORS):]:
            entry["round_winner"] = winner

    with open(OUTPUT_PATH, "w") as f:
        for entry in entries:
            f.write(json.dumps(entry) + "\n")

    print(f"Generated {len(entries)} entries ({len(entries) // 2} rounds) to {OUTPUT_PATH}")


if __name__ == "__main__":
    generate()
