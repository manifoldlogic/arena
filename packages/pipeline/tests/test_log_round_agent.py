"""Unit tests for log-round.py --mode=agent"""

import json
import os
import sys
import importlib.util
from unittest.mock import patch

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


def _olympics_agent_input(round_id="R01", competitor="maproom", tool_calls=18,
                          wall_time_seconds=45.2, session_id="sess_agent123",
                          extra_text="Answer the following query about the django codebase..."):
    """Build a stdin_json dict for an Olympics agent hook payload."""
    return {
        "tool_input": "[OLYMPICS_ROUND:{}:{}] {}".format(round_id, competitor, extra_text),
        "tool_response": {
            "tool_calls": tool_calls,
            "wall_time_seconds": wall_time_seconds,
        },
        "session_id": session_id,
    }


def _non_olympics_agent_input(session_id="sess_other456"):
    """Build a stdin_json dict for a non-Olympics agent hook payload."""
    return {
        "tool_input": "Find all usages of useSelector in the codebase",
        "tool_response": {
            "result": "Found 42 usages...",
        },
        "session_id": session_id,
    }


def _run_agent(stdin_json, tmp_path):
    """Run handle_agent_mode with ARENA_DATA_DIR set to tmp_path."""
    with patch.dict(os.environ, {"ARENA_DATA_DIR": str(tmp_path)}):
        log_round.handle_agent_mode(stdin_json)


# ---------------------------------------------------------------------------
# Sentinel detection tests
# ---------------------------------------------------------------------------

class TestSentinelDetection:
    def test_happy_path_sentinel_detected(self, tmp_path):
        """tool_input with [OLYMPICS_ROUND:R01:maproom] produces 1 JSONL line."""
        stdin_json = _olympics_agent_input()
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 1
        assert lines[0]["source"] == "agent"
        assert lines[0]["round_id"] == "R01"
        assert lines[0]["competitor"] == "maproom"

    def test_sentinel_absent_exits_zero(self, tmp_path):
        """tool_input without sentinel exits with code 0, zero JSONL lines."""
        stdin_json = _non_olympics_agent_input()
        with patch.dict(os.environ, {"ARENA_DATA_DIR": str(tmp_path)}):
            with pytest.raises(SystemExit) as exc_info:
                log_round.handle_agent_mode(stdin_json)
            assert exc_info.value.code == 0
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 0

    def test_malformed_sentinel_missing_bracket(self, tmp_path):
        """Malformed sentinel (missing ]) exits with code 0, zero lines."""
        stdin_json = {
            "tool_input": "[OLYMPICS_ROUND:R01:maproom Some query text",
            "tool_response": {"tool_calls": 10, "wall_time_seconds": 20.0},
            "session_id": "sess_test",
        }
        with patch.dict(os.environ, {"ARENA_DATA_DIR": str(tmp_path)}):
            with pytest.raises(SystemExit) as exc_info:
                log_round.handle_agent_mode(stdin_json)
            assert exc_info.value.code == 0
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 0

    def test_multiple_sentinels_uses_first(self, tmp_path):
        """When multiple sentinels exist, only the first match is used."""
        stdin_json = {
            "tool_input": "[OLYMPICS_ROUND:R01:maproom] first [OLYMPICS_ROUND:R02:explore] second",
            "tool_response": {"tool_calls": 10, "wall_time_seconds": 20.0},
            "session_id": "sess_test",
        }
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 1
        assert lines[0]["round_id"] == "R01"
        assert lines[0]["competitor"] == "maproom"

    def test_bridge_round_sentinel(self, tmp_path):
        """Bridge round sentinel [OLYMPICS_ROUND:BR01:explore] extracts correctly."""
        stdin_json = _olympics_agent_input(round_id="BR01", competitor="explore")
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 1
        assert lines[0]["round_id"] == "BR01"
        assert lines[0]["competitor"] == "explore"


# ---------------------------------------------------------------------------
# Score fields null tests
# ---------------------------------------------------------------------------

class TestScoreFieldsNull:
    def test_score_fields_are_null(self, tmp_path):
        """precision, recall, insight, total must all be None in agent output."""
        stdin_json = _olympics_agent_input()
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert len(lines) == 1
        line = lines[0]
        assert line["precision"] is None
        assert line["recall"] is None
        assert line["insight"] is None
        assert line["total"] is None

    def test_query_fields_are_null(self, tmp_path):
        """query_category, query_text, codebase, phase, round_type all None."""
        stdin_json = _olympics_agent_input()
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        line = lines[0]
        assert line["query_category"] is None
        assert line["query_text"] is None
        assert line["codebase"] is None
        assert line["phase"] is None
        assert line["round_type"] is None

    def test_other_null_fields(self, tmp_path):
        """round_winner, judge_notes, divergence_signal, series1_* all None."""
        stdin_json = _olympics_agent_input()
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        line = lines[0]
        assert line["round_winner"] is None
        assert line["judge_notes"] is None
        assert line["divergence_signal"] is None
        assert line["series1_scores"] is None
        assert line["series1_baseline"] is None


# ---------------------------------------------------------------------------
# Efficiency extraction tests
# ---------------------------------------------------------------------------

class TestEfficiencyExtraction:
    def test_calls_and_time_extracted(self, tmp_path):
        """calls and time_s extracted from tool_response."""
        stdin_json = _olympics_agent_input(tool_calls=18, wall_time_seconds=45.2)
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert lines[0]["calls"] == 18
        assert lines[0]["time_s"] == 45.2

    def test_missing_efficiency_data_null_with_warning(self, tmp_path, capsys):
        """tool_response without expected fields yields null calls/time_s and stderr warning."""
        stdin_json = {
            "tool_input": "[OLYMPICS_ROUND:R01:maproom] query",
            "tool_response": {"result": "some result"},
            "session_id": "sess_test",
        }
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert lines[0]["calls"] is None
        assert lines[0]["time_s"] is None
        captured = capsys.readouterr()
        assert "Warning" in captured.err
        assert "maproom" in captured.err
        assert "R01" in captured.err

    def test_non_dict_tool_response(self, tmp_path, capsys):
        """Non-dict tool_response yields null calls/time_s."""
        stdin_json = {
            "tool_input": "[OLYMPICS_ROUND:R01:maproom] query",
            "tool_response": "some string response",
            "session_id": "sess_test",
        }
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert lines[0]["calls"] is None
        assert lines[0]["time_s"] is None
        captured = capsys.readouterr()
        assert "Warning" in captured.err


# ---------------------------------------------------------------------------
# Schema and metadata tests
# ---------------------------------------------------------------------------

class TestSchemaAndMetadata:
    def test_schema_version_is_1(self, tmp_path):
        """schema_version must be 1 on every agent line."""
        stdin_json = _olympics_agent_input()
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert lines[0]["schema_version"] == 1

    def test_session_id_passthrough(self, tmp_path):
        """session_id is passed through from stdin_json."""
        stdin_json = _olympics_agent_input(session_id="sess_unique_789")
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert lines[0]["session_id"] == "sess_unique_789"

    def test_source_is_agent(self, tmp_path):
        """source field must be 'agent'."""
        stdin_json = _olympics_agent_input()
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert lines[0]["source"] == "agent"

    def test_is_calibration_false(self, tmp_path):
        """is_calibration must be False for agent mode."""
        stdin_json = _olympics_agent_input()
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        assert lines[0]["is_calibration"] is False

    def test_timestamp_is_iso8601_utc(self, tmp_path):
        """timestamp must be ISO 8601 UTC ending in Z."""
        stdin_json = _olympics_agent_input()
        _run_agent(stdin_json, tmp_path)
        lines = _read_jsonl(os.path.join(str(tmp_path), "rounds.jsonl"))
        from datetime import datetime as dt
        ts = lines[0]["timestamp"]
        assert ts.endswith("Z")
        dt.fromisoformat(ts.rstrip("Z"))


# ---------------------------------------------------------------------------
# No scoreboard invocation test
# ---------------------------------------------------------------------------

class TestNoScoreboardInvocation:
    def test_subprocess_run_not_called(self, tmp_path):
        """Agent mode must NOT invoke generate-scoreboard.py."""
        stdin_json = _olympics_agent_input()
        with patch.dict(os.environ, {"ARENA_DATA_DIR": str(tmp_path)}):
            with patch("subprocess.run") as mock_run:
                log_round.handle_agent_mode(stdin_json)
                mock_run.assert_not_called()


# ---------------------------------------------------------------------------
# Atomic write test
# ---------------------------------------------------------------------------

class TestAtomicWrite:
    def test_single_write_call(self, tmp_path):
        """Agent mode should make a single write() call."""
        stdin_json = _olympics_agent_input()
        with patch.dict(os.environ, {"ARENA_DATA_DIR": str(tmp_path)}):
            with patch("builtins.open", wraps=open) as mock_open:
                log_round.handle_agent_mode(stdin_json)
                # Find the write calls on the file handle
                rounds_path = os.path.join(str(tmp_path), "rounds.jsonl")
                # Verify file was written and is valid JSON
                lines = _read_jsonl(rounds_path)
                assert len(lines) == 1

    def test_line_is_valid_json(self, tmp_path):
        """The written line must be valid JSON."""
        stdin_json = _olympics_agent_input()
        _run_agent(stdin_json, tmp_path)
        rounds_path = os.path.join(str(tmp_path), "rounds.jsonl")
        with open(rounds_path, "r") as f:
            raw_lines = f.readlines()
        assert len(raw_lines) == 1
        parsed = json.loads(raw_lines[0])
        assert isinstance(parsed, dict)


# ---------------------------------------------------------------------------
# ARENA_DATA_DIR env var test
# ---------------------------------------------------------------------------

class TestDataDir:
    def test_uses_env_var_for_rounds_path(self, tmp_path):
        """rounds.jsonl should be written inside the ARENA_DATA_DIR."""
        stdin_json = _olympics_agent_input()
        _run_agent(stdin_json, tmp_path)
        rounds_path = os.path.join(str(tmp_path), "rounds.jsonl")
        assert os.path.exists(rounds_path)
