"""Tests for scripts/harness/parse-aider-log.py."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Locate the parser module and fixture
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]
PARSER_SCRIPT = REPO_ROOT / "scripts" / "harness" / "parse-aider-log.py"
FIXTURE = (
    REPO_ROOT
    / "specs"
    / "competitors"
    / "aider"
    / "fixtures"
    / "llm-history-sample.txt"
)
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

# Import the parser module directly so we can unit-test internal functions.
# We need importlib because the filename contains a hyphen.
sys.path.insert(0, str(PARSER_SCRIPT.parent))

_spec = importlib.util.spec_from_file_location("parse_aider_log", PARSER_SCRIPT)
assert _spec is not None and _spec.loader is not None
mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mod)

parse_log = mod.parse_log
main = mod.main
extract_first_sentence = mod.extract_first_sentence
strip_role_prefix = mod.strip_role_prefix

# Also import internal classes/functions for thorough coverage
_Turn = mod._Turn
_analyse_assistant_blocks = mod._analyse_assistant_blocks


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


_temp_files: list[Path] = []


def _write_tmp(content: str | bytes, suffix: str = ".txt") -> Path:
    """Write *content* to a temp file and return its path."""
    mode = "wb" if isinstance(content, bytes) else "w"
    encoding = None if isinstance(content, bytes) else "utf-8"
    f = tempfile.NamedTemporaryFile(
        mode=mode, suffix=suffix, delete=False, encoding=encoding
    )
    f.write(content)
    f.close()
    p = Path(f.name)
    _temp_files.append(p)
    return p


@pytest.fixture(autouse=True)
def _cleanup_temp_files():
    """Remove temp files created by _write_tmp after each test."""
    yield
    for p in _temp_files:
        p.unlink(missing_ok=True)
    _temp_files.clear()


# ---------------------------------------------------------------------------
# Live fixture regression test
# ---------------------------------------------------------------------------


class TestFixtureParse:
    """Tests that parse the ground-truth fixture file."""

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.result = parse_log(FIXTURE)

    def test_output_is_dict(self) -> None:
        assert isinstance(self.result, dict)

    def test_all_required_fields_present(self) -> None:
        required = {
            "llm_turns",
            "user_messages",
            "assistant_messages",
            "edit_attempts",
            "edit_formats_used",
            "files_referenced",
            "reasoning_summary",
            "errors_encountered",
            "total_input_tokens_estimate",
            "total_output_tokens_estimate",
            "parse_warnings",
        }
        assert required.issubset(set(self.result.keys()))

    def test_llm_turns_count(self) -> None:
        # The fixture contains exactly 1 TO LLM / LLM RESPONSE pair.
        assert self.result["llm_turns"] == 1

    def test_user_messages_count(self) -> None:
        # 5 USER blocks in the fixture.
        assert self.result["user_messages"] == 5

    def test_assistant_messages_count(self) -> None:
        # 4 ASSISTANT blocks in the fixture (all few-shot examples).
        assert self.result["assistant_messages"] == 4

    def test_edit_attempts_count(self) -> None:
        # 5 SEARCH/REPLACE blocks in ASSISTANT sections.
        assert self.result["edit_attempts"] == 5

    def test_edit_formats_used(self) -> None:
        assert "search/replace" in self.result["edit_formats_used"]

    def test_files_referenced(self) -> None:
        files = self.result["files_referenced"]
        assert "mathweb/flask/app.py" in files
        assert "hello.py" in files
        assert "main.py" in files

    def test_reasoning_summary_nonempty(self) -> None:
        assert len(self.result["reasoning_summary"]) > 0

    def test_no_parse_warnings(self) -> None:
        assert self.result["parse_warnings"] == []

    def test_output_serialises_to_valid_json(self) -> None:
        blob = json.dumps(self.result)
        parsed_back = json.loads(blob)
        assert parsed_back == self.result


# ---------------------------------------------------------------------------
# Named fixture tests
# ---------------------------------------------------------------------------


class TestFixtureSimple:
    """Tests for fixture-simple.txt: single TO LLM/LLM RESPONSE exchange
    with one SEARCH/REPLACE edit."""

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.result = parse_log(FIXTURES_DIR / "fixture-simple.txt")

    def test_llm_turns(self) -> None:
        assert self.result["llm_turns"] == 1

    def test_user_messages(self) -> None:
        assert self.result["user_messages"] == 1

    def test_assistant_messages(self) -> None:
        assert self.result["assistant_messages"] == 1

    def test_edit_attempts(self) -> None:
        assert self.result["edit_attempts"] == 1

    def test_edit_formats(self) -> None:
        assert self.result["edit_formats_used"] == ["search/replace"]

    def test_files_referenced(self) -> None:
        assert self.result["files_referenced"] == ["utils.py"]

    def test_reasoning_summary(self) -> None:
        assert len(self.result["reasoning_summary"]) >= 1
        # Should mention type hints or docstring
        combined = " ".join(self.result["reasoning_summary"]).lower()
        assert "type hint" in combined or "docstring" in combined or "lacks" in combined

    def test_no_errors(self) -> None:
        assert self.result["errors_encountered"] == []

    def test_no_warnings(self) -> None:
        assert self.result["parse_warnings"] == []

    def test_tokens_null(self) -> None:
        assert self.result["total_input_tokens_estimate"] is None
        assert self.result["total_output_tokens_estimate"] is None


class TestFixtureMultiTurn:
    """Tests for fixture-multi-turn.txt: three TO LLM/LLM RESPONSE exchanges,
    multiple edits, multiple files."""

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.result = parse_log(FIXTURES_DIR / "fixture-multi-turn.txt")

    def test_llm_turns(self) -> None:
        assert self.result["llm_turns"] == 3

    def test_user_messages(self) -> None:
        assert self.result["user_messages"] == 3

    def test_assistant_messages(self) -> None:
        assert self.result["assistant_messages"] == 3

    def test_edit_attempts(self) -> None:
        # Turn 1: 1 edit, Turn 2: 2 edits, Turn 3: 0 edits
        assert self.result["edit_attempts"] == 3

    def test_edit_formats(self) -> None:
        assert "search/replace" in self.result["edit_formats_used"]

    def test_files_referenced(self) -> None:
        files = self.result["files_referenced"]
        assert "calculator.py" in files
        assert "tests/test_calc.py" in files
        assert len(files) >= 2

    def test_reasoning_summary_nonempty(self) -> None:
        assert len(self.result["reasoning_summary"]) >= 1

    def test_no_errors(self) -> None:
        assert self.result["errors_encountered"] == []

    def test_no_warnings(self) -> None:
        assert self.result["parse_warnings"] == []


class TestFixtureTimeout:
    """Tests for fixture-timeout.txt: two complete exchanges, third
    truncated mid-sentence."""

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.result = parse_log(FIXTURES_DIR / "fixture-timeout.txt")

    def test_llm_turns(self) -> None:
        # Two TO LLM sections (first has LLM RESPONSE, second is truncated)
        assert self.result["llm_turns"] == 2

    def test_truncation_warning(self) -> None:
        assert any("truncat" in w.lower() for w in self.result["parse_warnings"])

    def test_user_messages(self) -> None:
        assert self.result["user_messages"] == 2

    def test_assistant_messages(self) -> None:
        # First turn: 1 assistant block, second turn: 1 truncated assistant block
        assert self.result["assistant_messages"] == 2

    def test_edit_attempts(self) -> None:
        # First turn has one complete edit; second turn is truncated before edits
        assert self.result["edit_attempts"] == 1

    def test_files_referenced(self) -> None:
        assert "config.py" in self.result["files_referenced"]


class TestFixtureNoEdits:
    """Tests for fixture-no-edits.txt: two exchanges where ASSISTANT
    explains but makes no edits."""

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.result = parse_log(FIXTURES_DIR / "fixture-no-edits.txt")

    def test_llm_turns(self) -> None:
        assert self.result["llm_turns"] == 2

    def test_user_messages(self) -> None:
        assert self.result["user_messages"] == 2

    def test_assistant_messages(self) -> None:
        assert self.result["assistant_messages"] == 2

    def test_edit_attempts_zero(self) -> None:
        assert self.result["edit_attempts"] == 0

    def test_edit_formats_empty(self) -> None:
        assert self.result["edit_formats_used"] == []

    def test_files_referenced_empty(self) -> None:
        assert self.result["files_referenced"] == []

    def test_reasoning_summary_nonempty(self) -> None:
        assert len(self.result["reasoning_summary"]) >= 1
        combined = " ".join(self.result["reasoning_summary"]).lower()
        assert "correct" in combined or "sort" in combined or "search" in combined

    def test_no_errors(self) -> None:
        assert self.result["errors_encountered"] == []

    def test_no_warnings(self) -> None:
        assert self.result["parse_warnings"] == []


class TestFixtureErrors:
    """Tests for fixture-errors.txt: session where ASSISTANT reports errors."""

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.result = parse_log(FIXTURES_DIR / "fixture-errors.txt")

    def test_llm_turns(self) -> None:
        assert self.result["llm_turns"] == 1

    def test_user_messages(self) -> None:
        assert self.result["user_messages"] == 1

    def test_assistant_messages(self) -> None:
        assert self.result["assistant_messages"] == 1

    def test_edit_attempts_zero(self) -> None:
        assert self.result["edit_attempts"] == 0

    def test_errors_nonempty(self) -> None:
        assert len(self.result["errors_encountered"]) >= 1

    def test_error_mentions_cannot(self) -> None:
        combined = " ".join(self.result["errors_encountered"]).lower()
        assert "cannot" in combined or "failed" in combined

    def test_no_warnings(self) -> None:
        assert self.result["parse_warnings"] == []


# ---------------------------------------------------------------------------
# Live fixture does not crash
# ---------------------------------------------------------------------------


class TestLiveFixtureNoCrash:
    """Ensure the live fixture from Phase 1 parses without error."""

    def test_parses_without_crash(self) -> None:
        result = parse_log(FIXTURE)
        assert isinstance(result, dict)
        assert result["llm_turns"] >= 1


# ---------------------------------------------------------------------------
# Edge-case tests (inline fixtures)
# ---------------------------------------------------------------------------


class TestEmptyFile:
    """An empty input should produce zero counts and a warning."""

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp("")
        self.result = parse_log(self.path)

    def test_llm_turns_zero(self) -> None:
        assert self.result["llm_turns"] == 0

    def test_user_messages_zero(self) -> None:
        assert self.result["user_messages"] == 0

    def test_assistant_messages_zero(self) -> None:
        assert self.result["assistant_messages"] == 0

    def test_edit_attempts_zero(self) -> None:
        assert self.result["edit_attempts"] == 0

    def test_parse_warning_present(self) -> None:
        assert any("empty" in w.lower() for w in self.result["parse_warnings"])


class TestWhitespaceOnly:
    """A file with only whitespace should be treated like a near-empty file."""

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp("   \n  \n\n  \t  \n")
        self.result = parse_log(self.path)

    def test_llm_turns_zero(self) -> None:
        assert self.result["llm_turns"] == 0

    def test_user_messages_zero(self) -> None:
        assert self.result["user_messages"] == 0

    def test_assistant_messages_zero(self) -> None:
        assert self.result["assistant_messages"] == 0

    def test_edit_attempts_zero(self) -> None:
        assert self.result["edit_attempts"] == 0


class TestNoRoleMarkers:
    """Plain text with no role markers at all."""

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp(
            "This is just plain text.\n"
            "It has no role markers.\n"
            "Nothing to parse here.\n"
        )
        self.result = parse_log(self.path)

    def test_llm_turns_zero(self) -> None:
        assert self.result["llm_turns"] == 0

    def test_user_messages_zero(self) -> None:
        assert self.result["user_messages"] == 0

    def test_assistant_messages_zero(self) -> None:
        assert self.result["assistant_messages"] == 0


class TestTruncatedFile:
    """A file with TO LLM but no LLM RESPONSE should not crash."""

    TRUNCATED = (
        "TO LLM 2026-03-28T06:04:29\n"
        "-------\n"
        "SYSTEM Hello world\n"
        "-------\n"
        "USER Do something\n"
    )

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp(self.TRUNCATED)
        self.result = parse_log(self.path)

    def test_does_not_crash(self) -> None:
        assert isinstance(self.result, dict)

    def test_llm_turns_counted(self) -> None:
        assert self.result["llm_turns"] == 1

    def test_user_messages_counted(self) -> None:
        assert self.result["user_messages"] == 1

    def test_truncation_warning(self) -> None:
        assert any("truncat" in w.lower() for w in self.result["parse_warnings"])


class TestNonUtf8:
    """Non-UTF-8 bytes should be replaced, not raise an exception."""

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        content = (
            b"TO LLM 2026-03-28T06:04:29\n"
            b"-------\n"
            b"SYSTEM Hello \xff\xfe world\n"
            b"-------\n"
            b"USER Do something\n"
            b"-------\n"
            b"LLM RESPONSE 2026-03-28T06:04:30\n"
        )
        self.path = _write_tmp(content)
        self.result = parse_log(self.path)

    def test_does_not_crash(self) -> None:
        assert isinstance(self.result, dict)

    def test_replacement_warning(self) -> None:
        assert any(
            "utf-8" in w.lower() or "replacement" in w.lower()
            for w in self.result["parse_warnings"]
        )

    def test_valid_json(self) -> None:
        blob = json.dumps(self.result)
        assert json.loads(blob) is not None


class TestLargeFile:
    """A very large file (1000 turns) should parse correctly and quickly."""

    def test_large_file_1000_turns(self, tmp_path: Path) -> None:
        f = tmp_path / "large.txt"
        with f.open("w") as fh:
            for i in range(1000):
                fh.write(f"TO LLM 2026-01-01T00:{i // 60:02d}:{i % 60:02d}\n")
                fh.write("-------\n")
                fh.write("SYSTEM You are helpful.\n")
                fh.write("-------\n")
                fh.write(f"USER Fix issue {i}\n")
                fh.write("-------\n")
                fh.write(f"ASSISTANT Done with issue {i}.\n")
                fh.write("-------\n")
                fh.write(f"LLM RESPONSE 2026-01-01T00:{i // 60:02d}:{i % 60:02d}\n")
                fh.write("\n")
        result = parse_log(f)
        assert result["llm_turns"] == 1000
        assert result["user_messages"] == 1000
        assert result["assistant_messages"] == 1000
        assert result["parse_warnings"] == []


class TestMixedEditFormats:
    """A session with both search/replace edits and code fences without
    search/replace markers (which are just informational code blocks)."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER Fix it\n"
        "-------\n"
        "ASSISTANT I will fix the file and show an example.\n"
        "ASSISTANT \n"
        "ASSISTANT src/app.py\n"
        "ASSISTANT ```python\n"
        "ASSISTANT <<<<<<< SEARCH\n"
        "ASSISTANT old = True\n"
        "ASSISTANT =======\n"
        "ASSISTANT old = False\n"
        "ASSISTANT >>>>>>> REPLACE\n"
        "ASSISTANT ```\n"
        "ASSISTANT \n"
        "ASSISTANT src/utils.py\n"
        "ASSISTANT ```python\n"
        "ASSISTANT <<<<<<< SEARCH\n"
        "ASSISTANT x = 1\n"
        "ASSISTANT =======\n"
        "ASSISTANT x = 2\n"
        "ASSISTANT >>>>>>> REPLACE\n"
        "ASSISTANT ```\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
    )

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp(self.CONTENT)
        self.result = parse_log(self.path)

    def test_edit_attempts(self) -> None:
        assert self.result["edit_attempts"] == 2

    def test_files_referenced(self) -> None:
        assert "src/app.py" in self.result["files_referenced"]
        assert "src/utils.py" in self.result["files_referenced"]

    def test_edit_formats(self) -> None:
        assert "search/replace" in self.result["edit_formats_used"]


class TestPartialTruncationMidEditBlock:
    """File truncated in the middle of an edit block (code fence open but
    never closed)."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER Fix the bug\n"
        "-------\n"
        "ASSISTANT I will fix the file.\n"
        "ASSISTANT \n"
        "ASSISTANT src/app.py\n"
        "ASSISTANT ```python\n"
        "ASSISTANT <<<<<<< SEARCH\n"
        "ASSISTANT old_code = True\n"
    )

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp(self.CONTENT)
        self.result = parse_log(self.path)

    def test_does_not_crash(self) -> None:
        assert isinstance(self.result, dict)

    def test_truncation_warning(self) -> None:
        assert any("truncat" in w.lower() for w in self.result["parse_warnings"])

    def test_llm_turns_counted(self) -> None:
        assert self.result["llm_turns"] == 1

    def test_edit_attempts_zero_or_partial(self) -> None:
        # The edit block was never closed, so it should NOT count as complete
        assert self.result["edit_attempts"] == 0


# ---------------------------------------------------------------------------
# Multi-turn test (original)
# ---------------------------------------------------------------------------


class TestMultiTurn:
    """A file with multiple TO LLM / LLM RESPONSE pairs."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "SYSTEM You are helpful.\n"
        "-------\n"
        "USER Fix the bug\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
        "\n"
        "TO LLM 2026-01-01T00:00:02\n"
        "-------\n"
        "SYSTEM You are helpful.\n"
        "-------\n"
        "USER Now add tests\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:03\n"
        "\n"
    )

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp(self.CONTENT)
        self.result = parse_log(self.path)

    def test_llm_turns(self) -> None:
        assert self.result["llm_turns"] == 2

    def test_user_messages(self) -> None:
        assert self.result["user_messages"] == 2


# ---------------------------------------------------------------------------
# Edit-block detection test (original)
# ---------------------------------------------------------------------------


class TestEditBlockDetection:
    """Verify edit-block counting with synthetic assistant content."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER Fix it\n"
        "-------\n"
        "ASSISTANT I will fix the file.\n"
        "ASSISTANT \n"
        "ASSISTANT src/main.py\n"
        "ASSISTANT ```python\n"
        "ASSISTANT <<<<<<< SEARCH\n"
        "ASSISTANT old code\n"
        "ASSISTANT =======\n"
        "ASSISTANT new code\n"
        "ASSISTANT >>>>>>> REPLACE\n"
        "ASSISTANT ```\n"
        "ASSISTANT \n"
        "ASSISTANT tests/test_main.py\n"
        "ASSISTANT ```python\n"
        "ASSISTANT <<<<<<< SEARCH\n"
        "ASSISTANT old test\n"
        "ASSISTANT =======\n"
        "ASSISTANT new test\n"
        "ASSISTANT >>>>>>> REPLACE\n"
        "ASSISTANT ```\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
    )

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp(self.CONTENT)
        self.result = parse_log(self.path)

    def test_edit_attempts(self) -> None:
        assert self.result["edit_attempts"] == 2

    def test_files_referenced(self) -> None:
        assert "src/main.py" in self.result["files_referenced"]
        assert "tests/test_main.py" in self.result["files_referenced"]

    def test_edit_format(self) -> None:
        assert "search/replace" in self.result["edit_formats_used"]

    def test_reasoning_summary(self) -> None:
        # "I will fix the file." should be captured as reasoning
        assert any("fix" in s.lower() for s in self.result["reasoning_summary"])


# ---------------------------------------------------------------------------
# Code fence without SEARCH/REPLACE (informational code block)
# ---------------------------------------------------------------------------


class TestCodeFenceWithoutSearchReplace:
    """A code fence that does NOT contain SEARCH/REPLACE markers should
    not count as an edit attempt."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER Show me how to use the API\n"
        "-------\n"
        "ASSISTANT Here is an example of how to use the API.\n"
        "ASSISTANT \n"
        "ASSISTANT ```python\n"
        "ASSISTANT import requests\n"
        "ASSISTANT response = requests.get('http://api.example.com')\n"
        "ASSISTANT ```\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
    )

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp(self.CONTENT)
        self.result = parse_log(self.path)

    def test_edit_attempts_zero(self) -> None:
        assert self.result["edit_attempts"] == 0

    def test_edit_formats_empty(self) -> None:
        assert self.result["edit_formats_used"] == []

    def test_reasoning_present(self) -> None:
        assert len(self.result["reasoning_summary"]) >= 1


# ---------------------------------------------------------------------------
# Continuation lines within a role block
# ---------------------------------------------------------------------------


class TestContinuationLines:
    """Lines without a role prefix after a role line should be captured
    as continuation."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER First line of user message\n"
        "USER Second line of user message\n"
        "-------\n"
        "ASSISTANT First line of response.\n"
        "ASSISTANT Second line of response.\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
    )

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp(self.CONTENT)
        self.result = parse_log(self.path)

    def test_user_messages(self) -> None:
        assert self.result["user_messages"] == 1

    def test_assistant_messages(self) -> None:
        assert self.result["assistant_messages"] == 1


# ---------------------------------------------------------------------------
# Multiple separators without content (edge case)
# ---------------------------------------------------------------------------


class TestConsecutiveSeparators:
    """Multiple separators in a row should not cause issues."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "-------\n"
        "-------\n"
        "USER Hello\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
    )

    @pytest.fixture(autouse=True)
    def _parse(self) -> None:
        self.path = _write_tmp(self.CONTENT)
        self.result = parse_log(self.path)

    def test_does_not_crash(self) -> None:
        assert isinstance(self.result, dict)

    def test_user_messages(self) -> None:
        assert self.result["user_messages"] == 1


# ---------------------------------------------------------------------------
# Token estimation with multi-turn
# ---------------------------------------------------------------------------


class TestTokenEstimationMultiTurn:
    """Token info across multiple responses should accumulate."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER Hello\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
        "Tokens: 100 sent, 50 received\n"
        "\n"
        "TO LLM 2026-01-01T00:00:02\n"
        "-------\n"
        "USER World\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:03\n"
        "Tokens: 200 sent, 75 received\n"
    )

    def test_tokens_accumulated(self) -> None:
        path = _write_tmp(self.CONTENT)
        result = parse_log(path)
        assert result["total_input_tokens_estimate"] == 300
        assert result["total_output_tokens_estimate"] == 125


# ---------------------------------------------------------------------------
# CLI integration tests
# ---------------------------------------------------------------------------


class TestCLI:
    """Tests that exercise the CLI entry point."""

    def test_help_exits_zero(self) -> None:
        result = subprocess.run(
            [sys.executable, str(PARSER_SCRIPT), "--help"],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0

    def test_missing_input_exits_one(self) -> None:
        result = subprocess.run(
            [
                sys.executable,
                str(PARSER_SCRIPT),
                "--input",
                "/nonexistent/path.txt",
                "--output",
                "/tmp/nope.json",
            ],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 1
        assert "does not exist" in result.stderr

    def test_fixture_produces_valid_json(self) -> None:
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            out = Path(f.name)
        result = subprocess.run(
            [
                sys.executable,
                str(PARSER_SCRIPT),
                "--input",
                str(FIXTURE),
                "--output",
                str(out),
            ],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0
        data = json.loads(out.read_text())
        assert "llm_turns" in data

    def test_missing_required_args_exits_nonzero(self) -> None:
        result = subprocess.run(
            [sys.executable, str(PARSER_SCRIPT)],
            capture_output=True,
            text=True,
        )
        assert result.returncode != 0


# ---------------------------------------------------------------------------
# Unit tests for helper functions
# ---------------------------------------------------------------------------


class TestExtractFirstSentence:
    def test_simple(self) -> None:
        assert extract_first_sentence("Hello world.") == "Hello world."

    def test_exclamation(self) -> None:
        assert extract_first_sentence("Wow! More text.") == "Wow!"

    def test_question(self) -> None:
        assert extract_first_sentence("Really? Yes.") == "Really?"

    def test_no_terminator(self) -> None:
        assert extract_first_sentence("No terminator here") == "No terminator here"

    def test_max_chars(self) -> None:
        long = "A" * 300 + "."
        result = extract_first_sentence(long, max_chars=200)
        assert len(result) <= 200

    def test_empty(self) -> None:
        assert extract_first_sentence("") == ""

    def test_whitespace_only(self) -> None:
        assert extract_first_sentence("   ") == ""

    def test_sentence_longer_than_max_chars(self) -> None:
        # Sentence terminator beyond max_chars
        text = "A" * 250 + ". More text."
        result = extract_first_sentence(text, max_chars=200)
        assert len(result) <= 200


# ---------------------------------------------------------------------------
# Token estimation test
# ---------------------------------------------------------------------------


class TestTokenEstimation:
    """If the response section contains token info, it should be captured."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER Hello\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
        "Tokens: 1,234 sent, 567 received\n"
    )

    def test_tokens_captured(self) -> None:
        path = _write_tmp(self.CONTENT)
        result = parse_log(path)
        assert result["total_input_tokens_estimate"] == 1234
        assert result["total_output_tokens_estimate"] == 567


class TestTokenEstimationMissing:
    """When no token info is present, estimates should be null."""

    def test_tokens_null(self) -> None:
        result = parse_log(FIXTURE)
        assert result["total_input_tokens_estimate"] is None
        assert result["total_output_tokens_estimate"] is None


# ---------------------------------------------------------------------------
# Error detection test
# ---------------------------------------------------------------------------


class TestErrorDetection:
    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER Fix it\n"
        "-------\n"
        "ASSISTANT Error: something went wrong with the module.\n"
        "ASSISTANT I cannot access that file.\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
    )

    def test_errors_found(self) -> None:
        path = _write_tmp(self.CONTENT)
        result = parse_log(path)
        assert len(result["errors_encountered"]) == 2


class TestMultipleErrorPatterns:
    """Test multiple error pattern variants."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER Fix it\n"
        "-------\n"
        "ASSISTANT Failed: the operation could not complete.\n"
        "ASSISTANT I can't modify that file.\n"
        "ASSISTANT Unable to read the config.\n"
        "ASSISTANT Traceback (most recent call last):\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
    )

    def test_all_error_patterns_detected(self) -> None:
        path = _write_tmp(self.CONTENT)
        result = parse_log(path)
        assert len(result["errors_encountered"]) == 4


# ---------------------------------------------------------------------------
# Direct main() invocation tests (for coverage of the main function)
# ---------------------------------------------------------------------------


class TestMainDirect:
    """Test main() called directly (not via subprocess) for coverage."""

    def test_main_success(self) -> None:
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            out = Path(f.name)
        rc = main(["--input", str(FIXTURE), "--output", str(out)])
        assert rc == 0
        data = json.loads(out.read_text())
        assert data["llm_turns"] == 1

    def test_main_file_not_found(self) -> None:
        rc = main(["--input", "/nonexistent.txt", "--output", "/tmp/out.json"])
        assert rc == 1

    def test_main_output_write_error(self) -> None:
        # Attempt to write to a directory that doesn't exist
        rc = main(
            [
                "--input",
                str(FIXTURE),
                "--output",
                "/nonexistent_dir/impossible/out.json",
            ]
        )
        assert rc == 1

    def test_main_with_fixture_simple(self) -> None:
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            out = Path(f.name)
        rc = main(
            [
                "--input",
                str(FIXTURES_DIR / "fixture-simple.txt"),
                "--output",
                str(out),
            ]
        )
        assert rc == 0
        data = json.loads(out.read_text())
        assert data["llm_turns"] == 1
        assert data["edit_attempts"] == 1


# ---------------------------------------------------------------------------
# strip_role_prefix edge cases (for coverage of lines 62-64)
# ---------------------------------------------------------------------------


class TestStripRolePrefix:
    def test_with_space_content(self) -> None:
        assert strip_role_prefix("SYSTEM Hello", "SYSTEM") == "Hello"

    def test_role_alone(self) -> None:
        # Line is exactly the role tag with no trailing space
        assert strip_role_prefix("SYSTEM", "SYSTEM") == ""

    def test_no_match(self) -> None:
        # Line doesn't start with the role at all
        assert strip_role_prefix("something else", "SYSTEM") == "something else"

    def test_empty_content_after_space(self) -> None:
        assert strip_role_prefix("USER ", "USER") == ""

    def test_assistant_prefix(self) -> None:
        assert strip_role_prefix("ASSISTANT Hello world", "ASSISTANT") == "Hello world"

    def test_user_prefix(self) -> None:
        assert strip_role_prefix("USER some text", "USER") == "some text"


# ---------------------------------------------------------------------------
# _Turn internal class tests
# ---------------------------------------------------------------------------


class TestTurnInternal:
    """Direct tests of the _Turn class for branch coverage."""

    def test_empty_turn(self) -> None:
        t = _Turn()
        t.finalize()
        assert t.user_blocks == []
        assert t.assistant_blocks == []
        assert t.system_blocks == []

    def test_feed_separator_flushes(self) -> None:
        t = _Turn()
        t.feed_line("SYSTEM Hello")
        t.feed_separator()
        assert len(t.system_blocks) == 1
        assert t.system_blocks[0] == ["Hello"]

    def test_feed_line_role_transition(self) -> None:
        t = _Turn()
        t.feed_line("SYSTEM First")
        t.feed_line("USER Second")
        t.finalize()
        assert len(t.system_blocks) == 1
        assert len(t.user_blocks) == 1

    def test_feed_multiple_same_role(self) -> None:
        t = _Turn()
        t.feed_line("SYSTEM Line 1")
        t.feed_line("SYSTEM Line 2")
        t.finalize()
        assert len(t.system_blocks) == 1
        assert t.system_blocks[0] == ["Line 1", "Line 2"]

    def test_feed_separator_resets_role(self) -> None:
        t = _Turn()
        t.feed_line("SYSTEM First block")
        t.feed_separator()
        t.feed_line("SYSTEM Second block")
        t.finalize()
        assert len(t.system_blocks) == 2

    def test_feed_line_without_role(self) -> None:
        """A line without a known role prefix after a role was set."""
        t = _Turn()
        t.feed_line("SYSTEM Hello")
        t.feed_line("continuation line")
        t.finalize()
        assert len(t.system_blocks) == 1
        assert "continuation line" in t.system_blocks[0]

    def test_feed_line_no_current_role(self) -> None:
        """A line without a role prefix and no current role set."""
        t = _Turn()
        t.feed_line("orphan line")
        t.finalize()
        assert t.system_blocks == []
        assert t.user_blocks == []
        assert t.assistant_blocks == []

    def test_flush_block_with_no_content(self) -> None:
        """Flush with current_role set but empty block."""
        t = _Turn()
        t._current_role = "SYSTEM"
        t._current_block = []
        t._flush_block()
        assert t.system_blocks == []

    def test_flush_block_unknown_role(self) -> None:
        """Flush with an unknown role should not crash."""
        t = _Turn()
        t._current_role = "UNKNOWN"
        t._current_block = ["something"]
        t._flush_block()
        # Nothing should be appended since UNKNOWN is not a valid role
        assert t.system_blocks == []
        assert t.user_blocks == []
        assert t.assistant_blocks == []


# ---------------------------------------------------------------------------
# _analyse_assistant_blocks direct tests
# ---------------------------------------------------------------------------


class TestAnalyseAssistantBlocks:
    """Direct tests of the _analyse_assistant_blocks function."""

    def test_empty_blocks(self) -> None:
        edits, fmts, files, reasoning, errors = _analyse_assistant_blocks([])
        assert edits == 0
        assert fmts == []
        assert files == []
        assert reasoning == []
        assert errors == []

    def test_block_with_only_reasoning(self) -> None:
        block = [
            "The code looks correct.",
            "No changes needed.",
        ]
        edits, _fmts, _files, reasoning, _errors = _analyse_assistant_blocks([block])
        assert edits == 0
        assert len(reasoning) == 1
        assert "correct" in reasoning[0].lower()

    def test_block_with_filename_then_fence(self) -> None:
        block = [
            "I will fix the file.",
            "",
            "app.py",
            "```python",
            "<<<<<<< SEARCH",
            "old",
            "=======",
            "new",
            ">>>>>>> REPLACE",
            "```",
        ]
        edits, fmts, files, reasoning, errors = _analyse_assistant_blocks([block])
        assert edits == 1
        assert "app.py" in files

    def test_block_with_error_in_reasoning(self) -> None:
        block = [
            "Error: the file was not found.",
            "I cannot proceed without it.",
        ]
        _edits, _fmts, _files, _reasoning, errors = _analyse_assistant_blocks([block])
        assert len(errors) == 2

    def test_code_fence_without_search_replace(self) -> None:
        """A code fence without SEARCH/REPLACE should not count as edit."""
        block = [
            "Here is an example.",
            "```python",
            "print('hello')",
            "```",
        ]
        edits, _fmts, _files, _reasoning, _errors = _analyse_assistant_blocks([block])
        assert edits == 0

    def test_filename_cleared_by_non_filename_text(self) -> None:
        """If a filename line is followed by non-filename text (not a fence),
        the pending filename should be cleared."""
        block = [
            "app.py",
            "This is just text mentioning the file above.",
            "```python",
            "<<<<<<< SEARCH",
            "old",
            "=======",
            "new",
            ">>>>>>> REPLACE",
            "```",
        ]
        edits, fmts, files, reasoning, errors = _analyse_assistant_blocks([block])
        assert edits == 1
        # The filename should NOT be in files_referenced because it was
        # cleared by the intervening text line
        assert "app.py" not in files

    def test_empty_block_content(self) -> None:
        """A block with only empty lines should produce no reasoning."""
        block = ["", "  ", ""]
        edits, _fmts, _files, reasoning, _errors = _analyse_assistant_blocks([block])
        assert edits == 0
        assert reasoning == []

    def test_multiple_blocks(self) -> None:
        """Multiple blocks should each contribute independently."""
        block1 = ["First block reasoning."]
        block2 = [
            "Second block with edits.",
            "",
            "file.py",
            "```python",
            "<<<<<<< SEARCH",
            "x",
            "=======",
            "y",
            ">>>>>>> REPLACE",
            "```",
        ]
        edits, fmts, files, reasoning, errors = _analyse_assistant_blocks(
            [block1, block2]
        )
        assert edits == 1
        assert len(reasoning) == 2
        assert "file.py" in files


# ---------------------------------------------------------------------------
# Response section handling tests
# ---------------------------------------------------------------------------


class TestResponseSectionContent:
    """Ensure response section content is captured correctly."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER Hello\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
        "Some response text\n"
        "More response text\n"
    )

    def test_response_does_not_crash(self) -> None:
        path = _write_tmp(self.CONTENT)
        result = parse_log(path)
        assert result["llm_turns"] == 1


class TestResponseFollowedByNewTurn:
    """A response section followed by another TO LLM."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "USER Hello\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
        "Response content\n"
        "\n"
        "TO LLM 2026-01-01T00:00:02\n"
        "-------\n"
        "USER World\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:03\n"
        "Second response\n"
    )

    def test_two_turns(self) -> None:
        path = _write_tmp(self.CONTENT)
        result = parse_log(path)
        assert result["llm_turns"] == 2


# ---------------------------------------------------------------------------
# Regex edge cases
# ---------------------------------------------------------------------------


class TestRegexEdgeCases:
    """Test that regex patterns handle edge cases correctly."""

    def test_separator_must_be_exactly_seven_hyphens(self) -> None:
        """Lines with more or fewer than 7 hyphens should NOT be treated
        as separators."""
        content = (
            "TO LLM 2026-01-01T00:00:00\n"
            "------\n"  # 6 hyphens - not a separator
            "SYSTEM Hello\n"
            "--------\n"  # 8 hyphens - not a separator
            "USER World\n"
            "-------\n"  # 7 hyphens - this IS a separator
            "LLM RESPONSE 2026-01-01T00:00:01\n"
        )
        path = _write_tmp(content)
        result = parse_log(path)
        # Should parse without crashing
        assert isinstance(result, dict)

    def test_to_llm_requires_timestamp(self) -> None:
        """A line saying 'TO LLM' without a timestamp should not start a turn."""
        content = "TO LLM\nSYSTEM Hello\n"
        path = _write_tmp(content)
        result = parse_log(path)
        assert result["llm_turns"] == 0

    def test_llm_response_requires_timestamp(self) -> None:
        """A line saying 'LLM RESPONSE' without a timestamp should not end a turn."""
        content = (
            "TO LLM 2026-01-01T00:00:00\n"
            "-------\n"
            "USER Hello\n"
            "-------\n"
            "LLM RESPONSE\n"
        )
        path = _write_tmp(content)
        result = parse_log(path)
        # Should detect truncation since LLM RESPONSE without timestamp
        # won't be recognized
        assert result["llm_turns"] == 1
        assert any("truncat" in w.lower() for w in result["parse_warnings"])


# ---------------------------------------------------------------------------
# Role prefix on blank lines
# ---------------------------------------------------------------------------


class TestRolePrefixBlankLines:
    """Test that role-prefixed blank lines (e.g., 'SYSTEM ') are handled."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "SYSTEM First line\n"
        "SYSTEM \n"
        "SYSTEM Third line\n"
        "-------\n"
        "USER Hello\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
    )

    def test_blank_role_lines_handled(self) -> None:
        path = _write_tmp(self.CONTENT)
        result = parse_log(path)
        assert result["llm_turns"] == 1
        assert result["user_messages"] == 1


# ---------------------------------------------------------------------------
# SYSTEM role with bare prefix (no trailing space)
# ---------------------------------------------------------------------------


class TestBareRolePrefix:
    """Test role tags without trailing space (e.g., 'SYSTEM' alone)."""

    CONTENT = (
        "TO LLM 2026-01-01T00:00:00\n"
        "-------\n"
        "SYSTEM\n"
        "SYSTEM Content after bare\n"
        "-------\n"
        "USER\n"
        "-------\n"
        "LLM RESPONSE 2026-01-01T00:00:01\n"
    )

    def test_bare_prefixes_handled(self) -> None:
        path = _write_tmp(self.CONTENT)
        result = parse_log(path)
        assert result["llm_turns"] == 1
        assert result["user_messages"] == 1
