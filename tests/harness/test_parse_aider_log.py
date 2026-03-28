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


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _write_tmp(content: str | bytes, suffix: str = ".txt") -> Path:
    """Write *content* to a temp file and return its path."""
    mode = "wb" if isinstance(content, bytes) else "w"
    encoding = None if isinstance(content, bytes) else "utf-8"
    f = tempfile.NamedTemporaryFile(
        mode=mode, suffix=suffix, delete=False, encoding=encoding
    )
    f.write(content)
    f.close()
    return Path(f.name)


# ---------------------------------------------------------------------------
# Fixture-based tests
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
# Edge-case tests
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


# ---------------------------------------------------------------------------
# Multi-turn test
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
# Edit-block detection test
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
