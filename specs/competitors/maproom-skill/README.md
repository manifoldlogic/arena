# maproom-skill Competitor

## Purpose

This competitor tests a specific hypothesis: **can a stronger model with a minimal
prompt match or exceed a weaker model with a carefully engineered prompt?**

The maproom competitor (OLYMP-SKILL.1001) pairs Haiku with a detailed 75-line prompt
that includes search strategy phases, iteration heuristics, tool-selection guidance,
and efficiency targets. The maproom-skill competitor strips all of that away, giving
Opus the same maproom FTS tool but with a prompt under 20 lines.

## How It Differs From Other Competitors

### vs. maproom (Haiku + engineered prompt)

- **Same tool**: Both use the crewchief-maproom CLI for full-text search.
- **Different model**: maproom uses `claude-haiku-4-5-20251001`; maproom-skill uses
  `claude-opus-4-20250514`.
- **Different prompt**: maproom has a 75-line prompt with search strategy, iteration
  guidance, tool-selection table, and efficiency heuristics. maproom-skill has a
  minimal prompt (~15 lines) that provides only tool syntax and output format.

### vs. explore (Haiku + agent tools)

- **Different paradigm entirely**: explore uses the built-in Agent/Explore tool for
  autonomous codebase navigation. maproom-skill uses indexed FTS via maproom CLI.
- **Different model**: explore uses Haiku; maproom-skill uses Opus.

## The "No Strategy Coaching" Constraint

The prompt deliberately excludes:

- **Workflow phases** (start with X, then confirm with Y)
- **Termination heuristics** (stop after N searches, know when to quit)
- **Conditional strategies** (if query type is X, do Y)
- **Failure mode handling** (if no results, reformulate with synonyms)
- **Search loop prevention** (do not re-search for information already found)

The scoring gap between maproom and maproom-skill will quantify how much value prompt
engineering adds over raw model capability.

## Configuration Notes

- **Model pinned**: `claude-opus-4-20250514` for reproducible results across rounds.
- **Shared setup**: Reuses `competitors/maproom/setup.sh` for index building.
- **Performance budget**: Provisional; will be recalibrated in Phase 3 based on
  actual Opus behavior.
- **Paradigm**: `skill-based` to distinguish from maproom's `indexed-fts` axis.
