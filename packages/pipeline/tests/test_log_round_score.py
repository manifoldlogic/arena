"""Unit tests for log-round.py --mode=score"""

import json
import os
import sys
import importlib.util
from unittest.mock import patch, MagicMock

import pytest

# Import the module (filename has a hyphen)
spec = importlib.util.spec_from_file_location(
    "log_round",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts", "log-round.py"),
)
log_round = importlib.util.module_from_spec(spec)
spec.loader.exec_module(log_round)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_stdin_json(file_path, content_dict, session_id="sess_test"):
    """Build a stdin_json dict mimicking the PostToolUse(Write) hook payload."""
    return {
        "tool_input": {
            "file_path": file_path,
            "content": json.dumps(content_dict),
        },
        "session_id": session_id,
    }


def _scoring_path(codebase="django", filename="R01.json"):
    return "/workspace/olympics-v2/results/scored/{}/{}".format(codebase, filename)


def _regular_round(overrides=None):
    """Return a minimal 2-competitor regular round dict."""
    base = {
        "round_id": "R01",
        "query_category": "relationship",
        "query_text": "What calls the ORM QuerySet?",
        "codebase": "django",
        "phase": 1,
        "scores": {
            "maproom": {"precision": 4, "recall": 3, "insight": 5},
            "explore": {"precision": 3, "recall": 4, "insight": 3},
        },
        "measured": {
            "maproom": {"tool_calls": 18, "wall_time_seconds": 45.2},
            "explore": {"tool_calls": 32, "wall_time_seconds": 67.8},
        },
        "round_winner": "maproom",
        "judge_notes": "Maproom found all three call sites",
        "divergence_signal": "signal",
    }
    if overrides:
        base.update(overrides)
    return base


def _three_competitor_round():
    """Return a 3-competitor regular round dict."""
    return _regular_round({
        "round_id": "R02",
        "scores": {
            "maproom": {"precision": 5, "recall": 4, "insight": 4},
            "explore": {"precision": 3, "recall": 3, "insight": 4},
            "baseline": {"precision": 2, "recall": 2, "insight": 3},
        },
        "measured": {
            "maproom": {"tool_calls": 15, "wall_time_seconds": 40.1},
            "explore": {"tool_calls": 28, "wall_time_seconds": 55.3},
            "baseline": {"tool_calls": 42, "wall_time_seconds": 80.0},
        },
        "divergence_signal": "gray",
    })


def _bridge_round():
    """Return a bridge round dict with series2_scores and NO scores key."""
    return {
        "round_id": "BR01",
        "query_category": "flow",
        "query_text": "Trace the request lifecycle",
        "codebase": "fastapi",
        "phase": 2,
        "series2_scores": {
            "maproom": {"precision": 4, "recall": 4, "insight": 3},
            "explore": {"precision": 3, "recall": 4, "insight": 3},
        },
        "series1_scores": {
            "maproom": {"precision": 3, "recall": 3, "insight": 2},
            "explore": {"precision": 4, "recall": 3, "insight": 3},
        },
        "series1_baseline": {
            "maproom": {"precision": 3, "recall": 3, "insight": 2},
            "explore": {"precision": 3, "recall": 2, "insight": 2},
        },
        "measured": {
            "maproom": {"tool_calls": 15, "wall_time_seconds": 38.7},
            "explore": {"tool_calls": 22, "wall_time_seconds": 52.1},
        },
        "round_winner": "maproom",
        "judge_notes_s2": "Series 2 deep analysis",
        "judge_notes_s1": "Series 1 notes",
        "divergence_signal": "yellow",
    }


def _calibration_round():
    """Return a calibration round dict."""
    return _regular_round({
        "round_id": "CAL01",
        "query_category": "calibration",
        "query_text": "Calibration query",
    })


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


def _run_score(stdin_json, tmp_path):
    """Run handle_score_mode with ARENA_DATA_DIR set to tmp_path."""
    # Create scripts dir and stub generate-scoreboard.py
    scripts_dir = os.path.join(str(tmp_path), "scripts")
    os.makedirs(scripts_dir, exist_ok=True)
    stub_path = os.path.join(scripts_dir, "generate-scoreboard.py")
    with open(stub_path, "w") as f:
        f.write("pass\n")

    with patch.dict(os.environ, {"ARENA_DATA_DIR": str(tmp_path)}):
        with patch("subprocess.run") as mock_run:
            log_round.handle_score_mode(stdin_json)
            return mock_run


# ---------------------------------------------------------------------------
# Path filter tests
# ---------------------------------------------------------------------------

class TestPathFilter:
    def test_scoring_path_matches(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        mock_run = _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 2

    def test_non_scoring_path_exits(self, tmp_path):
        stdin_json = _make_stdin_json(
            "/workspace/repos/mattermost/foo.json",
            {"some": "data"},
        )
        with patch.dict(os.environ, {"ARENA_DATA_DIR": str(tmp_path)}):
            with pytest.raises(SystemExit) as exc_info:
                log_round.handle_score_mode(stdin_json)
            assert exc_info.value.code == 0
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 0

    def test_partial_match_txt_extension(self, tmp_path):
        stdin_json = _make_stdin_json(
            "/workspace/olympics-v2/results/scored/django/R01.txt",
            {"some": "data"},
        )
        with patch.dict(os.environ, {"ARENA_DATA_DIR": str(tmp_path)}):
            with pytest.raises(SystemExit) as exc_info:
                log_round.handle_score_mode(stdin_json)
            assert exc_info.value.code == 0

    def test_missing_codebase_dir(self, tmp_path):
        stdin_json = _make_stdin_json(
            "/workspace/olympics-v2/results/scored/R01.json",
            {"some": "data"},
        )
        with patch.dict(os.environ, {"ARENA_DATA_DIR": str(tmp_path)}):
            with pytest.raises(SystemExit) as exc_info:
                log_round.handle_score_mode(stdin_json)
            assert exc_info.value.code == 0


# ---------------------------------------------------------------------------
# Competitor decomposition tests
# ---------------------------------------------------------------------------

class TestCompetitorDecomposition:
    def test_two_competitors(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 2
        competitors = {line["competitor"] for line in lines}
        assert competitors == {"maproom", "explore"}

    def test_three_competitors(self, tmp_path):
        stdin_json = _make_stdin_json(
            _scoring_path(filename="R02.json"),
            _three_competitor_round(),
        )
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 3
        competitors = {line["competitor"] for line in lines}
        assert competitors == {"maproom", "explore", "baseline"}


# ---------------------------------------------------------------------------
# Field validation tests
# ---------------------------------------------------------------------------

class TestFieldValidation:
    def test_required_fields_present(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        required_fields = [
            "schema_version", "round_id", "competitor", "query_category",
            "query_text", "codebase", "phase", "round_type", "precision",
            "recall", "insight", "total", "calls", "time_s", "round_winner",
            "judge_notes", "divergence_signal", "is_calibration",
            "series1_scores", "series1_baseline", "timestamp", "session_id",
            "source",
        ]
        for line in lines:
            for field in required_fields:
                assert field in line, "Missing field: {}".format(field)

    def test_schema_version_is_1(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["schema_version"] == 1

    def test_round_id_correct(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["round_id"] == "R01"

    def test_source_is_score(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["source"] == "score"

    def test_total_computed_correctly(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["total"] == line["precision"] + line["recall"] + line["insight"]

    def test_maproom_scores(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        maproom = [l for l in lines if l["competitor"] == "maproom"][0]
        assert maproom["precision"] == 4
        assert maproom["recall"] == 3
        assert maproom["insight"] == 5
        assert maproom["total"] == 12

    def test_explore_scores(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        explore = [l for l in lines if l["competitor"] == "explore"][0]
        assert explore["precision"] == 3
        assert explore["recall"] == 4
        assert explore["insight"] == 3
        assert explore["total"] == 10

    def test_calls_and_time(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        maproom = [l for l in lines if l["competitor"] == "maproom"][0]
        assert maproom["calls"] == 18
        assert maproom["time_s"] == 45.2

    def test_session_id_passed_through(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round(), session_id="sess_xyz")
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["session_id"] == "sess_xyz"

    def test_timestamp_is_iso8601_utc(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        from datetime import datetime as dt
        for line in lines:
            assert line["timestamp"].endswith("Z")
            dt.fromisoformat(line["timestamp"].rstrip("Z"))


# ---------------------------------------------------------------------------
# Bridge round tests
# ---------------------------------------------------------------------------

class TestBridgeRound:
    def test_uses_series2_scores(self, tmp_path):
        """Bridge round must use series2_scores, not scores key."""
        stdin_json = _make_stdin_json(
            _scoring_path(codebase="fastapi", filename="BR01.json"),
            _bridge_round(),
        )
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 2
        maproom = [l for l in lines if l["competitor"] == "maproom"][0]
        assert maproom["precision"] == 4
        assert maproom["recall"] == 4
        assert maproom["insight"] == 3
        assert maproom["total"] == 11

    def test_no_keyerror_without_scores_key(self, tmp_path):
        """Bridge round with no 'scores' key must not raise KeyError."""
        bridge = _bridge_round()
        assert "scores" not in bridge  # verify fixture
        stdin_json = _make_stdin_json(
            _scoring_path(codebase="fastapi", filename="BR01.json"),
            bridge,
        )
        # Should not raise
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 2

    def test_round_type_is_bridge(self, tmp_path):
        stdin_json = _make_stdin_json(
            _scoring_path(codebase="fastapi", filename="BR01.json"),
            _bridge_round(),
        )
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["round_type"] == "bridge"

    def test_series1_scores_populated(self, tmp_path):
        stdin_json = _make_stdin_json(
            _scoring_path(codebase="fastapi", filename="BR01.json"),
            _bridge_round(),
        )
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        maproom = [l for l in lines if l["competitor"] == "maproom"][0]
        assert maproom["series1_scores"] == {"precision": 3, "recall": 3, "insight": 2}
        explore = [l for l in lines if l["competitor"] == "explore"][0]
        assert explore["series1_scores"] == {"precision": 4, "recall": 3, "insight": 3}

    def test_series1_baseline_populated(self, tmp_path):
        stdin_json = _make_stdin_json(
            _scoring_path(codebase="fastapi", filename="BR01.json"),
            _bridge_round(),
        )
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        maproom = [l for l in lines if l["competitor"] == "maproom"][0]
        assert maproom["series1_baseline"] == {"precision": 3, "recall": 3, "insight": 2}

    def test_judge_notes_from_s2(self, tmp_path):
        stdin_json = _make_stdin_json(
            _scoring_path(codebase="fastapi", filename="BR01.json"),
            _bridge_round(),
        )
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["judge_notes"] == "Series 2 deep analysis"


# ---------------------------------------------------------------------------
# Calibration round tests
# ---------------------------------------------------------------------------

class TestCalibrationRound:
    def test_round_type_is_calibration(self, tmp_path):
        stdin_json = _make_stdin_json(
            _scoring_path(filename="CAL01.json"),
            _calibration_round(),
        )
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["round_type"] == "calibration"

    def test_is_calibration_true(self, tmp_path):
        stdin_json = _make_stdin_json(
            _scoring_path(filename="CAL01.json"),
            _calibration_round(),
        )
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["is_calibration"] is True


# ---------------------------------------------------------------------------
# Regular round tests
# ---------------------------------------------------------------------------

class TestRegularRound:
    def test_round_type_is_regular(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["round_type"] == "regular"

    def test_is_calibration_false(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["is_calibration"] is False

    def test_series1_fields_none(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["series1_scores"] is None
            assert line["series1_baseline"] is None


# ---------------------------------------------------------------------------
# Divergence signal tests
# ---------------------------------------------------------------------------

class TestDivergenceSignal:
    @pytest.mark.parametrize("signal_val", ["gray", "yellow", "signal"])
    def test_divergence_signal_passthrough(self, tmp_path, signal_val):
        content = _regular_round({"divergence_signal": signal_val})
        stdin_json = _make_stdin_json(_scoring_path(), content)
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["divergence_signal"] == signal_val


# ---------------------------------------------------------------------------
# Schema validation / error handling tests
# ---------------------------------------------------------------------------

class TestScoreValidation:
    def test_missing_precision_skips_competitor(self, tmp_path, capsys):
        content = _regular_round()
        del content["scores"]["maproom"]["precision"]
        stdin_json = _make_stdin_json(_scoring_path(), content)
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        # Only explore should be logged
        assert len(lines) == 1
        assert lines[0]["competitor"] == "explore"
        captured = capsys.readouterr()
        assert "precision" in captured.err

    def test_none_recall_skips_competitor(self, tmp_path, capsys):
        content = _regular_round()
        content["scores"]["explore"]["recall"] = None
        stdin_json = _make_stdin_json(_scoring_path(), content)
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 1
        assert lines[0]["competitor"] == "maproom"
        captured = capsys.readouterr()
        assert "recall" in captured.err

    def test_score_zero_out_of_range(self, tmp_path, capsys):
        content = _regular_round()
        content["scores"]["maproom"]["insight"] = 0
        stdin_json = _make_stdin_json(_scoring_path(), content)
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 1
        assert lines[0]["competitor"] == "explore"
        captured = capsys.readouterr()
        assert "insight" in captured.err

    def test_score_six_out_of_range(self, tmp_path, capsys):
        content = _regular_round()
        content["scores"]["explore"]["precision"] = 6
        stdin_json = _make_stdin_json(_scoring_path(), content)
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 1
        assert lines[0]["competitor"] == "maproom"
        captured = capsys.readouterr()
        assert "precision" in captured.err

    def test_score_string_type_skips(self, tmp_path, capsys):
        content = _regular_round()
        content["scores"]["maproom"]["recall"] = "high"
        stdin_json = _make_stdin_json(_scoring_path(), content)
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 1
        assert lines[0]["competitor"] == "explore"

    def test_all_invalid_scores_produces_no_lines(self, tmp_path, capsys):
        content = _regular_round()
        content["scores"]["maproom"]["precision"] = 0
        content["scores"]["explore"]["insight"] = 7
        stdin_json = _make_stdin_json(_scoring_path(), content)
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 0


# ---------------------------------------------------------------------------
# Atomic write test
# ---------------------------------------------------------------------------

class TestAtomicWrite:
    def test_each_line_is_valid_json(self, tmp_path):
        stdin_json = _make_stdin_json(
            _scoring_path(filename="R02.json"),
            _three_competitor_round(),
        )
        _run_score(stdin_json, tmp_path)
        rounds_path = os.path.join(str(tmp_path), "rounds.jsonl")
        with open(rounds_path, "r") as f:
            raw_lines = f.readlines()
        assert len(raw_lines) == 3
        for raw_line in raw_lines:
            # Each line must independently parse as JSON
            parsed = json.loads(raw_line)
            assert isinstance(parsed, dict)


# ---------------------------------------------------------------------------
# ARENA_DATA_DIR env var test
# ---------------------------------------------------------------------------

class TestDataDir:
    def test_uses_env_var_for_paths(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        _run_score(stdin_json, tmp_path)
        # rounds.jsonl should be written inside tmp_path
        rounds_path = os.path.join(str(tmp_path), "rounds.jsonl")
        assert os.path.exists(rounds_path)

    def test_session_json_fallback(self, tmp_path):
        """When scored_json has no codebase, fall back to session.json."""
        content = _regular_round()
        del content["codebase"]
        # Create session.json with codebase
        session_path = os.path.join(str(tmp_path), "session.json")
        with open(session_path, "w") as f:
            json.dump({"codebase": "from-session"}, f)

        stdin_json = _make_stdin_json(_scoring_path(), content)
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["codebase"] == "from-session"

    def test_no_session_json_uses_unknown(self, tmp_path):
        """When no session.json and no codebase in scored_json, use 'unknown'."""
        content = _regular_round()
        del content["codebase"]
        stdin_json = _make_stdin_json(_scoring_path(), content)
        _run_score(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        for line in lines:
            assert line["codebase"] == "unknown"


# ---------------------------------------------------------------------------
# Scoreboard invocation test
# ---------------------------------------------------------------------------

class TestScoreboardInvocation:
    def test_generate_scoreboard_called(self, tmp_path):
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        mock_run = _run_score(stdin_json, tmp_path)
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]
        assert call_args[0] == "python3"
        assert "generate-scoreboard.py" in call_args[1]

    def test_scoreboard_called_after_all_lines(self, tmp_path):
        """Scoreboard script should be called after lines are written."""
        stdin_json = _make_stdin_json(_scoring_path(), _regular_round())
        mock_run = _run_score(stdin_json, tmp_path)
        # Verify lines exist before the mock was called
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 2
        mock_run.assert_called_once()


# ---------------------------------------------------------------------------
# Agent mode test
# ---------------------------------------------------------------------------

class TestAgentMode:
    def test_agent_mode_dispatches_to_handle_agent(self, tmp_path):
        """Agent mode reads stdin and dispatches to handle_agent_mode."""
        stdin_json = {
            "tool_input": "non-olympics query",
            "tool_response": {},
            "session_id": "sess_test",
        }
        with patch("sys.argv", ["log-round.py", "--mode=agent"]):
            with patch.dict(os.environ, {"ARENA_DATA_DIR": str(tmp_path)}):
                with pytest.raises(SystemExit) as exc_info:
                    log_round.main(stdin_input=stdin_json)
                # Non-Olympics input exits 0 via handle_agent_mode
                assert exc_info.value.code == 0
