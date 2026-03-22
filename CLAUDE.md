# CLAUDE.md — Arena

######## IMPORTANT! SHELL TARGET: ZSH ######## IMPORTANT! SHELL TARGET: ZSH ########
All commands execute in ZSH. Use POSIX-compatible syntax. Never use bash-only syntax.
Avoid: $RANDOM, [[ ]], bash arrays, `which`. Use: command -v, [ ], grep -E, portable syntax.
######## IMPORTANT! SHELL TARGET: ZSH ######## IMPORTANT! SHELL TARGET: ZSH ########

## What Is This

Arena is a monorepo for benchmarking, comparing, and visualizing AI agent capabilities. It consolidates the "Olympics" competition framework — scoring pipelines, web dashboards, benchmark codebases, and analysis tools — into a single, well-structured repo.

The goal: direct available compute strategically by observing, visualizing, and quantifying the areas we want to improve.

## Architecture

```
arena/
├── packages/
│   ├── web-ui/          # Dashboard: shadcn + tailwind + d3.js charting
│   ├── pipeline/        # Scoring pipeline: round logging, scoreboard generation
│   └── schemas/         # Shared JSONL schemas, TypeScript types, validators
├── codebases/           # Git submodules of benchmark targets
│   ├── mattermost-webapp/
│   ├── django/
│   └── fastapi/
├── data/                # Competition data (rounds.jsonl, results/, sessions/)
├── specs/               # Competition specs, rubrics, competitor configs
└── docs/                # Architecture decisions, guides
```

## Component Index

| Path | What | CLAUDE.md |
|------|------|-----------|
| `packages/web-ui/` | React dashboard with shadcn/tailwind/d3 | `packages/web-ui/CLAUDE.md` |
| `packages/pipeline/` | Python scoring pipeline (log-round, generate-scoreboard) | `packages/pipeline/CLAUDE.md` |
| `packages/schemas/` | Shared data schemas and validators | `packages/schemas/CLAUDE.md` |
| `codebases/` | Git submodule benchmark targets | — |
| `data/` | JSONL competition data (authority source) | — |
| `specs/` | Competition specifications and rubrics | — |

## Quick Reference

```bash
# Web UI
pnpm --filter web-ui dev          # Dev server
pnpm --filter web-ui build        # Production build
pnpm --filter web-ui test         # Run tests

# Pipeline
python packages/pipeline/scripts/log-round.py --mode=score  # Log scored round
python packages/pipeline/scripts/generate-scoreboard.py      # Regenerate scoreboard

# All packages
pnpm test                         # Test everything
pnpm lint                         # Lint everything
pnpm typecheck                    # Type-check everything
```

## Data Flow

```
Round execution → results/scored/{codebase}/{round}.json
                       ↓
              log-round.py --mode=score
                       ↓
              data/rounds.jsonl (append-only authority)
                       ↓
              generate-scoreboard.py
                       ↓
              data/SCOREBOARD.md + web-ui (live via SSE)
```

## Key Conventions

- **JSONL is the authority**: `data/rounds.jsonl` is the single source of truth for all competition data
- **Atomic writes**: All JSONL appends use write-to-temp + rename for crash safety
- **Schema versioned**: Every JSONL line carries `schema_version` for forward compatibility
- **Submodules are read-only benchmarks**: Never commit changes into codebases/ — they're reference targets
- **Python pipeline, TypeScript UI**: Pipeline stays Python (existing, tested). Dashboard is TypeScript/React.

## Git Workflow

```bash
git fetch origin main
git rebase origin/main  # Before any commit
```

## Safety Rules

**File operations must stay within this worktree.**

Never modify: system directories, home files outside worktree, other repositories, `.git` directory, files inside `codebases/` submodules.
