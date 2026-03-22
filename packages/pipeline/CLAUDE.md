# pipeline

Python scoring pipeline for Arena competitions.

## Scripts

- `scripts/init-session.py` — SessionStart hook handler, writes session.json
- `scripts/log-round.py` — PostToolUse hook, two modes:
  - `--mode=score`: Decomposes scored JSON into JSONL round entries
  - `--mode=agent`: Captures efficiency-only data from agent sentinels
- `scripts/generate-scoreboard.py` — Converts rounds.jsonl into SCOREBOARD.md

## Testing

```bash
python -m pytest tests/
```

## Data flow

Round execution → scored JSON → log-round.py → rounds.jsonl → generate-scoreboard.py → SCOREBOARD.md
