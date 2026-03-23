# Search Olympics v2 - Workflow Guide

This document is the operational manual for running a Search Olympics benchmark.
It covers both the **automated scoring pipeline** (primary workflow) and the
**manual fallback workflow** for troubleshooting.

**Harness directory:** `/workspace/_SPECS/mattermost/harness/search-olympics/`

**Key v2 changes from v1:**

- All scoring dimensions use a **1-5 scale** (replaces old 3-point scale)
- Automated scoring pipeline via `run-benchmark.sh`
- **3-run protocol** with statistical aggregation (mean, stdev, confidence)
- Model verification via `--expected-model` flag
- Ground truth files use tiered coverage (Required-Easy / Required-Hard / Expected / Bonus)
- Max score per query: **20** (4 dimensions x 5). Max total: **180** (9 queries x 20)

---

## Quick Start

Run a complete benchmark in two steps:

```bash
# Step 1: Launch agents manually (see "Agent Launching" below)
# Agents produce JSONL files in ~/.claude/projects/

# Step 2: Run the automated scoring pipeline
cd /workspace/_SPECS/mattermost/harness/search-olympics
./run-benchmark.sh
```

For a dry-run to validate configuration without scoring:

```bash
./run-benchmark.sh --dry-run
```

---

## Step 1: Agent Launching (Manual)

Agents are launched **manually** via Claude Code's Task tool. The automated
pipeline (`run-benchmark.sh`) does NOT launch agents -- it only scores their
output.

### How to launch agents

For each query in `benchmark.json`, spawn both agents in a single Claude Code
response using two Task tool calls. Both agents receive the same query text but
different system prompts.

**Explore Agent:**

```
Task(
    subagent_type="code-search",
    prompt="<contents of prompts/explore-agent.md>\n\n## Query\n\n<query text>",
    description="Explore agent for Q4: How are environment variables loaded and validated?"
)
```

**Maproom Agent:**

```
Task(
    subagent_type="code-search",
    prompt="<contents of prompts/maproom-agent.md>\n\n## Query\n\n<query text>",
    description="Maproom agent for Q4: How are environment variables loaded and validated?"
)
```

**Both Task calls must appear in the same response** so they launch in parallel.

### Agent output

Each agent produces a JSONL file in `~/.claude/projects/`. The scoring pipeline
locates these files automatically, or you can place them in the conventional
directory structure:

```
runs/
  run1/
    explore-Q4.jsonl
    maproom-Q4.jsonl
    explore-Q5.jsonl
    ...
  run2/
    explore-Q4.jsonl
    ...
  run3/
    ...
```

### Prompt templates

Read the prompt templates before launching:

```
prompts/explore-agent.md   - Explore agent system prompt
prompts/maproom-agent.md   - Maproom agent system prompt
```

### What can go wrong

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Task tool returns error | Error response from Task call | Record `SPAWN_ERROR`, skip to next query |
| Wrong prompt injected | Manual review of Task call | Re-launch the agent with the correct prompt |
| Only one agent launched | Missing agent ID in records | Launch the missing agent before proceeding |

---

## Step 2: Automated Scoring

The `run-benchmark.sh` script automates the entire scoring pipeline after agents
have been launched and their JSONL files are available.

### Basic usage

```bash
./run-benchmark.sh
```

This runs the full pipeline:
1. Pre-flight checks (config validation, file existence)
2. Config loading and results initialization
3. Metric extraction from JSONL files (via `collect-stats.py`)
4. Mechanical scoring (Speed, Efficiency)
5. Judge invocation for Coverage and Accuracy (via `claude -p --model haiku`)
6. Statistical aggregation (if multi-run)
7. Markdown report generation

### CLI flags

| Flag | Description | Example |
|------|-------------|---------|
| `--dry-run` | Validate config and pre-flight checks only; do not score | `./run-benchmark.sh --dry-run` |
| `--score-only` | Skip agent launching checks, score existing JSONL files | `./run-benchmark.sh --score-only` |
| `--query Q_ID` | Run scoring for a single query (debugging) | `./run-benchmark.sh --query Q4` |
| `--runs N` | Override `runs_per_query` from benchmark.json | `./run-benchmark.sh --runs 1` |
| `--resume FILE` | Resume from a partial results JSON file | `./run-benchmark.sh --resume results/run-partial.json` |
| `--no-report` | Skip Markdown report generation | `./run-benchmark.sh --no-report` |
| `--help` | Show usage message | `./run-benchmark.sh --help` |

### Exit codes

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | Configuration error (missing files, invalid JSON) |
| 2 | Runtime error (scoring failure, judge error) |

### Common workflows

**Debug a single query:**

```bash
./run-benchmark.sh --runs 1 --query Q4
```

**Re-score existing data after changing thresholds:**

```bash
./run-benchmark.sh --score-only
```

**Resume after a crash or interruption:**

```bash
./run-benchmark.sh --resume results/run-20260214-143000.json
```

**Validate everything before a full run:**

```bash
./run-benchmark.sh --dry-run
```

---

## Scoring System

All four scoring dimensions use a **1-5 scale**. Higher is better.

### Speed (mechanical)

Scored automatically based on `duration_seconds` from JSONL metrics.

| Duration | Score |
|----------|-------|
| < 45 seconds | 5 |
| 45 - 60 seconds | 4 |
| 60 - 90 seconds | 3 |
| 90 - 120 seconds | 2 |
| > 120 seconds | 1 |

Thresholds are configured in `benchmark.json` at `scoring.speed.thresholds`:
`[45, 60, 90, 120]`.

### Efficiency (mechanical)

Scored automatically based on `total_tool_calls` from JSONL metrics.

| Tool Calls | Score |
|------------|-------|
| < 20 calls | 5 |
| 20 - 30 calls | 4 |
| 30 - 45 calls | 3 |
| 45 - 60 calls | 2 |
| > 60 calls | 1 |

Thresholds are configured in `benchmark.json` at `scoring.efficiency.thresholds`:
`[20, 30, 45, 60]`.

### Coverage (judge-scored)

Scored by an LLM judge using the coverage prompt template
(`prompts/judge-coverage.md`). The judge evaluates how well the agent's summary
covers the ground truth's coverage topics.

Coverage topics in ground truth files are organized into tiers:

| Tier | Description |
|------|-------------|
| **Required-Easy** | Core items any competent search should find |
| **Required-Hard** | Important items that need deeper investigation |
| **Expected** | Items a thorough search would cover |
| **Bonus** | Extra-credit items beyond normal expectations |

The judge assigns a score from 1-5 based on how many tiers the agent covered.

### Accuracy (judge-scored)

Scored by an LLM judge using the accuracy prompt template
(`prompts/judge-accuracy.md`). The judge evaluates factual correctness of the
agent's summary against accuracy markers in the ground truth.

Errors are categorized as:

| Error Type | Severity | Description |
|------------|----------|-------------|
| `factual_error` | Major | Objectively wrong statements about the code |
| `terminological_imprecision` | Minor | Imprecise but not fundamentally wrong terminology |

The judge penalizes `factual_error` more heavily than `terminological_imprecision`.

### Score summary

| Metric | Scoring Method | Range | Max per Query |
|--------|---------------|-------|---------------|
| Speed | Mechanical (duration) | 1-5 | 5 |
| Efficiency | Mechanical (tool calls) | 1-5 | 5 |
| Coverage | LLM Judge | 1-5 | 5 |
| Accuracy | LLM Judge | 1-5 | 5 |
| **Total** | Sum | **4-20** | **20** |

**Max total across 9 queries: 180**

---

## 3-Run Protocol

To reduce variance from LLM non-determinism, v2 supports running each query
multiple times per agent.

### Configuration

The `runs_per_query` parameter in `benchmark.json` controls how many times each
query is run per agent. Default: **3**.

```json
{
  "benchmark": {
    "runs_per_query": 3
  }
}
```

Override at runtime:

```bash
./run-benchmark.sh --runs 1    # Single run (fast debugging)
./run-benchmark.sh --runs 5    # Five runs (higher confidence)
```

### JSONL file convention

For multi-run benchmarks, place JSONL files in run-numbered subdirectories:

```
runs/
  run1/explore-Q4.jsonl
  run1/maproom-Q4.jsonl
  run2/explore-Q4.jsonl
  run2/maproom-Q4.jsonl
  run3/explore-Q4.jsonl
  run3/maproom-Q4.jsonl
```

Alternative flat naming is also supported:

```
runs/explore-Q4-run1.jsonl
runs/explore-Q4-run2.jsonl
```

### Statistical aggregation

When `runs_per_query > 1`, the pipeline computes per-dimension statistics:

- **Mean score** per dimension per agent per query
- **Standard deviation** per dimension per agent per query
- **Mean total score** across all dimensions
- **Standard deviation of total scores**

These statistics are stored in the results JSON under each agent's `statistics`
field.

### Confidence indicator

The winner determination includes a confidence level based on the margin between
agents relative to score variance:

| Confidence | Condition |
|------------|-----------|
| **High** | Margin > 2 x max(stdev of both agents) |
| **Medium** | Margin > 1 x max(stdev of both agents) |
| **Low** | Margin <= max(stdev of both agents) |

For single-run benchmarks (stdev = 0), any non-zero margin yields **high**
confidence.

Example interpretation:
- Explore mean total: 142, stdev: 5.2
- Maproom mean total: 130, stdev: 4.8
- Margin: 12, max stdev: 5.2
- 12 > 2 x 5.2 = 10.4 --> **High confidence**

---

## Model Verification

The `collect-stats.py` script supports best-effort model verification to confirm
agents ran on the expected model.

### Usage

```bash
python3 collect-stats.py --extract-metrics --jsonl-path agent.jsonl --expected-model haiku
```

### Verification statuses

| Status | Meaning |
|--------|---------|
| **VERIFIED** | Model metadata found and matches expected model (case-insensitive substring match) |
| **MISMATCH** | Model metadata found but does NOT match expected model |
| **SKIPPED** | No `--expected-model` flag provided, or model metadata not found in JSONL |

### Behavior

- Verification is **best-effort**: it does not block execution on missing metadata
- The `model` field is read from the first line of the JSONL file
- Match is case-insensitive substring (e.g., `--expected-model haiku` matches `claude-3-haiku-20240307`)
- A `MISMATCH` generates a warning log but does not cause a non-zero exit code
- Results include `model_id`, `model_verified`, and `model_verification_status` fields

---

## Ground Truth Files

Ground truth files define the expected answer for each query. They are located in
`ground-truth/` and referenced by `benchmark.json`.

### Structure

Each ground truth file contains these sections:

```markdown
# Q4: How are environment variables loaded and validated?

## Coverage Topics

### Required-Easy
- Item 1: Basic facts any search should find
- Item 2: ...

### Required-Hard
- Item 3: Deeper facts requiring more investigation
- Item 4: ...

### Expected
- Item 5: Items a thorough search would cover
- Item 6: ...

### Bonus
- Item 7: Extra-credit items
- Item 8: ...

## Accuracy Markers

### factual_error
- Marker 1: A specific fact that must be stated correctly
- Marker 2: ...

### terminological_imprecision
- Marker 3: Terminology that should be precise but minor if slightly off
- Marker 4: ...
```

### Coverage tiers

| Tier | Purpose | Impact on Score |
|------|---------|-----------------|
| Required-Easy | Baseline items | Missing these = low coverage score |
| Required-Hard | Important deeper items | Covering these lifts score significantly |
| Expected | Thorough coverage markers | Full coverage of these = high score |
| Bonus | Beyond expectations | Adds to score but not required for top marks |

### Accuracy markers

| Type | Severity | Example |
|------|----------|---------|
| `factual_error` | Major penalty | "File X exports function Y" when it actually exports Z |
| `terminological_imprecision` | Minor penalty | Calling a "reducer" a "handler" |

---

## Pre-flight Checks

Before running the benchmark, verify the environment. The `run-benchmark.sh`
script performs these automatically, but they can also be run manually.

### Verify crewchief-maproom (for Maproom agent)

```bash
command -v crewchief-maproom
crewchief-maproom search --repo mattermost-webapp --query "test" --k 1
```

### Verify benchmark.json

```bash
python3 -c "import json; json.load(open('benchmark.json'))" && echo "VALID"
```

### Verify ground truth files

```bash
./run-benchmark.sh --dry-run
```

The dry-run validates all ground truth files, judge prompt templates, and Python
scripts exist.

### Verify claude CLI

```bash
echo "Hello" | claude -p --model haiku 2>&1 | head -5
```

### Verify collect-stats.py

```bash
python3 collect-stats.py --help
```

---

## Manual Workflow (Fallback)

This section preserves the manual step-by-step workflow for troubleshooting or
when the automated pipeline is unavailable. All score references below use the
v2 **1-5 scale**.

### Manual Phase 1: Configuration

1. Read `benchmark.json` and note queries, agents, and scoring thresholds.
2. Create an empty results JSON structure.

### Manual Phase 2: Agent launching

1. Read prompt templates (`prompts/explore-agent.md`, `prompts/maproom-agent.md`).
2. For each query, launch both agents via Task tool (as described in Step 1 above).
3. Record agent IDs.

### Manual Phase 3: Completion detection

Poll for agent completion using `collect-stats.py`:

```bash
python3 collect-stats.py --check-complete <agent-id>
```

- Exit code 0: Agent is complete
- Exit code 1: Agent is still running (poll again in 15 seconds)
- Timeout after 180 seconds: Record as `AGENT_TIMEOUT`

### Manual Phase 4: Metric extraction

Extract metrics from completed agents:

```bash
python3 collect-stats.py --extract-metrics <agent-id>
```

Output includes `duration_seconds`, `total_tool_calls`, `tool_calls_by_type`,
`final_summary`, and more.

### Manual Phase 5: Mechanical scoring

Apply the **1-5 scoring** thresholds manually:

**Speed scoring** (thresholds: `[45, 60, 90, 120]`):

| Duration | Score |
|----------|-------|
| < 45s | 5 |
| 45-60s | 4 |
| 60-90s | 3 |
| 90-120s | 2 |
| > 120s | 1 |

**Efficiency scoring** (thresholds: `[20, 30, 45, 60]`):

| Tool Calls | Score |
|------------|-------|
| < 20 | 5 |
| 20-30 | 4 |
| 30-45 | 3 |
| 45-60 | 2 |
| > 60 | 1 |

### Manual Phase 6: Judge scoring

Invoke judges via `claude -p --model haiku`:

```bash
cat <<'PROMPT_EOF' | claude -p --model haiku
<filled judge prompt with placeholders replaced>
PROMPT_EOF
```

Parse the `SCORE: N` line from judge output (N must be 1-5).

Run four judge calls per query: Coverage + Accuracy for each agent.

### Manual Phase 7: Aggregation and reporting

1. Sum all four dimension scores per agent per query. Max per query: 20.
2. Sum across all queries. Max total: 180 (9 queries).
3. Determine winner by highest total.
4. If multi-run, compute mean and stdev for each dimension.

### Score calculation example (v2)

```
Query Q4 -- Explore Agent:
  Speed:      3 (75s, between 60-90s threshold)
  Efficiency: 4 (25 calls, between 20-30 threshold)
  Coverage:   4 (judge score)
  Accuracy:   5 (judge score)
  Total:      16/20

Query Q4 -- Maproom Agent:
  Speed:      4 (52s, between 45-60s threshold)
  Efficiency: 5 (18 calls, under 20 threshold)
  Coverage:   3 (judge score)
  Accuracy:   4 (judge score)
  Total:      16/20 (tie)
```

### v1 to v2 comparison

| Aspect | v1 (3-point) | v2 (5-point) |
|--------|-------------|-------------|
| Score range per dimension | 1-3 | 1-5 |
| Max per query | 12 | 20 |
| Max total (9 queries) | 108 | 180 |
| Speed thresholds | [90, 150] | [45, 60, 90, 120] |
| Efficiency thresholds | [30, 60] | [20, 30, 45, 60] |
| Scoring pipeline | Manual | Automated (run-benchmark.sh) |
| Multi-run | No | Yes (3-run default) |
| Model verification | No | Yes (--expected-model) |

---

## Troubleshooting

### run-benchmark.sh issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Exit code 1 on startup | Missing or invalid `benchmark.json` | Run `./run-benchmark.sh --dry-run` to identify missing files |
| Exit code 2 during scoring | JSONL file not found or parse error | Check JSONL files exist in `runs/` directory with correct naming |
| "claude CLI not found" warning | `claude` not in PATH | Install Claude CLI or check PATH configuration |
| Judge returns JUDGE_ERROR | Malformed judge output (no `SCORE: N` line) | Script retries up to 3 times with exponential backoff. Check claude CLI auth. |

### Missing JSONL files

The scoring pipeline searches for JSONL files in this order:

1. `runs/run<N>/<agent>-<qid>.jsonl` (preferred, multi-run)
2. `runs/<agent>-<qid>.jsonl` (single-run fallback)
3. `runs/<agent>-<qid>-run<N>.jsonl` (flat naming alternative)

If files are not found, verify:
- Agent was launched and completed successfully
- JSONL files are in the correct directory with the correct naming convention
- Run `ls runs/` to inspect available files

For direct path specification with `collect-stats.py`:

```bash
python3 collect-stats.py --extract-metrics --jsonl-path /full/path/to/agent.jsonl
```

### Judge failures and retries

The `invoke_judge()` function in `run-benchmark.sh` implements:

- Up to 3 retry attempts per judge call
- Exponential backoff (1s, 2s between retries)
- `JUDGE_ERROR` fallback: if all retries fail, score defaults to 0
- Judge output is parsed by `scoring.parse_judge_score()` which expects `SCORE: N` (1-5)

To debug judge failures:

1. Check claude CLI authentication: `echo "test" | claude -p --model haiku`
2. Render the judge prompt manually and inspect it for issues
3. Re-run with `--query Q4` to isolate the failing query

### Resuming interrupted runs

If the pipeline crashes mid-run:

1. Find the partial results file in `results/`
2. Resume: `./run-benchmark.sh --resume results/run-20260214-143000.json`
3. The pipeline skips already-scored query/agent/run combinations

### collect-stats.py exit codes

| Exit Code | Meaning | Action |
|-----------|---------|--------|
| 0 | Success | Proceed normally |
| 1 | JSONL file not found / agent incomplete | Check file path, wait for agent completion |
| 2 | JSONL parse error | Check for file corruption; re-run agent |
| 3 | Agent ID mismatch | Use `--jsonl-path` to specify correct file |
| 4 | Missing required fields | Inspect first line of JSONL: `head -1 file.jsonl \| python3 -m json.tool` |
| 5 | Other errors | Read error message for details |

---

## Quick Reference: Commands

| Action | Command |
|--------|---------|
| Full benchmark run | `./run-benchmark.sh` |
| Dry-run validation | `./run-benchmark.sh --dry-run` |
| Single query debug | `./run-benchmark.sh --query Q4` |
| Score existing data | `./run-benchmark.sh --score-only` |
| Resume from crash | `./run-benchmark.sh --resume results/run-partial.json` |
| Override run count | `./run-benchmark.sh --runs 1` |
| Check agent completion | `python3 collect-stats.py --check-complete <agent-id>` |
| Extract metrics | `python3 collect-stats.py --extract-metrics <agent-id>` |
| Extract with explicit path | `python3 collect-stats.py --extract-metrics --jsonl-path /path/to/file.jsonl` |
| Model verification | `python3 collect-stats.py --extract-metrics --jsonl-path file.jsonl --expected-model haiku` |
| Narrow path discovery | `--project-dir <hash> --session-id <uuid>` (append to collect-stats.py commands) |
| Judge call (manual) | `cat <<'EOF' \| claude -p --model haiku` ... `EOF` |
| Validate config | `python3 -c "import json; json.load(open('benchmark.json'))"` |
