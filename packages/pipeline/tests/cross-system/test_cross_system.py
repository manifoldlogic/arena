#!/usr/bin/env python3
"""Cross-system consistency tests.

Loads consistency-test-rounds.jsonl, computes standings via the same Python
logic used to generate the golden file, and asserts results match
consistency-expected.json.

This validates that:
  1. The golden file is self-consistent with the Python implementation
  2. All 16 edge cases produce expected outcomes
  3. Deduplication, calibration exclusion, and agent-only filtering work correctly
"""

import json
import pytest
from pathlib import Path

# Import the standings computation functions from the generator
from generate_golden import (
    load_rounds,
    deduplicate,
    _scorable_entries,
    _compute_standings,
    _compute_divergences,
    _compute_closest_calls,
    _compute_dimension_totals,
    _group_by,
)

FIXTURE_DIR = Path(__file__).parent
FIXTURE_PATH = FIXTURE_DIR / "consistency-test-rounds.jsonl"
GOLDEN_PATH = FIXTURE_DIR / "consistency-expected.json"


@pytest.fixture(scope="module")
def raw_entries():
    return load_rounds(FIXTURE_PATH)


@pytest.fixture(scope="module")
def entries(raw_entries):
    return deduplicate(raw_entries)


@pytest.fixture(scope="module")
def expected():
    with open(GOLDEN_PATH) as f:
        return json.load(f)


class TestMetadata:
    def test_raw_entry_count(self, raw_entries, expected):
        assert len(raw_entries) == expected["metadata"]["total_raw_entries"]

    def test_dedup_count(self, entries, expected):
        assert len(entries) == expected["metadata"]["total_after_dedup"]

    def test_scorable_count(self, entries, expected):
        scorable = _scorable_entries(entries)
        assert len(scorable) == expected["metadata"]["total_scorable"]


class TestDeduplication:
    def test_agent_entry_removed_for_r09_alpha(self, entries):
        """R09 alpha has both agent and score entries; only score should remain."""
        r09_alpha = [e for e in entries if e["round_id"] == "R09" and e["competitor"] == "alpha"]
        assert len(r09_alpha) == 1
        assert r09_alpha[0]["source"] == "score"
        assert r09_alpha[0]["total"] == 11

    def test_agent_only_entry_preserved(self, entries):
        """R10 gamma is agent-only; should survive dedup but be excluded from standings."""
        r10_gamma = [e for e in entries if e["round_id"] == "R10" and e["competitor"] == "gamma"]
        assert len(r10_gamma) == 1
        assert r10_gamma[0]["source"] == "agent"
        assert r10_gamma[0].get("total") is None


class TestCalibrationExclusion:
    def test_calibration_excluded_from_scorable(self, entries):
        """R08 is calibration; should not appear in scorable entries."""
        scorable = _scorable_entries(entries)
        cal_entries = [e for e in scorable if e["round_id"] == "R08"]
        assert len(cal_entries) == 0

    def test_calibration_not_in_standings(self, entries, expected):
        """Calibration round scores should not affect overall totals."""
        standings = _compute_standings(entries)
        # alpha has R08 total=9 which should NOT be included
        alpha = next(s for s in standings if s["competitor"] == "alpha")
        expected_alpha = next(s for s in expected["overall"] if s["competitor"] == "alpha")
        assert alpha["total"] == expected_alpha["total"]


class TestOverallStandings:
    def test_standings_match_golden(self, entries, expected):
        standings = _compute_standings(entries)
        assert standings == expected["overall"]

    def test_alpha_wins_most(self, entries):
        standings = _compute_standings(entries)
        alpha = next(s for s in standings if s["competitor"] == "alpha")
        assert alpha["wins"] == 10
        assert alpha["ties"] == 3
        assert alpha["losses"] == 1

    def test_gamma_limited_rounds(self, entries):
        standings = _compute_standings(entries)
        gamma = next(s for s in standings if s["competitor"] == "gamma")
        assert gamma["rounds"] == 2

    def test_sorted_by_total_desc(self, entries):
        standings = _compute_standings(entries)
        totals = [s["total"] for s in standings]
        assert totals == sorted(totals, reverse=True)


class TestByCodebase:
    def test_all_codebases_present(self, entries, expected):
        scorable = _scorable_entries(entries)
        by_codebase_groups = _group_by(scorable, lambda e: e["codebase"])
        by_codebase = {}
        for cb in sorted(by_codebase_groups.keys()):
            by_codebase[cb] = _compute_standings(by_codebase_groups[cb])
        assert set(by_codebase.keys()) == set(expected["by_codebase"].keys())

    def test_django_standings(self, entries, expected):
        scorable = _scorable_entries(entries)
        django = [e for e in scorable if e["codebase"] == "django"]
        standings = _compute_standings(django)
        assert standings == expected["by_codebase"]["django"]

    def test_fastapi_standings(self, entries, expected):
        scorable = _scorable_entries(entries)
        fastapi = [e for e in scorable if e["codebase"] == "fastapi"]
        standings = _compute_standings(fastapi)
        assert standings == expected["by_codebase"]["fastapi"]

    def test_mattermost_standings(self, entries, expected):
        scorable = _scorable_entries(entries)
        mm = [e for e in scorable if e["codebase"] == "mattermost-webapp"]
        standings = _compute_standings(mm)
        assert standings == expected["by_codebase"]["mattermost-webapp"]


class TestByCategory:
    def test_all_categories_present(self, entries, expected):
        scorable = _scorable_entries(entries)
        by_cat_groups = _group_by(scorable, lambda e: e.get("query_category", "unknown"))
        by_cat = {}
        for cat in sorted(by_cat_groups.keys()):
            by_cat[cat] = _compute_standings(by_cat_groups[cat])
        assert set(by_cat.keys()) == set(expected["by_category"].keys())

    def test_each_category_matches_golden(self, entries, expected):
        scorable = _scorable_entries(entries)
        by_cat_groups = _group_by(scorable, lambda e: e.get("query_category", "unknown"))
        for cat, expected_standings in expected["by_category"].items():
            computed = _compute_standings(by_cat_groups[cat])
            assert computed == expected_standings, f"Category {cat} mismatch"


class TestDivergences:
    def test_divergences_match_golden(self, entries, expected):
        divergences = _compute_divergences(entries)
        assert divergences == expected["divergences"]

    def test_gray_spread_2(self, entries):
        divergences = _compute_divergences(entries)
        gray = [d for d in divergences if d["divergence_signal"] == "gray"]
        assert len(gray) == 1
        assert gray[0]["round_id"] == "R11"
        assert gray[0]["spread"] == 2

    def test_yellow_spread_3_and_4(self, entries):
        divergences = _compute_divergences(entries)
        yellow = [d for d in divergences if d["divergence_signal"] == "yellow"]
        assert len(yellow) == 2
        spreads = sorted([d["spread"] for d in yellow])
        assert spreads == [3, 4]

    def test_signal_spread_5_boundary(self, entries):
        divergences = _compute_divergences(entries)
        signal = [d for d in divergences if d["divergence_signal"] == "signal"]
        assert len(signal) == 2
        spreads = sorted([d["spread"] for d in signal])
        assert spreads == [5, 7]

    def test_no_divergence_on_unmarked_rounds(self, entries):
        divergences = _compute_divergences(entries)
        round_ids = {d["round_id"] for d in divergences}
        # R01, R02, etc. have no divergence_signal and should not appear
        assert "R01" not in round_ids
        assert "R02" not in round_ids


class TestClosestCalls:
    def test_closest_calls_match_golden(self, entries, expected):
        closest = _compute_closest_calls(entries)
        assert closest == expected["closest_calls"]

    def test_margin_zero_ties(self, entries):
        closest = _compute_closest_calls(entries)
        zero_margin = [c for c in closest if c["margin"] == 0]
        assert len(zero_margin) == 3  # R03, R04, R05

    def test_margin_one_closest(self, entries):
        closest = _compute_closest_calls(entries)
        one_margin = [c for c in closest if c["margin"] == 1]
        assert len(one_margin) == 1
        assert one_margin[0]["round_id"] == "R15"

    def test_single_competitor_excluded(self, entries):
        """R06 has only one competitor; should not appear in closest calls."""
        closest = _compute_closest_calls(entries)
        round_ids = {c["round_id"] for c in closest}
        assert "R06" not in round_ids


class TestDimensionTotals:
    def test_dimension_totals_match_golden(self, entries, expected):
        dims = _compute_dimension_totals(entries)
        assert dims == expected["dimension_totals"]

    def test_alpha_dimensions(self, entries):
        dims = _compute_dimension_totals(entries)
        assert dims["alpha"]["precision"] == 60
        assert dims["alpha"]["recall"] == 59
        assert dims["alpha"]["insight"] == 54

    def test_gamma_dimensions_from_scored_only(self, entries):
        """Gamma's R10 (agent-only) should not contribute to dimension totals."""
        dims = _compute_dimension_totals(entries)
        # Gamma only has R04 (p=5,r=5,i=5) and R05 (p=3,r=3,i=3) as scorable
        assert dims["gamma"]["precision"] == 8
        assert dims["gamma"]["recall"] == 8
        assert dims["gamma"]["insight"] == 8


class TestEdgeCases:
    """Verify each of the 16 edge cases is covered."""

    def test_r01_normal_win_alpha(self, entries):
        """EC1: Normal 2-competitor round, alpha wins."""
        scorable = _scorable_entries(entries)
        r01 = [e for e in scorable if e["round_id"] == "R01"]
        assert len(r01) == 2
        totals = {e["competitor"]: e["total"] for e in r01}
        assert totals["alpha"] > totals["beta"]

    def test_r02_normal_win_beta(self, entries):
        """EC2: Normal 2-competitor round, beta wins."""
        scorable = _scorable_entries(entries)
        r02 = [e for e in scorable if e["round_id"] == "R02"]
        totals = {e["competitor"]: e["total"] for e in r02}
        assert totals["beta"] > totals["alpha"]

    def test_r03_two_way_tie(self, entries):
        """EC3: 2-competitor all-tie."""
        scorable = _scorable_entries(entries)
        r03 = [e for e in scorable if e["round_id"] == "R03"]
        totals = [e["total"] for e in r03]
        assert len(set(totals)) == 1

    def test_r04_three_way_tie(self, entries):
        """EC4: 3-competitor all-tie."""
        scorable = _scorable_entries(entries)
        r04 = [e for e in scorable if e["round_id"] == "R04"]
        assert len(r04) == 3
        totals = [e["total"] for e in r04]
        assert len(set(totals)) == 1

    def test_r05_partial_tie(self, entries):
        """EC5: 3 competitors, 2 tied at top, 1 lower."""
        scorable = _scorable_entries(entries)
        r05 = [e for e in scorable if e["round_id"] == "R05"]
        assert len(r05) == 3
        totals = sorted([e["total"] for e in r05], reverse=True)
        assert totals[0] == totals[1]  # top 2 tied
        assert totals[1] > totals[2]   # third is lower

    def test_r06_single_competitor(self, entries):
        """EC6: Single competitor round."""
        scorable = _scorable_entries(entries)
        r06 = [e for e in scorable if e["round_id"] == "R06"]
        assert len(r06) == 1

    def test_r07_bridge_round(self, entries):
        """EC7: Bridge round with series1_scores and series1_baseline."""
        scorable = _scorable_entries(entries)
        r07 = [e for e in scorable if e["round_id"] == "R07"]
        assert len(r07) == 2
        assert all(e["round_type"] == "bridge" for e in r07)
        assert all("series1_scores" in e for e in r07)

    def test_r08_calibration(self, raw_entries):
        """EC8: Calibration round excluded from standings."""
        r08 = [e for e in raw_entries if e["round_id"] == "R08"]
        assert len(r08) == 2
        assert all(e["is_calibration"] for e in r08)

    def test_r09_dedup(self, raw_entries, entries):
        """EC9: Agent+score dedup — score entry kept."""
        raw_r09_alpha = [e for e in raw_entries if e["round_id"] == "R09" and e["competitor"] == "alpha"]
        assert len(raw_r09_alpha) == 2
        dedup_r09_alpha = [e for e in entries if e["round_id"] == "R09" and e["competitor"] == "alpha"]
        assert len(dedup_r09_alpha) == 1
        assert dedup_r09_alpha[0]["source"] == "score"

    def test_r10_agent_only(self, entries):
        """EC10: Agent-only entry with null total."""
        r10 = [e for e in entries if e["round_id"] == "R10"]
        assert len(r10) == 1
        assert r10[0]["source"] == "agent"
        assert r10[0].get("total") is None

    def test_r11_divergence_gray_spread2(self, entries):
        """EC11: Divergence gray with spread=2."""
        scorable = _scorable_entries(entries)
        r11 = [e for e in scorable if e["round_id"] == "R11"]
        assert all(e.get("divergence_signal") == "gray" for e in r11)
        totals = [e["total"] for e in r11]
        assert max(totals) - min(totals) == 2

    def test_r12_divergence_yellow_spread3(self, entries):
        """EC12: Divergence yellow with spread=3."""
        scorable = _scorable_entries(entries)
        r12 = [e for e in scorable if e["round_id"] == "R12"]
        totals = [e["total"] for e in r12]
        assert max(totals) - min(totals) == 3

    def test_r13_divergence_yellow_spread4(self, entries):
        """EC13: Divergence yellow with spread=4."""
        scorable = _scorable_entries(entries)
        r13 = [e for e in scorable if e["round_id"] == "R13"]
        totals = [e["total"] for e in r13]
        assert max(totals) - min(totals) == 4

    def test_r14_divergence_signal_spread5(self, entries):
        """EC14: Divergence signal with spread=5 (boundary)."""
        scorable = _scorable_entries(entries)
        r14 = [e for e in scorable if e["round_id"] == "R14"]
        assert all(e.get("divergence_signal") == "signal" for e in r14)
        totals = [e["total"] for e in r14]
        assert max(totals) - min(totals) == 5

    def test_r15_closest_call_margin1(self, entries):
        """EC15: Closest call with margin=1."""
        scorable = _scorable_entries(entries)
        r15 = [e for e in scorable if e["round_id"] == "R15"]
        totals = sorted([e["total"] for e in r15], reverse=True)
        assert totals[0] - totals[1] == 1

    def test_r16_divergence_signal_spread7(self, entries):
        """EC16: Divergence signal with spread=7."""
        scorable = _scorable_entries(entries)
        r16 = [e for e in scorable if e["round_id"] == "R16"]
        assert all(e.get("divergence_signal") == "signal" for e in r16)
        totals = [e["total"] for e in r16]
        assert max(totals) - min(totals) == 7
