#!/usr/bin/env python3
"""Parse Aider's --llm-history-file output into structured JSON.

Reads the plain-text LLM history produced by Aider and extracts
competition-relevant signals: turn counts, edit attempts, file references,
reasoning summaries, and token estimates.

Usage:
    python3 scripts/harness/parse-aider-log.py \
        --input /path/to/llm-history.txt \
        --output /path/to/parsed-log.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Regex patterns based on the confirmed Aider 0.86.2 --llm-history-file format
# (see specs/competitors/aider/fixtures/README.md)
# ---------------------------------------------------------------------------
RE_TO_LLM = re.compile(r"^TO LLM \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$")
RE_LLM_RESPONSE = re.compile(r"^LLM RESPONSE \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$")
RE_SEPARATOR = re.compile(r"^-{7}$")
RE_SYSTEM = re.compile(r"^SYSTEM(?:\s|$)")
RE_USER = re.compile(r"^USER(?:\s|$)")
RE_ASSISTANT = re.compile(r"^ASSISTANT(?:\s|$)")

# Edit-block detection within assistant content (after stripping "ASSISTANT " prefix)
RE_SEARCH_MARKER = re.compile(r"^<<<<<<< SEARCH\s*$")
RE_REPLACE_MARKER = re.compile(r"^>>>>>>> REPLACE\s*$")
RE_CODE_FENCE_OPEN = re.compile(r"^```(\w+)?\s*$")
RE_CODE_FENCE_CLOSE = re.compile(r"^```\s*$")

# Filename heuristic: a line that looks like a file path (contains a dot and
# no spaces, or is a simple filename with extension).  Applied to the line
# immediately before a code-fence that contains a SEARCH/REPLACE block.
RE_FILENAME = re.compile(r"^[A-Za-z0-9_./-]+\.[A-Za-z0-9]+$")

# Error patterns in assistant text
RE_ERROR = re.compile(
    r"(?:^|\b)(?:Error:|Failed:|I cannot|I can't|unable to|exception|Traceback)",
    re.IGNORECASE,
)

# Token usage pattern (Aider sometimes writes this)
RE_TOKENS = re.compile(
    r"Tokens:\s*(\d[\d,]*)\s*sent\s*,\s*(\d[\d,]*)\s*received", re.IGNORECASE
)

# Replacement character used by errors="replace"
REPLACEMENT_CHAR = "\ufffd"


def strip_role_prefix(line: str, role: str) -> str:
    """Remove the role prefix from a line, returning the content portion."""
    if line.startswith(role + " "):
        return line[len(role) + 1 :]
    if line == role:
        return ""
    return line


def extract_first_sentence(text: str, max_chars: int = 200) -> str:
    """Extract the first sentence (up to . ! or ?) from *text*, capped at *max_chars*."""
    text = text.strip()
    if not text:
        return ""
    match = re.search(r"[.!?]", text)
    if match:
        end = match.end()
        return text[: min(end, max_chars)].strip()
    return text[:max_chars].strip()


# ---------------------------------------------------------------------------
# Stateful line-by-line parser
# ---------------------------------------------------------------------------


class _Turn:
    """Accumulates data for a single TO-LLM / LLM-RESPONSE pair."""

    __slots__ = (
        "user_blocks",
        "assistant_blocks",
        "system_blocks",
        "_current_role",
        "_current_block",
    )

    def __init__(self) -> None:
        self.user_blocks: list[list[str]] = []
        self.assistant_blocks: list[list[str]] = []
        self.system_blocks: list[list[str]] = []
        self._current_role: str | None = None
        self._current_block: list[str] = []

    def _flush_block(self) -> None:
        if self._current_role and self._current_block:
            dest = {
                "SYSTEM": self.system_blocks,
                "USER": self.user_blocks,
                "ASSISTANT": self.assistant_blocks,
            }.get(self._current_role)
            if dest is not None:
                dest.append(list(self._current_block))
        self._current_block = []

    def feed_separator(self) -> None:
        self._flush_block()
        self._current_role = None

    def feed_line(self, line: str) -> None:
        # Detect role transition
        for tag, regex in (
            ("SYSTEM", RE_SYSTEM),
            ("USER", RE_USER),
            ("ASSISTANT", RE_ASSISTANT),
        ):
            if regex.match(line):
                if self._current_role != tag:
                    self._flush_block()
                    self._current_role = tag
                self._current_block.append(strip_role_prefix(line, tag))
                return
        # Continuation of current block (shouldn't normally happen in this format)
        if self._current_role:
            self._current_block.append(line)

    def finalize(self) -> None:
        self._flush_block()


def _analyse_assistant_blocks(
    blocks: list[list[str]],
) -> tuple[int, list[str], list[str], list[str], list[str]]:
    """Analyse assistant blocks and return edit_attempts, edit_formats_used,
    files_referenced, reasoning_sentences, and errors."""
    edit_attempts = 0
    edit_formats: set[str] = set()
    files_ref: set[str] = set()
    reasoning_parts: list[str] = []
    errors: list[str] = []

    for block in blocks:
        reasoning_buf: list[str] = []
        in_code_fence = False
        has_search_replace = False
        pending_filename: str | None = None

        for raw_line in block:
            line = raw_line

            # Track code fences
            if RE_CODE_FENCE_CLOSE.match(line) and in_code_fence:
                in_code_fence = False
                if has_search_replace:
                    edit_attempts += 1
                    edit_formats.add("search/replace")
                    has_search_replace = False
                continue

            if RE_CODE_FENCE_OPEN.match(line) and not in_code_fence:
                in_code_fence = True
                has_search_replace = False
                # Check if the previous non-blank line looks like a filename
                if pending_filename:
                    files_ref.add(pending_filename)
                continue

            if in_code_fence:
                if RE_SEARCH_MARKER.match(line):
                    has_search_replace = True
                continue

            # Outside code fences: accumulate reasoning and detect filenames
            stripped = line.strip()
            if stripped and RE_FILENAME.match(stripped):
                pending_filename = stripped
            elif stripped:
                pending_filename = None

            # Error detection
            if RE_ERROR.search(line):
                errors.append(line.strip()[:200])

            # Reasoning accumulation (non-empty, non-filename lines outside fences)
            if stripped and not RE_FILENAME.match(stripped):
                reasoning_buf.append(stripped)

        # Extract first sentence of reasoning for this block
        full_reasoning = " ".join(reasoning_buf)
        sentence = extract_first_sentence(full_reasoning)
        if sentence:
            reasoning_parts.append(sentence)

    return (
        edit_attempts,
        sorted(edit_formats),
        sorted(files_ref),
        reasoning_parts,
        errors,
    )


def parse_log(input_path: Path) -> dict:  # noqa: C901
    """Parse an Aider LLM history file and return the structured summary dict."""
    warnings: list[str] = []
    saw_replacement = False

    turns: list[_Turn] = []
    current_turn: _Turn | None = None
    in_response_section = False
    response_lines: list[list[str]] = []  # per-turn response content
    llm_response_sections = 0  # count by header, not buffered content
    current_response_buf: list[str] = []

    total_input_tokens: int | None = None
    total_output_tokens: int | None = None
    line_count = 0

    try:
        with input_path.open(encoding="utf-8", errors="replace") as fh:
            for raw in fh:
                line_count += 1
                line = raw.rstrip("\n").rstrip("\r")

                if REPLACEMENT_CHAR in line:
                    saw_replacement = True

                # --- Section header detection ---
                if RE_TO_LLM.match(line):
                    # Start a new turn
                    if current_turn is not None:
                        current_turn.finalize()
                    current_turn = _Turn()
                    turns.append(current_turn)
                    in_response_section = False
                    if current_response_buf:
                        response_lines.append(current_response_buf)
                        current_response_buf = []
                    continue

                if RE_LLM_RESPONSE.match(line):
                    if current_turn is not None:
                        current_turn.finalize()
                    in_response_section = True
                    llm_response_sections += 1
                    current_response_buf = []
                    continue

                # --- Inside response section ---
                if in_response_section:
                    current_response_buf.append(line)
                    # Check for token info
                    tok_match = RE_TOKENS.search(line)
                    if tok_match:
                        sent = int(tok_match.group(1).replace(",", ""))
                        recv = int(tok_match.group(2).replace(",", ""))
                        total_input_tokens = (total_input_tokens or 0) + sent
                        total_output_tokens = (total_output_tokens or 0) + recv
                    continue

                # --- Inside a TO LLM section ---
                if current_turn is not None and not in_response_section:
                    if RE_SEPARATOR.match(line):
                        current_turn.feed_separator()
                    else:
                        current_turn.feed_line(line)
                    continue

    except Exception as exc:  # noqa: BLE001
        warnings.append(f"Error reading input file: {exc}")

    # Finalize any in-progress turn (handles truncated files where
    # LLM RESPONSE was never seen)
    if current_turn is not None:
        current_turn.finalize()

    # Finalize last response buffer
    if current_response_buf:
        response_lines.append(current_response_buf)

    # --- Empty file handling ---
    if line_count == 0:
        warnings.append("Input file is empty")
        return {
            "llm_turns": 0,
            "user_messages": 0,
            "assistant_messages": 0,
            "edit_attempts": 0,
            "edit_formats_used": [],
            "files_referenced": [],
            "reasoning_summary": [],
            "errors_encountered": [],
            "total_input_tokens_estimate": None,
            "total_output_tokens_estimate": None,
            "parse_warnings": warnings,
        }

    # --- Check for truncation (TO LLM without matching LLM RESPONSE) ---
    # Count TO LLM and LLM RESPONSE occurrences
    to_llm_count = len(turns)
    llm_resp_count = llm_response_sections
    if to_llm_count > llm_resp_count:
        warnings.append(
            f"Truncated input: {to_llm_count} TO LLM section(s) but only "
            f"{llm_resp_count} LLM RESPONSE section(s)"
        )

    if saw_replacement:
        warnings.append("Input contained non-UTF-8 bytes (replaced with U+FFFD)")

    # --- Aggregate across turns ---
    total_user_messages = 0
    total_assistant_messages = 0
    total_edit_attempts = 0
    all_edit_formats: set[str] = set()
    all_files: set[str] = set()
    all_reasoning: list[str] = []
    all_errors: list[str] = []

    for turn in turns:
        total_user_messages += len(turn.user_blocks)
        total_assistant_messages += len(turn.assistant_blocks)

        edits, fmts, files, reasoning, errs = _analyse_assistant_blocks(
            turn.assistant_blocks
        )
        total_edit_attempts += edits
        all_edit_formats.update(fmts)
        all_files.update(files)
        all_reasoning.extend(reasoning)
        all_errors.extend(errs)

    return {
        "llm_turns": to_llm_count,
        "user_messages": total_user_messages,
        "assistant_messages": total_assistant_messages,
        "edit_attempts": total_edit_attempts,
        "edit_formats_used": sorted(all_edit_formats),
        "files_referenced": sorted(all_files),
        "reasoning_summary": all_reasoning,
        "errors_encountered": all_errors,
        "total_input_tokens_estimate": total_input_tokens,
        "total_output_tokens_estimate": total_output_tokens,
        "parse_warnings": warnings,
    }


def main(argv: list[str] | None = None) -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Parse Aider LLM history file into structured JSON.",
    )
    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        help="Path to the Aider --llm-history-file output",
    )
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Path to write the parsed JSON output",
    )
    args = parser.parse_args(argv)

    if not args.input.exists():
        print(f"Error: input file does not exist: {args.input}", file=sys.stderr)
        return 1

    result = parse_log(args.input)

    try:
        with args.output.open("w", encoding="utf-8") as fh:
            json.dump(result, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    except OSError as exc:
        print(f"Error: could not write output file: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
