#!/usr/bin/env python3
"""
init-session.py -- SessionStart hook script for Arena scoreboard.

Reads the SessionStart hook JSON from stdin, derives the competition codebase
from the cwd field, writes session.json, and outputs a systemMessage JSON on stdout.

Usage:
    echo '{"session_id": "abc", "cwd": "/workspace/repos/django/django"}' | python3 init-session.py
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path


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


def derive_codebase(cwd):
    """Derive codebase name from the last path component of cwd.

    Args:
        cwd: The working directory path string.

    Returns:
        The codebase name string, or "unknown" if cwd is missing/empty/root.
    """
    if not cwd:
        print("Warning: cwd is missing or empty, defaulting codebase to 'unknown'", file=sys.stderr)
        return "unknown"
    basename = os.path.basename(cwd)
    if not basename:
        # e.g. cwd == "/"
        print("Warning: cwd '{}' has no basename, defaulting codebase to 'unknown'".format(cwd), file=sys.stderr)
        return "unknown"
    return basename


def read_existing_session(session_path):
    """Read existing session.json if it exists and has an explicit codebase.

    Returns:
        The existing session dict if it has a codebase field, else None.
    """
    try:
        with open(session_path, "r") as f:
            data = json.load(f)
        if "codebase" in data and data["codebase"]:
            return data
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        pass
    return None


def main(stdin_input=None):
    """Main entry point.

    Args:
        stdin_input: Optional file-like object for stdin (for testing).
    """
    if stdin_input is None:
        stdin_input = sys.stdin

    # Parse stdin JSON
    try:
        raw = stdin_input.read()
        hook_data = json.loads(raw)
    except (json.JSONDecodeError, ValueError) as e:
        print("Error: malformed JSON on stdin: {}".format(e), file=sys.stderr)
        sys.exit(1)

    session_id = hook_data.get("session_id", "")
    cwd = hook_data.get("cwd", "")

    data_dir = get_data_dir()
    session_path = os.path.join(data_dir, "session.json")

    # Check for operator override: if session.json already exists with explicit codebase, preserve it
    existing = read_existing_session(session_path)
    if existing is not None:
        codebase = existing["codebase"]
    else:
        codebase = derive_codebase(cwd)

    # Build session data
    session_data = {
        "session_id": session_id,
        "codebase": codebase,
        "started_at": datetime.utcnow().isoformat() + "Z",
    }

    # NOTE: Single-session limitation. If two Claude Code sessions start simultaneously
    # and both invoke init-session.py, the second write will overwrite the first session's
    # context. This system is designed for single-session use only.
    with open(session_path, "w") as f:
        json.dump(session_data, f, indent=2)
        f.write("\n")

    # Output systemMessage JSON to stdout (Claude Code reads this)
    output = {
        "systemMessage": "Olympics session initialized. Codebase: {}".format(codebase)
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
