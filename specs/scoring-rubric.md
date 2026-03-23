# Scoring Rubric

## Overview

Competition rounds are scored using **comparative side-by-side evaluation**. A judge model evaluates each competitor's output against the same prompt and codebase, producing scores across three judged quality dimensions and three measured performance dimensions.

## Judged Dimensions

All judged dimensions use a 1–5 integer scale. The judge evaluates competitor outputs comparatively (side-by-side) rather than in isolation.

### Precision

How accurate and correct are the claims, code references, and conclusions in the competitor's output?

| Score | Anchor |
|-------|--------|
| 1 | Largely inaccurate; contains significant errors or fabricated references |
| 2 | Several notable inaccuracies; some correct elements mixed with wrong claims |
| 3 | Mostly accurate with minor errors; code references are generally correct |
| 4 | Accurate throughout; code references are correct with minor omissions |
| 5 | Fully accurate with precise code references; no detectable errors |

### Recall

How thoroughly does the output cover the relevant aspects of the question?

| Score | Anchor |
|-------|--------|
| 1 | Missed most relevant aspects; very incomplete coverage |
| 2 | Covers some aspects but misses several important areas |
| 3 | Covers the main aspects; some secondary areas missing |
| 4 | Comprehensive coverage with only minor gaps |
| 5 | Thorough and complete; covers all relevant aspects including edge cases |

### Insight

How deep is the architectural and design understanding demonstrated?

| Score | Anchor |
|-------|--------|
| 1 | Surface-level observations only; no deeper understanding shown |
| 2 | Some understanding of structure but misses design rationale |
| 3 | Demonstrates understanding of key design patterns and relationships |
| 4 | Shows deep understanding of architecture, trade-offs, and design intent |
| 5 | Expert-level architectural insight; identifies non-obvious design decisions and their implications |

## Measured Dimensions

These dimensions are recorded as raw values, not judged on a scale.

### Cost

Total API cost in USD for the competitor's round execution. Cost data SHOULD use actual billing from `claude -p --output-format json` (`total_cost_usd` field) when available, rather than character-based estimation.

### Tool Calls

Total number of tool invocations made during the round.

### Wall Time

Total wall-clock seconds elapsed from round start to completion.

## Query Difficulty Tiers

Each round query is classified into one of three difficulty tiers. Difficulty affects expected score distributions and divergence interpretation.

| Tier | Label | Description | Expected Divergence |
|------|-------|-------------|---------------------|
| `breadth` | Breadth | Architectural surveys requiring wide coverage across modules, layers, or subsystems. Tests the competitor's ability to navigate and summarize large surface areas. | Gray — scores tend to converge since the information is broadly accessible. |
| `depth` | Depth | Reasoning from limited evidence, requiring inference about design intent, hidden constraints, or non-obvious relationships. Tests analytical depth over coverage. | Yellow/Signal — scores diverge as competitors differ in reasoning quality. |
| `constrained` | Constrained | Resource-limited queries where tool-call budgets or time pressure force strategic trade-offs. Tests efficiency and prioritization under pressure. | Variable — tests strategy under pressure; divergence depends on how well competitors adapt. |

The `query_difficulty` field is optional on `RoundResult`. When present, it enables difficulty-aware analysis (e.g., filtering rounds by tier, normalizing divergence expectations).

## Methodological Constraints

### Judge Model Disclosure

When the quality judge is the same model as a competitor, this MUST be disclosed as a methodological limitation in the results summary. Judge-model overlap may introduce scoring bias.

### Performance Budget Calibration

Performance budgets (`max_calls`, `max_time_s` in `competitors.json`) are provisional values. They SHOULD be recalibrated from observed baselines after initial validation rounds, not left at provisional values.

## Known Deviations

The following fields defined in the `search-olympics.md` specification are **omitted** from the initial `competitors.json` configuration:

| Omitted Field | Spec Reference | Reason |
|---------------|---------------|--------|
| `system_prompt_file` | `agent-spec.json` MUST contain `system_prompt_file` | Requires a competitor directory structure (`olympics-v2/competitors/`) that is out of scope for this ticket. Will be added when per-competitor directories are created. |
| `setup_script` | Competitor entries MUST have `setup_script` file path | Same as above; depends on competitor directory layout not yet established. |

These omissions are intentional scope boundaries, not oversights. The fields will be added in a future ticket when the competitor directory structure is implemented.
