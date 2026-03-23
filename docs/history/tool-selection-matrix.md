# Tool Selection Matrix — Search Olympics Series 2

Based on 33 scored rounds across 3 codebases and 3 competitors, these are the data-backed recommendations for which code search tool to use in which situation.

## Matrix

| Situation | Recommended Tool | Evidence | Confidence |
|-----------|-----------------|----------|------------|
| **Conceptual questions** ("how does X work?") on any codebase | **Explore** | Won conceptual rounds on both fastapi (R01: 13 vs 15 Maproom) and django (R01: 13 tie). Insight advantage (+1.3 avg) drives richer explanations. | High (N=4) |
| **Enumeration** ("find all X") on well-structured codebases | **Explore or ast-grep** (tie) | Both achieve perfect recall on enumeration. ast-grep faster (5 calls vs 9) but Explore provides better synthesis. django-P2-R04: Explore 15, ast-grep 14. | Medium (N=3) |
| **Absence proof** ("does X exist?") | **Explore** | Won absence-proof rounds on both codebases (fastapi-P2-R03: 14, django-P2-R03: 15). Exhaustive text search provides strongest negative evidence. | High (N=4) |
| **Pattern discovery** ("what convention is used?") | **Explore** on complex patterns, **Maproom** on small codebases | Maproom won fastapi-P2-R01 (15 vs 14 Explore) but Explore won django-P2-R01 (15 vs 12 Maproom). Codebase size matters. | Medium (N=4) |
| **Relationship tracing** ("what calls X?") | **Explore** | Won relationship rounds consistently. fastapi-P2-R04: 15. Exhaustive grep catches all callers. | High (N=3) |
| **Flow tracing** ("trace the lifecycle of X") | **Explore** | Dominant on flow-tracing. fastapi-P2-R02: 14 vs 11 Maproom, 9 ast-grep. Sequential file reading required. | High (N=3) |
| **Bug investigation** ("where could X fail?") | **Explore** | Won bug-investigation rounds on both codebases. Requires reasoning + reading, not just search. | High (N=3) |
| **Terminology mismatch** (user term != codebase term) | **Explore or Maproom** (tied) | Phase 1 fastapi-R05: 13-13 tie. Both handle synonym mapping equally well via different strategies. | Low (N=1) |
| **Quick initial orientation** (cold-start) | **Maproom** on small codebases, **Explore** on large | Maproom's FTS provides faster architectural overview. fastapi Phase 1 R08: Maproom 14, Explore 13. | Medium (N=2) |
| **Precise structural matching** (find all async functions without error handling) | **ast-grep** for finding, then **Explore** for analysis | ast-grep finds structural patterns in 5-8 calls but cannot synthesize findings. Use ast-grep to locate, Explore to understand. | Medium (N=6) |

## Key Recommendations

### Recommendation 1: Default to Explore for general code research
Explore won 15/21 Phase 1 rounds (with ties) and 10/12 Phase 2 rounds. Its exhaustive text search provides the highest recall and its system prompt produces the best insight scores. Use Explore unless you have a specific reason not to.

### Recommendation 2: Use Maproom for speed-critical searches on small codebases
Maproom uses 37% fewer tool calls than Explore and provides equivalent quality on codebases under ~30k LOC (fastapi). On larger codebases (django), its FTS index returns more test files than source files, reducing its effectiveness.

### Recommendation 3: Use ast-grep for structural enumeration, not for understanding
ast-grep excels at finding all instances of a structural pattern (e.g., all classes inheriting from BaseCommand) in minimal tool calls. But it cannot explain WHY the code is structured that way. Pair ast-grep location results with Explore or manual file reading for analysis.

### Recommendation 4: Do NOT use ast-grep for flow tracing or reasoning queries
ast-grep scored 9/15 on flow-tracing (worst score in the competition). Structural patterns cannot capture execution flow, error handling branches, or architectural reasoning.

### Recommendation 5: Maproom's FTS index quality matters more than the tool itself
On django, Maproom's index returned test files over source files in most rounds, degrading its performance. On fastapi (where the index was cleaner), Maproom performed competitively. Index quality is the limiting factor, not the search paradigm.

## Caveats

- All findings are from Haiku-model agents. Different models may produce different results.
- Sample sizes per category are small (N=1-6). Category-level findings are suggestive, not definitive.
- Series 2 tool call counts are lower than Series 1 due to improved system prompts and subagent execution context (see data-provenance.md).
