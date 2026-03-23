"""Unit tests for generate-scoreboard.py"""

import importlib.util
import json
import os
import sys
import tempfile
import unittest

# Import the module (filename has a hyphen)
spec = importlib.util.spec_from_file_location(
    "generate_scoreboard",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "generate-scoreboard.py"),
)
generate_scoreboard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generate_scoreboard)


def _make_entry(round_id="R01", competitor="maproom", precision=4, recall=4, insight=4,
                total=None, calls=18, time_s=45.0, source="score", round_type="regular",
                query_category="relationship", codebase="django", phase=1,
                divergence_signal=None, is_calibration=False, series1_scores=None,
                series1_baseline=None, round_winner=None, judge_notes=None):
    """Helper to build a valid entry dict with sensible defaults."""
    if total is None and precision is not None and recall is not None and insight is not None:
        total = precision + recall + insight
    return {
        "schema_version": 1,
        "round_id": round_id,
        "competitor": competitor,
        "query_category": query_category,
        "codebase": codebase,
        "phase": phase,
        "round_type": round_type,
        "precision": precision,
        "recall": recall,
        "insight": insight,
        "total": total,
        "calls": calls,
        "time_s": time_s,
        "round_winner": round_winner,
        "judge_notes": judge_notes,
        "divergence_signal": divergence_signal,
        "is_calibration": is_calibration,
        "series1_scores": series1_scores,
        "series1_baseline": series1_baseline,
        "timestamp": "2026-03-20T10:00:00Z",
        "session_id": "sess_test",
        "source": source,
    }


class TestLoadRounds(unittest.TestCase):
    """Tests for load_rounds()."""

    def test_empty_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "rounds.jsonl")
            with open(path, "w") as f:
                f.write("")
            result = generate_scoreboard.load_rounds(tmp)
            self.assertEqual(result, [])

    def test_missing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = generate_scoreboard.load_rounds(tmp)
            self.assertEqual(result, [])

    def test_valid_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "rounds.jsonl")
            entry = _make_entry()
            with open(path, "w") as f:
                f.write(json.dumps(entry) + "\n")
            result = generate_scoreboard.load_rounds(tmp)
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]["round_id"], "R01")

    def test_malformed_lines_skipped(self):
        """Malformed lines should be skipped with a warning."""
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "rounds.jsonl")
            entry = _make_entry()
            with open(path, "w") as f:
                f.write(json.dumps(entry) + "\n")
                f.write("NOT VALID JSON\n")
                f.write(json.dumps(_make_entry(round_id="R02")) + "\n")
            result = generate_scoreboard.load_rounds(tmp)
            self.assertEqual(len(result), 2)

    def test_blank_lines_skipped(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "rounds.jsonl")
            entry = _make_entry()
            with open(path, "w") as f:
                f.write("\n")
                f.write(json.dumps(entry) + "\n")
                f.write("\n")
            result = generate_scoreboard.load_rounds(tmp)
            self.assertEqual(len(result), 1)


class TestDeduplication(unittest.TestCase):
    """Tests for deduplicate()."""

    def test_score_preferred_over_agent(self):
        agent = _make_entry(source="agent", calls=99, time_s=99.0,
                            precision=None, recall=None, insight=None, total=None)
        score = _make_entry(source="score", calls=18, time_s=45.0)
        result = generate_scoreboard.deduplicate([agent, score])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["source"], "score")
        self.assertEqual(result[0]["calls"], 18)

    def test_score_preferred_regardless_of_order(self):
        score = _make_entry(source="score", calls=18)
        agent = _make_entry(source="agent", calls=99,
                            precision=None, recall=None, insight=None, total=None)
        result = generate_scoreboard.deduplicate([score, agent])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["source"], "score")

    def test_unique_entries_preserved(self):
        e1 = _make_entry(round_id="R01", competitor="maproom")
        e2 = _make_entry(round_id="R01", competitor="explore")
        e3 = _make_entry(round_id="R02", competitor="maproom")
        result = generate_scoreboard.deduplicate([e1, e2, e3])
        self.assertEqual(len(result), 3)

    def test_agent_only_preserved(self):
        agent = _make_entry(source="agent", calls=20,
                            precision=None, recall=None, insight=None, total=None)
        result = generate_scoreboard.deduplicate([agent])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["source"], "agent")


class TestCalibrationExclusion(unittest.TestCase):
    """Tests that calibration rounds are excluded from standings."""

    def test_calibration_excluded_from_standings(self):
        regular = _make_entry(round_id="R01", is_calibration=False)
        cal = _make_entry(round_id="CAL01", round_type="calibration", is_calibration=True)
        md, _ = generate_scoreboard.generate_scoreboard([regular, cal])
        # Section 1 should only count R01
        lines = md.split("\n")
        # Find the standings table in section 1
        in_section1 = False
        standings_rows = []
        for line in lines:
            if line.startswith("## 1."):
                in_section1 = True
                continue
            if in_section1 and line.startswith("## 2."):
                break
            if in_section1 and line.startswith("| maproom"):
                standings_rows.append(line)
        self.assertEqual(len(standings_rows), 1)
        # Total should be 12 (from R01 only), not 24
        self.assertIn("| 12 |", standings_rows[0])

    def test_calibration_in_section_9(self):
        cal = _make_entry(round_id="CAL01", round_type="calibration",
                          is_calibration=True, precision=4, recall=4, insight=3, total=11)
        md, _ = generate_scoreboard.generate_scoreboard([cal])
        self.assertIn("## 9. Calibration Rounds", md)
        self.assertIn("| CAL01 | maproom | 4 | 4 | 3 | 11 |", md)


class TestOverallStandings(unittest.TestCase):
    """Tests for overall standings computation."""

    def test_correct_totals(self):
        e1 = _make_entry(round_id="R01", competitor="maproom", total=12)
        e2 = _make_entry(round_id="R01", competitor="explore", total=9)
        e3 = _make_entry(round_id="R02", competitor="maproom", total=10)
        e4 = _make_entry(round_id="R02", competitor="explore", total=11)
        md, _ = generate_scoreboard.generate_scoreboard([e1, e2, e3, e4])
        # maproom: 22 total, explore: 20 total
        lines = md.split("\n")
        for line in lines:
            if "| maproom" in line and "## " not in line:
                # First standings table occurrence
                self.assertIn("| 22 |", line)
                break

    def test_win_loss_computation(self):
        e1 = _make_entry(round_id="R01", competitor="maproom", total=12)
        e2 = _make_entry(round_id="R01", competitor="explore", total=9)
        standings = generate_scoreboard._compute_standings([e1, e2])
        maproom = [s for s in standings if s["competitor"] == "maproom"][0]
        explore = [s for s in standings if s["competitor"] == "explore"][0]
        self.assertEqual(maproom["wins"], 1)
        self.assertEqual(maproom["losses"], 0)
        self.assertEqual(explore["wins"], 0)
        self.assertEqual(explore["losses"], 1)

    def test_tie_computation(self):
        e1 = _make_entry(round_id="R01", competitor="maproom", total=10)
        e2 = _make_entry(round_id="R01", competitor="explore", total=10)
        standings = generate_scoreboard._compute_standings([e1, e2])
        for s in standings:
            self.assertEqual(s["ties"], 1)
            self.assertEqual(s["wins"], 0)
            self.assertEqual(s["losses"], 0)

    def test_sorted_by_total_descending(self):
        e1 = _make_entry(round_id="R01", competitor="alpha", total=5)
        e2 = _make_entry(round_id="R01", competitor="beta", total=15)
        standings = generate_scoreboard._compute_standings([e1, e2])
        self.assertEqual(standings[0]["competitor"], "beta")
        self.assertEqual(standings[1]["competitor"], "alpha")


class TestPerCodebaseBreakdown(unittest.TestCase):
    """Tests for per-codebase breakdown (Section 2)."""

    def test_filtered_by_codebase(self):
        e1 = _make_entry(round_id="R01", competitor="maproom", codebase="django", total=12)
        e2 = _make_entry(round_id="R01", competitor="explore", codebase="django", total=9)
        e3 = _make_entry(round_id="R02", competitor="maproom", codebase="fastapi", total=10)
        e4 = _make_entry(round_id="R02", competitor="explore", codebase="fastapi", total=11)
        md, _ = generate_scoreboard.generate_scoreboard([e1, e2, e3, e4])
        self.assertIn("### django", md)
        self.assertIn("### fastapi", md)


class TestPerCategoryBreakdown(unittest.TestCase):
    """Tests for per-query-category breakdown (Section 3)."""

    def test_filtered_by_category(self):
        e1 = _make_entry(round_id="R01", query_category="relationship", total=12)
        e2 = _make_entry(round_id="R02", query_category="flow", total=10)
        md, _ = generate_scoreboard.generate_scoreboard([e1, e2])
        self.assertIn("### relationship", md)
        self.assertIn("### flow", md)


class TestDivergenceSignals(unittest.TestCase):
    """Tests for divergence signal computation and display."""

    def test_three_tiers_detected(self):
        e1 = _make_entry(round_id="R01", competitor="a", total=10, divergence_signal="gray")
        e2 = _make_entry(round_id="R01", competitor="b", total=9, divergence_signal="gray")
        e3 = _make_entry(round_id="R02", competitor="a", total=10, divergence_signal="yellow")
        e4 = _make_entry(round_id="R02", competitor="b", total=7, divergence_signal="yellow")
        e5 = _make_entry(round_id="R03", competitor="a", total=15, divergence_signal="signal")
        e6 = _make_entry(round_id="R03", competitor="b", total=8, divergence_signal="signal")
        md, msgs = generate_scoreboard.generate_scoreboard([e1, e2, e3, e4, e5, e6])
        self.assertIn("Gray", md)
        self.assertIn("Yellow", md)
        self.assertIn("Signal", md)
        self.assertEqual(len(msgs), 3)

    def test_absent_signal_computed_from_spread(self):
        # spread = 6 -> signal
        e1 = _make_entry(round_id="R01", competitor="a", total=12, divergence_signal=None)
        e2 = _make_entry(round_id="R01", competitor="b", total=6, divergence_signal=None)
        _, msgs = generate_scoreboard.generate_scoreboard([e1, e2])
        self.assertTrue(any("Signal round" in m for m in msgs))

    def test_boundary_spread_2_is_gray(self):
        e1 = _make_entry(round_id="R01", competitor="a", total=10, divergence_signal=None)
        e2 = _make_entry(round_id="R01", competitor="b", total=8, divergence_signal=None)
        _, msgs = generate_scoreboard.generate_scoreboard([e1, e2])
        self.assertTrue(any("Gray round" in m for m in msgs))

    def test_boundary_spread_3_is_yellow(self):
        e1 = _make_entry(round_id="R01", competitor="a", total=10, divergence_signal=None)
        e2 = _make_entry(round_id="R01", competitor="b", total=7, divergence_signal=None)
        _, msgs = generate_scoreboard.generate_scoreboard([e1, e2])
        self.assertTrue(any("Yellow round" in m for m in msgs))

    def test_boundary_spread_5_is_signal(self):
        e1 = _make_entry(round_id="R01", competitor="a", total=10, divergence_signal=None)
        e2 = _make_entry(round_id="R01", competitor="b", total=5, divergence_signal=None)
        _, msgs = generate_scoreboard.generate_scoreboard([e1, e2])
        self.assertTrue(any("Signal round" in m for m in msgs))


class TestClosestCalls(unittest.TestCase):
    """Tests for closest calls section (margin <= 1)."""

    def test_margin_1_included(self):
        e1 = _make_entry(round_id="R01", competitor="maproom", total=10, codebase="django")
        e2 = _make_entry(round_id="R01", competitor="explore", total=9, codebase="django")
        md, _ = generate_scoreboard.generate_scoreboard([e1, e2])
        self.assertIn("| R01 |", md.split("## 6.")[1].split("## 7.")[0])

    def test_margin_0_included(self):
        e1 = _make_entry(round_id="R01", competitor="maproom", total=10)
        e2 = _make_entry(round_id="R01", competitor="explore", total=10)
        md, _ = generate_scoreboard.generate_scoreboard([e1, e2])
        section6 = md.split("## 6.")[1].split("## 7.")[0]
        self.assertIn("| R01 |", section6)
        self.assertIn("| 0 |", section6)

    def test_margin_2_excluded(self):
        e1 = _make_entry(round_id="R01", competitor="maproom", total=12)
        e2 = _make_entry(round_id="R01", competitor="explore", total=10)
        md, _ = generate_scoreboard.generate_scoreboard([e1, e2])
        section6 = md.split("## 6.")[1].split("## 7.")[0]
        self.assertNotIn("| R01 |", section6)


class TestBridgeRounds(unittest.TestCase):
    """Tests for bridge rounds section (Section 8)."""

    def test_series1_scores_displayed(self):
        e = _make_entry(round_id="BR01", round_type="bridge",
                        precision=4, recall=4, insight=3, total=11,
                        series1_scores={"precision": 3, "recall": 4, "insight": 3})
        md, _ = generate_scoreboard.generate_scoreboard([e])
        section8 = md.split("## 8.")[1].split("## 9.")[0]
        self.assertIn("| BR01 | maproom | 4 | 4 | 3 | 11 | 3 | 4 | 3 |", section8)

    def test_bridge_in_competition_standings(self):
        """Bridge rounds should count in overall standings."""
        e = _make_entry(round_id="BR01", round_type="bridge", total=11)
        md, _ = generate_scoreboard.generate_scoreboard([e])
        section1 = md.split("## 1.")[1].split("## 2.")[0]
        self.assertIn("| 11 |", section1)


class TestDimensionTotals(unittest.TestCase):
    """Tests for per-dimension aggregation (Section 7)."""

    def test_per_dimension_aggregation(self):
        e1 = _make_entry(round_id="R01", competitor="maproom", precision=4, recall=3, insight=5)
        e2 = _make_entry(round_id="R02", competitor="maproom", precision=3, recall=4, insight=3)
        md, _ = generate_scoreboard.generate_scoreboard([e1, e2])
        section7 = md.split("## 7.")[1].split("## 8.")[0]
        # precision: 7, recall: 7, insight: 8
        self.assertIn("| maproom | 7 | 7 | 8 |", section7)


class TestIdempotency(unittest.TestCase):
    """Tests that running twice produces identical output."""

    def test_identical_output(self):
        entries = [
            _make_entry(round_id="R01", competitor="maproom", total=12),
            _make_entry(round_id="R01", competitor="explore", total=9),
            _make_entry(round_id="R02", competitor="maproom", total=10),
            _make_entry(round_id="R02", competitor="explore", total=11),
        ]
        md1, msgs1 = generate_scoreboard.generate_scoreboard(entries)
        md2, msgs2 = generate_scoreboard.generate_scoreboard(entries)
        self.assertEqual(md1, md2)
        self.assertEqual(msgs1, msgs2)


class TestGoldenFile(unittest.TestCase):
    """Tests that output matches the expected golden file."""

    def test_golden_file_match(self):
        test_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "..", "test-data")
        sample_path = os.path.join(test_data_dir, "sample-rounds.jsonl")
        expected_path = os.path.join(test_data_dir, "expected-scoreboard.md")

        # Load entries from sample
        entries = generate_scoreboard.load_rounds(test_data_dir)
        # Need rounds.jsonl - copy sample to tmp dir
        with tempfile.TemporaryDirectory() as tmp:
            import shutil
            shutil.copy(sample_path, os.path.join(tmp, "rounds.jsonl"))
            entries = generate_scoreboard.load_rounds(tmp)

        entries = generate_scoreboard.deduplicate(entries)
        md, _ = generate_scoreboard.generate_scoreboard(entries)

        with open(expected_path, "r") as f:
            expected = f.read()

        self.assertEqual(md, expected)


class TestStderrMessages(unittest.TestCase):
    """Tests for divergence announcement format."""

    def test_exact_format(self):
        e1 = _make_entry(round_id="R01", competitor="a", total=12,
                         codebase="django", divergence_signal="signal")
        e2 = _make_entry(round_id="R01", competitor="b", total=6,
                         codebase="django", divergence_signal="signal")
        _, msgs = generate_scoreboard.generate_scoreboard([e1, e2])
        self.assertIn(
            "[olympics:INFO] Signal round: R01 on django -- spread 6 (strong tool difference)",
            msgs)

    def test_gray_format(self):
        e1 = _make_entry(round_id="R02", competitor="a", total=10,
                         codebase="fastapi", divergence_signal="gray")
        e2 = _make_entry(round_id="R02", competitor="b", total=9,
                         codebase="fastapi", divergence_signal="gray")
        _, msgs = generate_scoreboard.generate_scoreboard([e1, e2])
        self.assertIn(
            "[olympics:INFO] Gray round: R02 on fastapi -- spread 1 (query failed as discriminator)",
            msgs)

    def test_yellow_format(self):
        e1 = _make_entry(round_id="R03", competitor="a", total=10,
                         codebase="flask", divergence_signal="yellow")
        e2 = _make_entry(round_id="R03", competitor="b", total=7,
                         codebase="flask", divergence_signal="yellow")
        _, msgs = generate_scoreboard.generate_scoreboard([e1, e2])
        self.assertIn(
            "[olympics:INFO] Yellow round: R03 on flask -- spread 3 (moderate discrimination)",
            msgs)


class TestEmptyScoreboard(unittest.TestCase):
    """Tests for empty or missing rounds.jsonl."""

    def test_missing_file_produces_valid_scoreboard(self):
        with tempfile.TemporaryDirectory() as tmp:
            entries = generate_scoreboard.load_rounds(tmp)
            md, msgs = generate_scoreboard.generate_scoreboard(entries)
            self.assertIn("# Olympics Scoreboard", md)
            self.assertIn("## 1. Overall Standings", md)
            self.assertIn("## 9. Calibration Rounds", md)
            self.assertEqual(msgs, [])

    def test_empty_file_produces_valid_scoreboard(self):
        with tempfile.TemporaryDirectory() as tmp:
            with open(os.path.join(tmp, "rounds.jsonl"), "w") as f:
                f.write("")
            entries = generate_scoreboard.load_rounds(tmp)
            md, msgs = generate_scoreboard.generate_scoreboard(entries)
            self.assertIn("# Olympics Scoreboard", md)
            self.assertEqual(msgs, [])


class TestEdgeCases(unittest.TestCase):
    """Tests for edge cases."""

    def test_single_competitor(self):
        e = _make_entry(round_id="R01", competitor="solo", total=12)
        md, _ = generate_scoreboard.generate_scoreboard([e])
        section1 = md.split("## 1.")[1].split("## 2.")[0]
        self.assertIn("| solo |", section1)

    def test_single_competitor_no_tie(self):
        """A single competitor in a round should not get a tie."""
        e = _make_entry(round_id="R01", competitor="solo", total=12)
        standings = generate_scoreboard._compute_standings([e])
        self.assertEqual(standings[0]["wins"], 1)
        self.assertEqual(standings[0]["ties"], 0)
        self.assertEqual(standings[0]["losses"], 0)

    def test_all_tied(self):
        e1 = _make_entry(round_id="R01", competitor="a", total=10)
        e2 = _make_entry(round_id="R01", competitor="b", total=10)
        e3 = _make_entry(round_id="R01", competitor="c", total=10)
        standings = generate_scoreboard._compute_standings([e1, e2, e3])
        for s in standings:
            self.assertEqual(s["ties"], 1)
            self.assertEqual(s["wins"], 0)
            self.assertEqual(s["losses"], 0)

    def test_unicode_in_fields(self):
        e = _make_entry(round_id="R01", competitor="explorateur",
                        judge_notes="Tr\u00e8s bon r\u00e9sultat")
        md, _ = generate_scoreboard.generate_scoreboard([e])
        self.assertIn("explorateur", md)

    def test_three_competitors_partial_tie(self):
        """When 2 of 3 tie for the lead, both get wins, third gets loss."""
        e1 = _make_entry(round_id="R01", competitor="a", total=10)
        e2 = _make_entry(round_id="R01", competitor="b", total=10)
        e3 = _make_entry(round_id="R01", competitor="c", total=8)
        standings = generate_scoreboard._compute_standings([e1, e2, e3])
        a = [s for s in standings if s["competitor"] == "a"][0]
        b = [s for s in standings if s["competitor"] == "b"][0]
        c = [s for s in standings if s["competitor"] == "c"][0]
        # Two tied at top: they get wins (not ties), third gets loss
        self.assertEqual(a["wins"], 1)
        self.assertEqual(b["wins"], 1)
        self.assertEqual(c["losses"], 1)

    def test_main_writes_file(self):
        """Test that main() writes SCOREBOARD.md."""
        with tempfile.TemporaryDirectory() as tmp:
            rounds_path = os.path.join(tmp, "rounds.jsonl")
            entry = _make_entry()
            with open(rounds_path, "w") as f:
                f.write(json.dumps(entry) + "\n")

            old_env = os.environ.get("OLYMPICS_DATA_DIR")
            try:
                os.environ["OLYMPICS_DATA_DIR"] = tmp
                generate_scoreboard.main()
                scoreboard_path = os.path.join(tmp, "SCOREBOARD.md")
                self.assertTrue(os.path.exists(scoreboard_path))
                with open(scoreboard_path, "r") as f:
                    content = f.read()
                self.assertIn("# Olympics Scoreboard", content)
            finally:
                if old_env is None:
                    os.environ.pop("OLYMPICS_DATA_DIR", None)
                else:
                    os.environ["OLYMPICS_DATA_DIR"] = old_env


if __name__ == "__main__":
    unittest.main()
