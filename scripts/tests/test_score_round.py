"""Unit tests for scripts/score-round.py"""

import json
import os
import importlib.util

import pytest

# Import the module (filename has a hyphen)
spec = importlib.util.spec_from_file_location(
    "score_round",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "score-round.py"),
)
score_round = importlib.util.module_from_spec(spec)
spec.loader.exec_module(score_round)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _default_args(**overrides):
    """Build a namespace mimicking parsed CLI args."""
    defaults = {
        "round_id": "R24",
        "competitor": "maproom",
        "precision": 4,
        "recall": 5,
        "insight": 3,
        "calls": 42,
        "time_s": 156.3,
        "codebase": "mattermost-webapp",
        "category": "flow",
        "query": "How does X work?",
        "winner": "maproom",
        "notes": "Found all paths",
        "phase": 2,
        "session_id": "test-session",
        "divergence_signal": None,
    }
    defaults.update(overrides)
    import argparse
    return argparse.Namespace(**defaults)


def _read_jsonl(path):
    """Read a JSONL file and return list of dicts."""
    lines = []
    if os.path.exists(path):
        with open(path, "r") as f:
            for raw_line in f:
                raw_line = raw_line.strip()
                if raw_line:
                    lines.append(json.loads(raw_line))
    return lines


def _run_score(args, tmp_path):
    """Run score_round with ARENA_DATA_DIR set to tmp_path."""
    os.environ["ARENA_DATA_DIR"] = str(tmp_path)
    try:
        return score_round.score_round(args)
    finally:
        del os.environ["ARENA_DATA_DIR"]


def _seed_entry(tmp_path, round_id="R24", competitor="explore", total=10, **extra):
    """Seed an existing entry into rounds.jsonl."""
    rounds_path = os.path.join(str(tmp_path), "rounds.jsonl")
    entry = {
        "schema_version": 1,
        "round_id": round_id,
        "competitor": competitor,
        "query_category": "flow",
        "query_text": "test",
        "codebase": "mattermost-webapp",
        "phase": 2,
        "round_type": "regular",
        "precision": 3,
        "recall": 4,
        "insight": 3,
        "total": total,
        "calls": 30,
        "time_s": 100.0,
        "round_winner": None,
        "judge_notes": None,
        "divergence_signal": None,
        "is_calibration": False,
        "series1_scores": None,
        "series1_baseline": None,
        "timestamp": "2026-03-23T00:00:00.000000Z",
        "session_id": "seed-session",
        "source": "score",
    }
    entry.update(extra)
    with open(rounds_path, "a") as f:
        f.write(json.dumps(entry) + "\n")


# ---------------------------------------------------------------------------
# Validation tests
# ---------------------------------------------------------------------------

class TestValidation:
    def test_valid_args_no_errors(self):
        errors = score_round.validate_args(_default_args())
        assert errors == []

    def test_invalid_round_id(self):
        errors = score_round.validate_args(_default_args(round_id="X01"))
        assert any("round_id" in e for e in errors)

    def test_invalid_round_id_no_number(self):
        errors = score_round.validate_args(_default_args(round_id="R"))
        assert any("round_id" in e for e in errors)

    def test_precision_too_low(self):
        errors = score_round.validate_args(_default_args(precision=0))
        assert any("precision" in e for e in errors)

    def test_precision_too_high(self):
        errors = score_round.validate_args(_default_args(precision=6))
        assert any("precision" in e for e in errors)

    def test_recall_too_low(self):
        errors = score_round.validate_args(_default_args(recall=0))
        assert any("recall" in e for e in errors)

    def test_insight_too_high(self):
        errors = score_round.validate_args(_default_args(insight=6))
        assert any("insight" in e for e in errors)

    def test_negative_calls(self):
        errors = score_round.validate_args(_default_args(calls=-1))
        assert any("calls" in e for e in errors)

    def test_negative_time(self):
        errors = score_round.validate_args(_default_args(time_s=-0.5))
        assert any("time_s" in e for e in errors)

    def test_invalid_category(self):
        errors = score_round.validate_args(_default_args(category="bogus"))
        assert any("category" in e for e in errors)

    def test_invalid_codebase(self):
        errors = score_round.validate_args(_default_args(codebase="rails"))
        assert any("codebase" in e for e in errors)

    def test_invalid_divergence_signal(self):
        errors = score_round.validate_args(_default_args(divergence_signal="red"))
        assert any("divergence_signal" in e for e in errors)

    def test_empty_competitor(self):
        errors = score_round.validate_args(_default_args(competitor=""))
        assert any("competitor" in e for e in errors)

    def test_validation_exits_on_error(self, tmp_path):
        args = _default_args(precision=0)
        with pytest.raises(SystemExit) as exc_info:
            _run_score(args, tmp_path)
        assert exc_info.value.code == 1


# ---------------------------------------------------------------------------
# Round type derivation
# ---------------------------------------------------------------------------

class TestRoundType:
    def test_regular(self):
        assert score_round.parse_round_type("R01") == "regular"
        assert score_round.parse_round_type("R99") == "regular"

    def test_bridge(self):
        assert score_round.parse_round_type("BR01") == "bridge"

    def test_calibration(self):
        assert score_round.parse_round_type("CAL01") == "calibration"


# ---------------------------------------------------------------------------
# Total computation
# ---------------------------------------------------------------------------

class TestTotalComputation:
    def test_total_is_sum(self, tmp_path):
        args = _default_args(precision=3, recall=4, insight=5)
        entry = _run_score(args, tmp_path)
        assert entry["total"] == 12

    def test_total_min(self, tmp_path):
        args = _default_args(precision=1, recall=1, insight=1)
        entry = _run_score(args, tmp_path)
        assert entry["total"] == 3

    def test_total_max(self, tmp_path):
        args = _default_args(precision=5, recall=5, insight=5)
        entry = _run_score(args, tmp_path)
        assert entry["total"] == 15


# ---------------------------------------------------------------------------
# Divergence signal computation
# ---------------------------------------------------------------------------

class TestDivergenceSignal:
    def test_compute_gray(self):
        assert score_round.compute_divergence_signal(0) == "gray"
        assert score_round.compute_divergence_signal(1) == "gray"
        assert score_round.compute_divergence_signal(2) == "gray"

    def test_compute_yellow(self):
        assert score_round.compute_divergence_signal(3) == "yellow"
        assert score_round.compute_divergence_signal(4) == "yellow"

    def test_compute_signal(self):
        assert score_round.compute_divergence_signal(5) == "signal"
        assert score_round.compute_divergence_signal(12) == "signal"

    def test_single_entry_no_signal(self, tmp_path):
        """First entry for a round gets null divergence_signal."""
        args = _default_args()
        entry = _run_score(args, tmp_path)
        assert entry["divergence_signal"] is None

    def test_second_entry_computes_signal(self, tmp_path):
        """Adding a second competitor computes divergence_signal."""
        # Seed explore with total=10
        _seed_entry(tmp_path, total=10)
        # Add maproom with total=12 (4+5+3), spread=2 -> gray
        args = _default_args()
        entry = _run_score(args, tmp_path)
        assert entry["divergence_signal"] == "gray"

    def test_second_entry_updates_existing(self, tmp_path):
        """Adding a second competitor updates existing entry's divergence_signal."""
        _seed_entry(tmp_path, total=10)
        args = _default_args()
        _run_score(args, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        round_entries = [e for e in lines if e["round_id"] == "R24"]
        for e in round_entries:
            assert e["divergence_signal"] == "gray"

    def test_large_spread_is_signal(self, tmp_path):
        """Spread >= 5 produces 'signal'."""
        # Seed with total=5 (1+2+2), new entry total=12 (4+5+3), spread=7
        _seed_entry(tmp_path, total=5, precision=1, recall=2, insight=2)
        args = _default_args()
        entry = _run_score(args, tmp_path)
        assert entry["divergence_signal"] == "signal"

    def test_medium_spread_is_yellow(self, tmp_path):
        """Spread 3-4 produces 'yellow'."""
        # Seed with total=9, new entry total=12, spread=3
        _seed_entry(tmp_path, total=9, precision=3, recall=3, insight=3)
        args = _default_args()
        entry = _run_score(args, tmp_path)
        assert entry["divergence_signal"] == "yellow"

    def test_explicit_override(self, tmp_path):
        """--divergence-signal overrides computation."""
        _seed_entry(tmp_path, total=10)
        args = _default_args(divergence_signal="signal")
        entry = _run_score(args, tmp_path)
        assert entry["divergence_signal"] == "signal"

    def test_override_does_not_update_existing(self, tmp_path):
        """Explicit override does not retroactively update existing entries."""
        _seed_entry(tmp_path, total=10, divergence_signal=None)
        args = _default_args(divergence_signal="signal")
        _run_score(args, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        existing = [e for e in lines if e["competitor"] == "explore"]
        assert existing[0]["divergence_signal"] is None


# ---------------------------------------------------------------------------
# Schema conformance
# ---------------------------------------------------------------------------

class TestSchemaConformance:
    def test_all_fields_present(self, tmp_path):
        entry = _run_score(_default_args(), tmp_path)
        required_fields = [
            "schema_version", "round_id", "competitor", "query_category",
            "query_text", "codebase", "phase", "round_type", "precision",
            "recall", "insight", "total", "calls", "time_s", "round_winner",
            "judge_notes", "divergence_signal", "is_calibration",
            "series1_scores", "series1_baseline", "timestamp", "session_id",
            "source",
        ]
        for field in required_fields:
            assert field in entry, "Missing field: {}".format(field)

    def test_schema_version_is_1(self, tmp_path):
        entry = _run_score(_default_args(), tmp_path)
        assert entry["schema_version"] == 1

    def test_source_is_score(self, tmp_path):
        entry = _run_score(_default_args(), tmp_path)
        assert entry["source"] == "score"

    def test_regular_round_fields(self, tmp_path):
        entry = _run_score(_default_args(), tmp_path)
        assert entry["round_type"] == "regular"
        assert entry["is_calibration"] is False
        assert entry["series1_scores"] is None
        assert entry["series1_baseline"] is None

    def test_calibration_round_fields(self, tmp_path):
        entry = _run_score(_default_args(round_id="CAL01"), tmp_path)
        assert entry["round_type"] == "calibration"
        assert entry["is_calibration"] is True

    def test_bridge_round_type(self, tmp_path):
        entry = _run_score(_default_args(round_id="BR01"), tmp_path)
        assert entry["round_type"] == "bridge"
        assert entry["is_calibration"] is False

    def test_timestamp_iso8601(self, tmp_path):
        entry = _run_score(_default_args(), tmp_path)
        assert entry["timestamp"].endswith("Z")
        # Should parse without error
        from datetime import datetime
        datetime.fromisoformat(entry["timestamp"].rstrip("Z"))

    def test_session_id_explicit(self, tmp_path):
        entry = _run_score(_default_args(session_id="my-session"), tmp_path)
        assert entry["session_id"] == "my-session"

    def test_session_id_auto(self, tmp_path):
        entry = _run_score(_default_args(session_id=None), tmp_path)
        assert entry["session_id"].startswith("manual-")

    def test_optional_fields_null_when_missing(self, tmp_path):
        args = _default_args(query=None, winner=None, notes=None)
        entry = _run_score(args, tmp_path)
        assert entry["query_text"] is None
        assert entry["round_winner"] is None
        assert entry["judge_notes"] is None


# ---------------------------------------------------------------------------
# JSONL file output
# ---------------------------------------------------------------------------

class TestFileOutput:
    def test_creates_rounds_jsonl(self, tmp_path):
        _run_score(_default_args(), tmp_path)
        rounds_path = os.path.join(str(tmp_path), "rounds.jsonl")
        assert os.path.exists(rounds_path)

    def test_appends_to_existing(self, tmp_path):
        _seed_entry(tmp_path, round_id="R23", competitor="explore")
        _run_score(_default_args(), tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 2

    def test_each_line_valid_json(self, tmp_path):
        _seed_entry(tmp_path, round_id="R24", competitor="explore")
        _run_score(_default_args(), tmp_path)
        rounds_path = os.path.join(str(tmp_path), "rounds.jsonl")
        with open(rounds_path, "r") as f:
            for raw_line in f:
                raw_line = raw_line.strip()
                if raw_line:
                    parsed = json.loads(raw_line)
                    assert isinstance(parsed, dict)

    def test_preserves_unrelated_entries(self, tmp_path):
        """Entries for other rounds are not modified."""
        _seed_entry(tmp_path, round_id="R23", competitor="explore",
                    divergence_signal="yellow")
        _seed_entry(tmp_path, round_id="R24", competitor="explore")
        _run_score(_default_args(), tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        r23 = [e for e in lines if e["round_id"] == "R23"]
        assert len(r23) == 1
        assert r23[0]["divergence_signal"] == "yellow"

    def test_data_dir_created(self, tmp_path):
        subdir = os.path.join(str(tmp_path), "nested", "data")
        os.environ["ARENA_DATA_DIR"] = subdir
        try:
            score_round.score_round(_default_args())
        finally:
            del os.environ["ARENA_DATA_DIR"]
        assert os.path.exists(os.path.join(subdir, "rounds.jsonl"))


# ---------------------------------------------------------------------------
# Atomic write safety
# ---------------------------------------------------------------------------

class TestAtomicWrite:
    def test_no_partial_writes_on_disk(self, tmp_path):
        """After scoring, no .tmp files should remain."""
        _run_score(_default_args(), tmp_path)
        tmp_files = [f for f in os.listdir(str(tmp_path)) if f.endswith(".tmp")]
        assert tmp_files == []

    def test_concurrent_rounds_no_data_loss(self, tmp_path):
        """Multiple sequential scores all persist."""
        for i in range(5):
            args = _default_args(
                round_id="R{:02d}".format(i + 30),
                competitor="maproom",
            )
            os.environ["ARENA_DATA_DIR"] = str(tmp_path)
            try:
                score_round.score_round(args)
            finally:
                del os.environ["ARENA_DATA_DIR"]
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 5


# ---------------------------------------------------------------------------
# CLI parser tests
# ---------------------------------------------------------------------------

class TestParser:
    def test_parser_builds(self):
        parser = score_round.build_parser()
        args = parser.parse_args([
            "--round-id", "R01",
            "--competitor", "maproom",
            "--precision", "4",
            "--recall", "3",
            "--insight", "5",
            "--calls", "18",
            "--time-s", "45.2",
            "--codebase", "django",
            "--category", "relationship",
        ])
        assert args.round_id == "R01"
        assert args.precision == 4
        assert args.time_s == 45.2

    def test_optional_args_default(self):
        parser = score_round.build_parser()
        args = parser.parse_args([
            "--round-id", "R01",
            "--competitor", "maproom",
            "--precision", "4",
            "--recall", "3",
            "--insight", "5",
            "--calls", "18",
            "--time-s", "45.2",
            "--codebase", "django",
            "--category", "relationship",
        ])
        assert args.query is None
        assert args.winner is None
        assert args.notes is None
        assert args.phase == 2
        assert args.session_id is None
        assert args.divergence_signal is None
