# Query Quality Analysis

## Statistical Summary

**12 rounds scored** across 3 codebases (mattermost-webapp: 10, django: 1, fastapi: 1).
**All rounds gray divergence** (spread 0-2). No yellow or signal rounds yet.

## Per-Dimension Variance

- **precision**: avg=4.83, range=4-5, spread=1
- **recall**: avg=4.54, range=4-5, spread=1
- **insight**: avg=4.21, range=3-5, spread=2

**Finding:** Precision is uniformly 4-5 across all rounds. Recall shows the most variation
(4-5, with explore sometimes scoring 5 when maproom scores 4 and vice versa). Insight is
the dimension with the most meaningful differentiation — R28 (depth query) produced
explore=3, maproom=5 on insight, the largest single-dimension gap.

## Per-Category Performance

- **architecture**: 2 rounds, explore avg=14.0, maproom avg=14.0
- **flow**: 6 rounds, explore avg=12.7, maproom avg=14.0
- **pattern**: 2 rounds, explore avg=14.0, maproom avg=13.5
- **relationship**: 1 rounds, explore avg=13.0, maproom avg=14.0
- **symbol**: 1 rounds, explore avg=14.0, maproom avg=14.0

## Efficiency Analysis

- **explore**: avg 55 calls (35-68), avg 162s
- **maproom**: avg 46 calls (28-76), avg 147s

Maproom is consistently more efficient: ~30% fewer tool calls and ~20% faster wall time.
This efficiency advantage is invisible in current scoring because quality scores converge.

## Why Gray Divergence Persists

1. **Breadth queries converge**: Both approaches excel at broad architectural surveys
2. **1-5 scale ceiling**: Both score 4-5 on precision and recall, leaving only insight to differentiate
3. **No constrained rounds**: Without tool budgets, both approaches have unlimited resources
4. **Single codebase bias**: 10/12 rounds are on mattermost-webapp, which both know well

## R28 Depth Query — What Changed

R28 was the first depth query (reasoning about race conditions). Results:
- **explore**: precision=4, recall=5, **insight=3** → total 12
- **maproom**: precision=5, recall=4, **insight=5** → total 14
- **Spread: 2** — widest in competition

The depth query produced differentiation on the **insight** dimension. Maproom's structured
search enabled deeper reasoning about async timing. Explore's exhaustive coverage was
less valuable when the query demanded reasoning, not enumeration.

## Recommendations

1. **Run more depth queries** — they differentiate on insight, the decisive dimension
2. **Add constrained queries** — tool budgets (max 25 calls) will force strategic choices
3. **Expand to django/fastapi** — Python codebases may reveal different paradigm strengths
4. **Recalibrate insight scoring** — the gap between insight=3 and insight=5 needs clearer anchors
