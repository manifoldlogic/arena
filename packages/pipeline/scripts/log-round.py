#!/usr/bin/env python3
"""
log-round.py -- PostToolUse hook handler for Arena scoreboard.

Supports two modes:
  --mode=score  PostToolUse(Write) handler. Reads the hook JSON from stdin,
                checks if the written file is a scoring result, and if so,
                decomposes the comparative JSON into per-competitor JSONL lines
                in rounds.jsonl.  Triggers scoreboard regeneration.
  --mode=agent  PostToolUse(Agent) handler. Reads the hook JSON from stdin,
                checks for the Olympics sentinel pattern in tool_input, and if
                present, appends an efficiency-only JSONL line to rounds.jsonl.
                Does NOT trigger scoreboard regeneration.

Usage:
    echo '{"tool_input": {...}, "session_id": "abc"}' | python3 log-round.py --mode=score
    echo '{"tool_input": "...", "tool_response": {...}}' | python3 log-round.py --mode=agent
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime


SCORING_PATH_PATTERN = re.compile(r'.*/results/scored/[^/]+/[^/]+\.json$')
OLYMPICS_SENTINEL_PATTERN = re.compile(r'\[OLYMPICS_ROUND:([^:]+):([^\]]+)\]')

# FALLBACK: If OLYMP2's run-round.sh cannot inject the Olympics sentinel,
# disable this --mode=agent hook entry in .claude/settings.json entirely.
# All efficiency data (tool_calls, wall_time_seconds) is available via
# --mode=score from the comparative JSON. No data is lost by disabling --mode=agent.


def get_data_dir():
    """Return the Arena data directory, creating it if needed."""
    if "ARENA_DATA_DIR" in os.environ:
        data_dir = os.environ["ARENA_DATA_DIR"]
    else:
        # Default: {repo_root}/data/
        # Script location: packages/pipeline/scripts/this_script.py
        # Traverse: scripts/ -> pipeline/ -> packages/ -> repo_root/
        script_dir = os.path.dirname(os.path.abspath(__file__))
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(script_dir)))
        data_dir = os.path.join(repo_root, "data")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def read_session_json():
    """Read session.json for codebase fallback.

    Returns:
        The session dict, or empty dict if file not found.
    """
    data_dir = get_data_dir()
    session_path = os.path.join(data_dir, "session.json")
    try:
        with open(session_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print("Warning: session.json not found at {}".format(session_path), file=sys.stderr)
        return {}


def validate_score(value, field_name, competitor, round_id):
    """Validate that a score is an int between 1 and 5.

    Returns:
        The int value if valid, or None if invalid.
    """
    if value is None:
        print("Error: {} is None for competitor '{}' in round '{}'".format(
            field_name, competitor, round_id), file=sys.stderr)
        return None
    if not isinstance(value, int):
        print("Error: {} is not an int (got {}) for competitor '{}' in round '{}'".format(
            field_name, type(value).__name__, competitor, round_id), file=sys.stderr)
        return None
    if value < 1 or value > 5:
        print("Error: {} is {} (must be 1-5) for competitor '{}' in round '{}'".format(
            field_name, value, competitor, round_id), file=sys.stderr)
        return None
    return value


def handle_score_mode(stdin_json):
    """Handle --mode=score: decompose comparative scoring JSON into JSONL lines.

    Args:
        stdin_json: The parsed hook JSON dict from stdin.
    """
    tool_input = stdin_json.get("tool_input")
    if not isinstance(tool_input, dict):
        sys.exit(0)
    file_path = tool_input.get("file_path", "")

    # 1. Filter on path regex
    if not SCORING_PATH_PATTERN.match(file_path):
        sys.exit(0)

    # 2. Parse comparative JSON from tool_input.content
    scored_json = json.loads(tool_input.get("content", "{}"))

    # 3. Determine round_type from round_id prefix
    round_id = scored_json["round_id"]
    if round_id.startswith("BR"):
        round_type = "bridge"
    elif round_id.startswith("CAL"):
        round_type = "calibration"
    else:
        round_type = "regular"

    # 4. Read session.json for codebase fallback
    session = read_session_json()

    # 5. Select scores_dict BEFORE the loop
    if round_type == "bridge" and "series2_scores" in scored_json:
        scores_dict = scored_json["series2_scores"]
    else:
        scores_dict = scored_json["scores"]

    # 6. Loop over competitors
    data_dir = get_data_dir()
    rounds_path = os.path.join(data_dir, "rounds.jsonl")

    for competitor, score_data in scores_dict.items():
        measured = scored_json.get("measured", {}).get(competitor, {})

        precision = validate_score(score_data.get("precision"), "precision", competitor, round_id)
        recall = validate_score(score_data.get("recall"), "recall", competitor, round_id)
        insight = validate_score(score_data.get("insight"), "insight", competitor, round_id)

        if precision is None or recall is None or insight is None:
            continue

        total = precision + recall + insight

        line = {
            "schema_version": 1,
            "round_id": round_id,
            "competitor": competitor,
            "query_category": scored_json.get("query_category"),
            "query_text": scored_json.get("query_text"),
            "codebase": scored_json.get("codebase", session.get("codebase", "unknown")),
            "phase": scored_json.get("phase"),
            "round_type": round_type,
            "precision": precision,
            "recall": recall,
            "insight": insight,
            "total": total,
            "calls": measured.get("tool_calls"),
            "time_s": measured.get("wall_time_seconds"),
            "round_winner": scored_json.get("round_winner"),
            "judge_notes": scored_json.get("judge_notes_s2") if round_type == "bridge" else scored_json.get("judge_notes"),
            "divergence_signal": scored_json.get("divergence_signal"),
            "is_calibration": (round_type == "calibration"),
            "series1_scores": scored_json.get("series1_scores", {}).get(competitor) if round_type == "bridge" else None,
            "series1_baseline": scored_json.get("series1_baseline", {}).get(competitor) if round_type == "bridge" else None,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "session_id": stdin_json.get("session_id"),
            "source": "score",
        }

        with open(rounds_path, "a") as f:
            f.write(json.dumps(line) + "\n")

    # 7. Invoke generate-scoreboard.py
    script_dir = os.path.dirname(os.path.abspath(__file__))
    scoreboard_script_path = os.path.join(script_dir, "generate-scoreboard.py")
    subprocess.run(["python3", scoreboard_script_path])


def handle_agent_mode(stdin_json):
    """Handle --mode=agent: capture efficiency data from Olympics agent invocations.

    Filters on the Olympics sentinel in tool_input. If absent, exits 0 immediately.
    If present, extracts round_id and competitor, then appends an agent-mode JSONL line.
    """
    tool_input_str = str(stdin_json.get("tool_input", ""))

    # Filter: check for Olympics sentinel
    match = OLYMPICS_SENTINEL_PATTERN.search(tool_input_str)
    if not match:
        sys.exit(0)  # not an Olympics agent, exit immediately

    round_id = match.group(1)
    competitor = match.group(2)

    # Extract efficiency data defensively from tool_response
    tool_response = stdin_json.get("tool_response", {})
    # NOTE: The exact field structure of tool_response for the Agent tool is
    # tool-version-dependent. Use defensive .get() access; write null if not found.
    if isinstance(tool_response, dict):
        calls = tool_response.get("tool_calls")
        time_s = tool_response.get("wall_time_seconds")
    else:
        calls = None
        time_s = None

    if calls is None or time_s is None:
        print("Warning: Could not extract efficiency data from tool_response for {} in round {}".format(
            competitor, round_id), file=sys.stderr)

    # Build agent-mode JSONL line (score fields explicitly null)
    line = {
        "schema_version": 1,
        "round_id": round_id,
        "competitor": competitor,
        "query_category": None,
        "query_text": None,
        "codebase": None,
        "phase": None,
        "round_type": None,
        "precision": None,
        "recall": None,
        "insight": None,
        "total": None,
        "calls": calls,
        "time_s": time_s,
        "round_winner": None,
        "judge_notes": None,
        "divergence_signal": None,
        "is_calibration": False,
        "series1_scores": None,
        "series1_baseline": None,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "session_id": stdin_json.get("session_id"),
        "source": "agent",
    }

    # Atomic append
    data_dir = get_data_dir()
    rounds_path = os.path.join(data_dir, "rounds.jsonl")
    with open(rounds_path, "a") as f:
        f.write(json.dumps(line) + "\n")

    # NOTE: Agent mode does NOT invoke generate-scoreboard.py.
    # Scoreboard regeneration is triggered only by --mode=score.


def main(stdin_input=None):
    """Main entry point.

    Args:
        stdin_input: Optional dict for testing (parsed JSON). If None, reads from stdin.
    """
    parser = argparse.ArgumentParser(description="Log round results for Arena scoreboard")
    parser.add_argument("--mode", choices=["agent", "score"], required=True,
                        help="Mode: 'agent' or 'score'")
    args = parser.parse_args()

    if stdin_input is None:
        try:
            raw = sys.stdin.read()
            stdin_json = json.loads(raw)
        except (json.JSONDecodeError, ValueError) as e:
            print("Error: malformed JSON on stdin: {}".format(e), file=sys.stderr)
            sys.exit(0)
    else:
        stdin_json = stdin_input

    if args.mode == "agent":
        handle_agent_mode(stdin_json)
    else:
        handle_score_mode(stdin_json)


if __name__ == "__main__":
    main()
