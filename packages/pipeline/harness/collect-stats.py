#!/usr/bin/env python3
"""
collect-stats.py - Data collector for Search Olympics benchmark harness.

Parses agent JSONL files to extract metrics, discover JSONL paths,
and check agent completion status.

Usage:
    python collect-stats.py --check-complete <agent-id>
    python collect-stats.py --extract-metrics <agent-id>
    python collect-stats.py --jsonl-path <path> --check-complete
    python collect-stats.py --jsonl-path <path> --extract-metrics

Exit codes:
    0: Success (or agent is complete for --check-complete)
    1: JSONL file not found / agent incomplete for --check-complete
    2: JSONL parse error (malformed JSON)
    3: Agent ID mismatch
    4: Missing required fields in JSONL
    5: Other errors
"""

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


# Regex to match UUID-style session directory names
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Exit codes
# ---------------------------------------------------------------------------
EXIT_SUCCESS = 0
EXIT_NOT_FOUND = 1
EXIT_PARSE_ERROR = 2
EXIT_ID_MISMATCH = 3
EXIT_MISSING_FIELDS = 4
EXIT_OTHER_ERROR = 5


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_iso_timestamp(ts_str):
    """Parse an ISO 8601 timestamp string to a datetime object (UTC).

    Handles both 'Z' suffix and '+00:00' offset notation, as well as
    fractional seconds of varying precision.
    """
    if ts_str is None:
        return None
    # Normalise trailing Z to +00:00 for fromisoformat compatibility
    s = ts_str.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        # Fallback: strip fractional seconds and retry
        if "." in s:
            base, rest = s.split(".", 1)
            # Find the timezone part after fractional seconds
            tz_part = ""
            for sep in ("+", "-"):
                idx = rest.find(sep)
                if idx != -1:
                    tz_part = rest[idx:]
                    break
            return datetime.fromisoformat(base + tz_part)
        raise


def _read_jsonl_lines(jsonl_path):
    """Read all lines from a JSONL file and return parsed JSON objects.

    Raises:
        FileNotFoundError: if the file does not exist
        json.JSONDecodeError: if any line is not valid JSON
    """
    path = Path(jsonl_path)
    if not path.exists():
        raise FileNotFoundError(f"JSONL file not found: {jsonl_path}")

    lines = []
    with open(path, "r", encoding="utf-8") as f:
        for line_num, raw_line in enumerate(f, 1):
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            try:
                lines.append(json.loads(raw_line))
            except json.JSONDecodeError as exc:
                raise json.JSONDecodeError(
                    f"Malformed JSON on line {line_num}: {exc.msg}",
                    exc.doc,
                    exc.pos,
                )
    return lines


# ---------------------------------------------------------------------------
# Core Functions
# ---------------------------------------------------------------------------

def find_jsonl_path(agent_id, project_dir=None, session_id=None):
    """Discover the JSONL path for a given agent ID.

    Algorithm (from architecture.md "JSONL Path Discovery"):
      1. Find project directory under ~/.claude/projects/
         - Use provided project_dir, or find the most recent by mtime
      2. Find session directory within the project
         - Use provided session_id, or find the most recent by mtime
      3. Construct path: <project>/<session>/subagents/agent-<id>.jsonl
      4. Validate: first line's agentId must match the expected ID

    Args:
        agent_id: The agent identifier (without "agent-" prefix).
        project_dir: Optional explicit project directory name.
        session_id: Optional explicit session directory name.

    Returns:
        pathlib.Path to the JSONL file.

    Raises:
        FileNotFoundError: if any directory or file is missing
        ValueError: if agentId in the JSONL doesn't match
    """
    projects_base = Path.home() / ".claude" / "projects"
    if not projects_base.exists():
        raise FileNotFoundError(
            f"Claude Code projects directory not found: {projects_base}"
        )

    # --- Resolve project directory ---
    if project_dir:
        proj_path = projects_base / project_dir
        if not proj_path.is_dir():
            raise FileNotFoundError(
                f"Specified project directory not found: {proj_path}"
            )
    else:
        # Find most recently modified project directory
        candidates = [
            p for p in projects_base.iterdir()
            if p.is_dir() and not p.name.startswith(".")
        ]
        if not candidates:
            raise FileNotFoundError(
                f"No project directories found in {projects_base}"
            )
        proj_path = max(candidates, key=lambda p: p.stat().st_mtime)

    # --- Resolve session directory ---
    if session_id:
        sess_path = proj_path / session_id
        if not sess_path.is_dir():
            raise FileNotFoundError(
                f"Specified session directory not found: {sess_path}"
            )
    else:
        # Find most recently modified session directory.
        # Session dirs are UUID-named; exclude non-session dirs like "memory".
        candidates = [
            p for p in proj_path.iterdir()
            if p.is_dir()
            and not p.name.startswith(".")
            and _UUID_RE.match(p.name)
        ]
        if not candidates:
            raise FileNotFoundError(
                f"No session directories found in project {proj_path.name}"
            )
        sess_path = max(candidates, key=lambda p: p.stat().st_mtime)

    # --- Construct and validate JSONL path ---
    jsonl_path = sess_path / "subagents" / f"agent-{agent_id}.jsonl"
    if not jsonl_path.exists():
        raise FileNotFoundError(
            f"JSONL file not found: {jsonl_path}\n"
            f"  Project dir: {proj_path.name}\n"
            f"  Session dir: {sess_path.name}\n"
            f"  Searched for: agent-{agent_id}.jsonl"
        )

    # Validate agentId in first line
    with open(jsonl_path, "r", encoding="utf-8") as f:
        first_raw = f.readline().strip()
        if not first_raw:
            raise ValueError(f"JSONL file is empty: {jsonl_path}")
        try:
            first_obj = json.loads(first_raw)
        except json.JSONDecodeError as exc:
            raise json.JSONDecodeError(
                f"Cannot parse first line of {jsonl_path}: {exc.msg}",
                exc.doc,
                exc.pos,
            )

    found_id = first_obj.get("agentId")
    if found_id is None:
        raise ValueError(
            f"Missing 'agentId' field in first line of {jsonl_path}"
        )
    if found_id != agent_id:
        raise ValueError(
            f"Agent ID mismatch: expected '{agent_id}', "
            f"found '{found_id}' in {jsonl_path}"
        )

    return jsonl_path


def is_agent_complete(jsonl_path):
    """Check whether an agent has finished executing.

    A complete agent run ends with an assistant message whose content array
    contains only text blocks (no tool_use blocks).

    Args:
        jsonl_path: Path to the agent's JSONL file.

    Returns:
        True if the agent has completed, False otherwise.
    """
    try:
        lines = _read_jsonl_lines(jsonl_path)
    except (FileNotFoundError, json.JSONDecodeError):
        return False

    if not lines:
        return False

    # Find the last assistant message
    last_assistant = None
    for obj in reversed(lines):
        if obj.get("type") == "assistant":
            last_assistant = obj
            break

    if last_assistant is None:
        return False

    # Check if content contains only text blocks (no tool_use)
    content = last_assistant.get("message", {}).get("content", [])
    if not content:
        return False

    has_tool_use = any(
        block.get("type") == "tool_use" for block in content
        if isinstance(block, dict)
    )

    return not has_tool_use


def extract_metrics(jsonl_path, expected_model=None):
    """Extract benchmark metrics from an agent's JSONL file.

    Implements Component 5 extraction logic from architecture.md:
      1. first_timestamp from first line
      2. last_timestamp from last assistant message
      3. duration_seconds between them
      4. total_tool_calls: count of all tool_use blocks
      5. tool_calls_by_type: grouped by tool name
      6. maproom_searches: Bash calls containing "crewchief-maproom search"
      7. maproom_contexts: Bash calls containing "crewchief-maproom context"
      8. final_summary: last text block in last assistant message
      9. summary_length: character count of final_summary
     10. is_complete: whether agent finished
     11. model_id: model identifier from first line metadata
     12. model_verified: whether model matches expected
     13. model_verification_status: VERIFIED, MISMATCH, or SKIPPED

    Args:
        jsonl_path: Path to the agent's JSONL file.
        expected_model: Optional expected model name for verification
            (substring, case-insensitive match).

    Returns:
        dict with all extracted metrics.

    Raises:
        FileNotFoundError: if the JSONL file doesn't exist
        json.JSONDecodeError: if any line is malformed
        ValueError: if required fields are missing
    """
    lines = _read_jsonl_lines(jsonl_path)
    if not lines:
        raise ValueError(f"JSONL file is empty: {jsonl_path}")

    # --- Agent ID ---
    agent_id = lines[0].get("agentId")
    if agent_id is None:
        raise ValueError(
            f"Missing 'agentId' field in first line of {jsonl_path}"
        )

    # --- Timestamps ---
    first_timestamp_str = lines[0].get("timestamp")
    if first_timestamp_str is None:
        raise ValueError(
            f"Missing 'timestamp' field in first line of {jsonl_path}"
        )

    # Collect all assistant messages
    assistant_messages = [
        obj for obj in lines if obj.get("type") == "assistant"
    ]

    if not assistant_messages:
        raise ValueError(
            f"No assistant messages found in {jsonl_path}"
        )

    # Last assistant message timestamp
    last_assistant = assistant_messages[-1]
    last_timestamp_str = last_assistant.get("timestamp")
    if last_timestamp_str is None:
        raise ValueError(
            f"Missing 'timestamp' on last assistant message in {jsonl_path}"
        )

    # Parse and compute duration
    first_ts = _parse_iso_timestamp(first_timestamp_str)
    last_ts = _parse_iso_timestamp(last_timestamp_str)
    duration_seconds = (last_ts - first_ts).total_seconds()

    # --- Tool call counting ---
    total_tool_calls = 0
    tool_calls_by_type = {}
    maproom_searches = 0
    maproom_contexts = 0

    for obj in assistant_messages:
        content = obj.get("message", {}).get("content", [])
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_use":
                total_tool_calls += 1
                tool_name = block.get("name", "unknown")
                tool_calls_by_type[tool_name] = (
                    tool_calls_by_type.get(tool_name, 0) + 1
                )

                # Count maproom-specific Bash calls
                if tool_name == "Bash":
                    command = block.get("input", {}).get("command", "")
                    if "crewchief-maproom search" in command or "maproom search" in command:
                        maproom_searches += 1
                    if "crewchief-maproom context" in command or "maproom context" in command:
                        maproom_contexts += 1

    # --- Final summary ---
    final_summary = ""
    last_content = last_assistant.get("message", {}).get("content", [])
    # Find last text block in the last assistant message
    for block in reversed(last_content):
        if isinstance(block, dict) and block.get("type") == "text":
            final_summary = block.get("text", "")
            break

    summary_length = len(final_summary)

    # --- Completion check ---
    complete = is_agent_complete(jsonl_path)

    # --- Model verification (best-effort) ---
    model_id = lines[0].get("model", "unknown")
    model_verified = True
    verification_status = "VERIFIED"

    if model_id == "unknown":
        verification_status = "SKIPPED"
        model_verified = True  # No assertion made
        if expected_model:
            logger.info(
                "MODEL_VERIFICATION_SKIPPED - metadata not found"
            )
        else:
            logger.info(
                "MODEL_VERIFICATION_SKIPPED - metadata not found"
            )
    elif expected_model:
        model_verified = expected_model.lower() in model_id.lower()
        verification_status = "VERIFIED" if model_verified else "MISMATCH"
        if not model_verified:
            logger.warning(
                "Model mismatch: expected '%s', got '%s'",
                expected_model,
                model_id,
            )
    else:
        # No expected model provided, skip verification
        verification_status = "SKIPPED"
        model_verified = True  # No assertion made
        logger.info(
            "Model verification skipped - no expected model provided"
        )

    return {
        "agent_id": agent_id,
        "first_timestamp": first_timestamp_str,
        "last_timestamp": last_timestamp_str,
        "duration_seconds": round(duration_seconds, 2),
        "total_tool_calls": total_tool_calls,
        "tool_calls_by_type": tool_calls_by_type,
        "maproom_searches": maproom_searches,
        "maproom_contexts": maproom_contexts,
        "final_summary": final_summary,
        "summary_length": summary_length,
        "is_complete": complete,
        "model_id": model_id,
        "model_verified": model_verified,
        "model_verification_status": verification_status,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _build_parser():
    parser = argparse.ArgumentParser(
        description="Collect stats from Claude Code agent JSONL files.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--check-complete",
        metavar="AGENT_ID",
        nargs="?",
        const="__FROM_JSONL__",
        default=None,
        help=(
            "Check if agent is complete. Exit 0=complete, 1=incomplete. "
            "Provide agent ID, or omit when using --jsonl-path."
        ),
    )
    parser.add_argument(
        "--extract-metrics",
        metavar="AGENT_ID",
        nargs="?",
        const="__FROM_JSONL__",
        default=None,
        help=(
            "Extract metrics and print JSON to stdout. "
            "Provide agent ID, or omit when using --jsonl-path."
        ),
    )
    parser.add_argument(
        "--jsonl-path",
        metavar="PATH",
        default=None,
        help="Direct path to JSONL file (bypasses path discovery).",
    )
    parser.add_argument(
        "--project-dir",
        metavar="DIR",
        default=None,
        help="Explicit project directory name under ~/.claude/projects/.",
    )
    parser.add_argument(
        "--session-id",
        metavar="ID",
        default=None,
        help="Explicit session directory name within the project.",
    )
    parser.add_argument(
        "--expected-model",
        metavar="MODEL",
        default=None,
        help=(
            "Expected model name for verification. Uses substring, "
            "case-insensitive matching (e.g., 'haiku' matches "
            "'claude-3-haiku-20240307')."
        ),
    )
    return parser


def main():
    parser = _build_parser()
    args = parser.parse_args()

    # Validate that at least one mode is specified
    if args.check_complete is None and args.extract_metrics is None:
        parser.error(
            "You must specify --check-complete or --extract-metrics."
        )

    # Determine agent_id from the mode argument
    agent_id = None
    if args.check_complete is not None and args.check_complete != "__FROM_JSONL__":
        agent_id = args.check_complete
    elif args.extract_metrics is not None and args.extract_metrics != "__FROM_JSONL__":
        agent_id = args.extract_metrics

    # Resolve JSONL path
    jsonl_path = None
    if args.jsonl_path:
        jsonl_path = Path(args.jsonl_path)
        if not jsonl_path.exists():
            print(
                f"Error: JSONL file not found: {jsonl_path}",
                file=sys.stderr,
            )
            sys.exit(EXIT_NOT_FOUND)

        # If no agent_id was given on CLI, extract it from the JSONL
        if agent_id is None:
            try:
                with open(jsonl_path, "r", encoding="utf-8") as f:
                    first_obj = json.loads(f.readline().strip())
                    agent_id = first_obj.get("agentId")
                    if agent_id is None:
                        print(
                            "Error: Missing 'agentId' in first line of JSONL",
                            file=sys.stderr,
                        )
                        sys.exit(EXIT_MISSING_FIELDS)
            except json.JSONDecodeError as exc:
                print(f"Error: {exc}", file=sys.stderr)
                sys.exit(EXIT_PARSE_ERROR)
    else:
        if agent_id is None:
            parser.error(
                "You must provide an agent ID or use --jsonl-path."
            )
        try:
            jsonl_path = find_jsonl_path(
                agent_id,
                project_dir=args.project_dir,
                session_id=args.session_id,
            )
        except FileNotFoundError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            sys.exit(EXIT_NOT_FOUND)
        except json.JSONDecodeError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            sys.exit(EXIT_PARSE_ERROR)
        except ValueError as exc:
            msg = str(exc)
            if "mismatch" in msg.lower():
                print(f"Error: {exc}", file=sys.stderr)
                sys.exit(EXIT_ID_MISMATCH)
            elif "missing" in msg.lower():
                print(f"Error: {exc}", file=sys.stderr)
                sys.exit(EXIT_MISSING_FIELDS)
            else:
                print(f"Error: {exc}", file=sys.stderr)
                sys.exit(EXIT_OTHER_ERROR)

    # --- Execute the requested mode ---
    if args.check_complete is not None:
        try:
            complete = is_agent_complete(jsonl_path)
        except Exception as exc:
            print(f"Error checking completion: {exc}", file=sys.stderr)
            sys.exit(EXIT_OTHER_ERROR)

        if complete:
            print(f"Agent {agent_id} is COMPLETE")
            sys.exit(EXIT_SUCCESS)
        else:
            print(f"Agent {agent_id} is INCOMPLETE")
            sys.exit(EXIT_NOT_FOUND)  # Exit 1 = incomplete

    if args.extract_metrics is not None:
        try:
            metrics = extract_metrics(jsonl_path, expected_model=args.expected_model)
        except FileNotFoundError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            sys.exit(EXIT_NOT_FOUND)
        except json.JSONDecodeError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            sys.exit(EXIT_PARSE_ERROR)
        except ValueError as exc:
            msg = str(exc)
            if "mismatch" in msg.lower():
                print(f"Error: {exc}", file=sys.stderr)
                sys.exit(EXIT_ID_MISMATCH)
            elif "missing" in msg.lower() or "empty" in msg.lower():
                print(f"Error: {exc}", file=sys.stderr)
                sys.exit(EXIT_MISSING_FIELDS)
            else:
                print(f"Error: {exc}", file=sys.stderr)
                sys.exit(EXIT_OTHER_ERROR)
        except Exception as exc:
            print(f"Error: {exc}", file=sys.stderr)
            sys.exit(EXIT_OTHER_ERROR)

        print(json.dumps(metrics, indent=2))
        sys.exit(EXIT_SUCCESS)


if __name__ == "__main__":
    main()
