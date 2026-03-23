# pipeline

Python scoring pipeline for Arena competitions.

## Scripts

- `scripts/init-session.py` -- SessionStart hook handler, writes session.json
- `scripts/log-round.py` -- PostToolUse hook, two modes:
  - `--mode=score`: Decomposes scored JSON into JSONL round entries
  - `--mode=agent`: Captures efficiency-only data from agent sentinels
- `scripts/generate-scoreboard.py` -- Converts rounds.jsonl into SCOREBOARD.md

## Testing

```bash
# Unit tests
python -m pytest tests/ -v

# E2E test
zsh tests/test-e2e.sh

# With custom data dir
ARENA_DATA_DIR=/tmp/test-data python -m pytest tests/ -v
```

## Data flow

Round execution -> scored JSON -> log-round.py -> data/rounds.jsonl -> generate-scoreboard.py -> data/SCOREBOARD.md

## Environment Variables

- `ARENA_DATA_DIR`: Override data directory location (default: `{repo_root}/data/`)
