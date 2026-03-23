# Scoring Rubric — Search Olympics Series 2

## Overview

Each round produces scores on **5 dimensions**: 3 judged comparatively (1-5 scale) and 2 measured automatically (raw numbers). The maximum judged score per round is **15** (three dimensions at 5 each). Raw efficiency numbers are reported alongside judged scores but do not count toward the total.

Judging is **comparative**: Opus sees all competitors' answers to the same query side-by-side and scores them relative to each other. This eliminates calibration drift and directly produces relative rankings.

---

## Judged Dimensions (1-5 each, comparative)

### Precision (merges Series 1 Accuracy + Relevance)

**What it measures:** Are the cited results correct and relevant?

| Score | Description | Example |
|-------|-------------|---------|
| 1 | Mostly incorrect or irrelevant results cited. Major factual errors or results that do not address the query. | Agent cites 8 files, only 1 is actually relevant; several contain factual misstatements about what the code does. |
| 2 | Mix of correct and incorrect results. Some relevant citations but significant noise or errors. | Agent finds the right general area but includes several false positives and misidentifies one function's purpose. |
| 3 | Majority of cited results are correct and relevant. Minor errors or a small amount of noise. | Agent cites 5 locations, 4 are correct and relevant, 1 is tangentially related but not wrong. |
| 4 | Nearly all cited results are correct and relevant. At most trivial imprecisions. | Agent cites 6 locations, all correct. One citation could be more specific (points to file instead of function). |
| 5 | All cited results are correct and directly relevant. Zero noise, zero errors. | Every citation points to exactly the right location with accurate description of what the code does. |

### Recall (replaces Series 1 Coverage)

**What it measures:** Were all key locations found?

| Score | Description | Example |
|-------|-------------|---------|
| 1 | Missed most key locations. Found only the most obvious entry point or none at all. | Query asks about error handling flow; agent finds only the top-level handler, misses 4 other critical paths. |
| 2 | Found some key locations but missed important ones. Partial picture of the answer. | Agent finds 2 of 5 key files. The missing files contain important logic that changes the answer. |
| 3 | Found most key locations. The answer is substantially complete but missing 1-2 secondary locations. | Agent finds 4 of 5 key files. The missing file adds nuance but the core answer is correct. |
| 4 | Found nearly all key locations. At most one minor location missing that does not materially change the answer. | Agent finds all primary locations. One edge-case handler in a test file is not mentioned. |
| 5 | Found all key locations. Complete coverage of the answer space. | Every relevant file, function, and connection identified. Nothing material is missing. |

### Insight (replaces Series 1 Depth)

**What it measures:** Does the answer explain connections, not just list locations?

| Score | Description | Example |
|-------|-------------|---------|
| 1 | Pure list of files/functions with no explanation of how they relate. | "Found in: file1.ts, file2.ts, file3.ts" with no further analysis. |
| 2 | Basic descriptions of what each location does, but no connections drawn between them. | Agent describes each file individually but does not explain the data flow or call chain between them. |
| 3 | Some connections explained. Agent identifies the main flow or pattern but misses secondary relationships. | Agent explains the primary call chain but does not note the error handling branch or the configuration dependency. |
| 4 | Good explanation of connections and patterns. Identifies the architectural reasoning or design pattern. | Agent traces the full flow, identifies the pattern (e.g., "this is a middleware chain"), and notes key decision points. |
| 5 | Exceptional insight. Identifies non-obvious connections, explains why the code is structured this way, or surfaces implications. | Agent not only traces the flow but explains the trade-off the original authors made, identifies a potential issue, or connects to a broader architectural pattern. |

---

## Measured Dimensions (raw numbers, not scored)

### Tool Calls (raw count)

**What it measures:** The actual number of tool calls the agent made during the round.

- Reported as-is. No banding, no conversion to a score.
- Each competitor's paradigm has different expected ranges. Reporting raw numbers avoids the complexity of paradigm-relative thresholds.
- Reference ranges (for context, not scoring):
  - Explore (text/regex): typically 30-50 calls
  - Maproom (indexed FTS): typically 15-25 calls
  - ast-grep (structural AST): typically 5-10 calls

**Rationale for raw numbers (Architecture Decision 4):** The original Series 1 banded approach (e.g., <30 calls = 3pts) was calibrated for Explore vs Maproom. Adding ast-grep (5-8 calls) or grepai would require paradigm-relative thresholds, which add complexity without adding insight. A flat threshold would reward a tool that makes one confident-but-wrong call over one that makes 35 careful-but-correct calls. Raw numbers are simpler and more honest. If raw numbers prove hard to compare across paradigms, per-paradigm reference points can be added in the analysis report.

### Wall Time (raw seconds)

**What it measures:** The actual elapsed wall-clock time from when the competitor started to when it finished.

- Reported as-is. No banding, no conversion to a score.
- Competitors run sequentially (not concurrently) so wall times are valid per-competitor measurements.
- Reference ranges (for context, not scoring):
  - Explore: typically 120-300 seconds
  - Maproom: typically 60-180 seconds
  - ast-grep: typically 20-60 seconds

---

## Scoring Summary

| Dimension | Type | Scale | Counts Toward Total |
|-----------|------|-------|---------------------|
| Precision | Judged, comparative | 1-5 | Yes |
| Recall | Judged, comparative | 1-5 | Yes |
| Insight | Judged, comparative | 1-5 | Yes |
| Tool calls | Measured | Raw count | No (reported alongside) |
| Wall time | Measured | Raw seconds | No (reported alongside) |

**Max judged score per round: 15**

### Cost (Cost Efficiency)

- **What it measures:** API cost in USD for the round.
- **Type:** Measured (not judged). **Not used in quality score calculation.**
- **Unit:** USD
- **JSON fields:** `actual_cost_usd` (from billing), `estimated_cost_usd` (from formula, retained for backward compatibility)
- **Cost source field:** `cost_source` at the round level indicates the data source

#### Preferred Method: Actual Billing

When using `claude -p --output-format json`, the response includes `total_cost_usd` from Claude Code's billing system. This is the authoritative cost figure.

#### Fallback Method: Character-Based Estimation

When actual billing is unavailable, cost can be estimated:

```text
estimated_cost_usd = (estimated_input_tokens * input_price_per_token) + (estimated_output_tokens * output_price_per_token)
```

Token estimation uses ~4 characters per token. **Warning:** Pilot calibration showed the formula underestimates input tokens by ~1,600x for multi-turn sessions. Use actual billing whenever possible.

#### Pricing Table

Versioned to model strings. Re-verify at <https://anthropic.com/pricing> if model versions change.

| Model | Model String | Input ($/Mtok) | Output ($/Mtok) |
|-------|-------------|----------------|-----------------|
| Haiku | `claude-haiku-4-5-20251001` | 0.25 | 1.25 |
| Opus | `claude-opus-4-20250514` | 15.00 | 75.00 |

---

## Divergence Signal

After scoring each round, compute the score spread (max total - min total across competitors):

| Spread | Signal | Color | Action |
|--------|--------|-------|--------|
| 0-2 | Query failed as discriminator | Gray round | Consider replacing query type for next codebase block |
| 3-4 | Moderate discrimination | Yellow round | Normal — note which dimension drove the spread |
| 5+ | Strong discrimination | Signal round | Genuine tool difference revealed — document the specific cause |
