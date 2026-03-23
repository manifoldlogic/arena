---
phase3_recommendation: "defer"
---

# Phase 2 Findings — Search Olympics Series 2

**Date:** 2026-03-21
**Competitors:** Explore (text/regex), Maproom (FTS), ast-grep (structural/AST)
**Model:** Haiku (all competitors, all rounds)
**Rounds:** 12 Phase 2 + 1 showdown gate
**Codebases:** FastAPI (19k LOC), Django (202k LOC)

---

## 1. Executive Summary

Structural search (ast-grep) does not beat full-text search on structural queries; Explore's exhaustive text/regex approach dominated Phase 2 with 176/180 combined score (14.67 avg/round), winning 10 of 12 rounds against both FTS (Maproom, 153) and AST-based search (ast-grep, 143) on a query set deliberately weighted 67% toward AST-advantaged categories.

---

## 2. Phase 2 Leaderboard

### Combined (12 rounds, 180 max)

| Rank | Competitor | Total | Avg/Round | Win Rate |
| :--: | ---------- | :---: | :-------: | :------: |
|  1   | Explore    |  176  |   14.67   |   83%    |
|  2   | Maproom    |  153  |   12.75   |    8%    |
|  3   | ast-grep   |  143  |   11.92   |    0%    |

**Explore-to-second gap:** +23 points (176 vs 153 Maproom), +1.92 points/round.
**Explore-to-third gap:** +33 points (176 vs 143 ast-grep), +2.75 points/round.
**Maproom-to-ast-grep gap:** +10 points (153 vs 143), +0.83 points/round.

### Per-Codebase

| Competitor | FastAPI (90 max) | Django (90 max) | Delta |
| ---------- | :--------------: | :-------------: | :---: |
| Explore    |        87        |       89        |  +2   |
| Maproom    |        77        |       76        |  -1   |
| ast-grep   |        70        |       73        |  +3   |

Explore's dominance is consistent across codebases (within 2 points). Neither Maproom nor ast-grep shows a codebase-specific advantage.

### Showdown Gate

The pre-Phase 2 showdown (django flow-tracing: `manage.py migrate`) produced Explore 14, ast-grep 12, Maproom 10 with divergence 4 (signal). This round validated ast-grep as a viable competitor and previewed the eventual Phase 2 ordering.

---

## 3. Category Breakdown

### Which categories discriminated most?

| Category          | Rounds | ast-grep Avg | Explore Avg | Maproom Avg | Spread | Discriminating? |
| ----------------- | :----: | :----------: | :---------: | :---------: | :----: | :-------------: |
| flow-tracing      |   1    |     9.00     |    14.00    |    11.00    |  5.00  |  YES (signal)   |
| bug-investigation |   2    |    12.00     |    15.00    |    12.00    |  3.00  |  YES (yellow)   |
| ambiguous-premise |   1    |    11.00     |    15.00    |    13.00    |  4.00  |  YES (yellow)   |
| absence-proof     |   2    |    12.50     |    14.50    |    12.00    |  2.50  |    Moderate     |
| relationship      |   1    |    12.00     |    15.00    |    13.00    |  3.00  |  YES (yellow)   |
| pattern-discovery |   4    |    12.00     |    14.50    |    13.75    |  2.50  |    Moderate     |
| enumeration       |   1    |    14.00     |    15.00    |    13.00    |  2.00  |   Low (gray)    |

**Most discriminating:** Flow-tracing (fastapi-P2-R02) produced the only signal-level round in Phase 2 (divergence 5). ast-grep scored 9 — its lowest score anywhere — because structural patterns find code shapes but cannot trace execution paths. Explore's 14 came from mapping the full WebSocket lifecycle: decorator registration, ASGI wrapper, dual AsyncExitStack, solve_dependencies integration.

**Least discriminating:** Enumeration (django-P2-R04, signals) and pattern-discovery on well-structured targets (django-P2-R02, management commands). These are categories where all tools converge because the answer is bounded and discoverable by any search method.

### ast-grep's best showing

ast-grep's strongest categories were:

1. **Enumeration** (django-P2-R04): 14/15, only 1 behind Explore. `Signal($$$)` and `ModelSignal($$$)` patterns produced all 24 signals with zero false positives.
2. **Absence-proof** (fastapi-P2-R03): 13/15. Two-query proof (`from starlette.middleware.cors import $$$` + absent `class CORSMiddleware`) was the most elegant approach of all three competitors.
3. **Pattern-discovery on easy targets** (django-P2-R02): 14/14 (tied with both). `class Command(BaseCommand)` enumerated all 28 management commands in one query.

### ast-grep's weakest showing

1. **Flow-tracing** (fastapi-P2-R02): 9/15. Structural patterns found code shapes but not execution paths.
2. **Pattern-discovery on complex patterns** (fastapi-P2-R01, django-P2-R01): 11/15 on both. Finding generate_unique_id references and QuerySet lazy evaluation required semantic synthesis beyond enumeration.
3. **Bug-investigation** (django-P2-R05): 11/15. Race condition analysis requires reasoning about atomicity boundaries and temporal ordering that structural patterns cannot capture.

---

## 4. Per-Paradigm Efficiency

### Average Tool Calls Per Round

| Competitor | FastAPI | Django | Overall |
| ---------- | :-----: | :----: | :-----: |
| ast-grep   |  5.50   |  5.50  |  5.50   |
| Explore    |  10.33  |  9.33  |  9.83   |
| Maproom    |  7.00   |  5.83  |  6.42   |

### Average Wall Time Per Round (seconds)

| Competitor | FastAPI | Django | Overall |
| ---------- | :-----: | :----: | :-----: |
| ast-grep   |  8.67   |  9.00  |  8.83   |
| Explore    |  16.83  | 16.67  |  16.75  |
| Maproom    |  11.50  |  9.67  |  10.58  |

### Efficiency vs Quality Tradeoff

| Competitor | Score/Round | Calls/Round | Score/Call | Time/Round | Score/Second |
| ---------- | :---------: | :---------: | :--------: | :--------: | :----------: |
| ast-grep   |    11.92    |    5.50     |    2.17    |    8.83    |     1.35     |
| Explore    |    14.67    |    9.83     |    1.49    |   16.75    |     0.88     |
| Maproom    |    12.75    |    6.42     |    1.99    |   10.58    |     1.21     |

**Finding:** ast-grep has the highest score-per-call efficiency (2.17) and score-per-second efficiency (1.35), but the absolute quality gap (-2.75 points/round vs Explore) means the efficiency advantage is not worth the accuracy cost for most use cases. ast-grep uses 44% fewer tool calls than Explore but scores 19% lower.

Maproom occupies the middle ground: 35% fewer calls than Explore, only 13% lower score. If efficiency is weighted, Maproom remains more competitive than ast-grep.

---

## 5. ast-grep Failure Pattern Analysis

### Pattern Errors and Limitations

Across the 12 Phase 2 rounds + 1 showdown, ast-grep exhibited the following failure patterns:

**1. Pattern overmatching (fastapi-P2-R02):**
`async def app($$$)` matched both WebSocket and HTTP code paths, producing false positives that required manual filtering. The structural pattern lacked semantic context to distinguish protocol-specific handlers.

**2. Method call pattern failure (django-P2-R01):**
`self._fetch_all()` as a method call did not match ast-grep patterns, requiring Grep fallback. This is a known limitation of ast-grep's Python grammar where method calls on `self` may not parse as expected patterns.

**3. ERROR node failures (showdown-01):**
`class $NAME($$$BASES)` patterns produced ERROR nodes in Python class definitions. 2 of 9 patterns failed, requiring Grep recovery. The agent recovered well but the pattern syntax proved fragile for Python metaclass-heavy code.

**4. Semantic gap on reasoning queries:**
This is the most pervasive limitation. In 8 of 12 rounds, ast-grep correctly located relevant code but could not synthesize semantic understanding from the structural matches. The agent's supplemental file reads partially compensated, but the judge notes consistently record that ast-grep answers stay at "enumeration level" while Explore provides "architectural synthesis."

### Impact Assessment

The pattern errors (items 1-3) cost ast-grep approximately 2-4 points total across all rounds — significant but not catastrophic. The semantic gap (item 4) accounts for the majority of the 33-point deficit to Explore. This is a fundamental limitation of the structural search paradigm, not a fixable tooling issue.

### Where ast-grep's structural approach adds genuine value

Despite losing overall, ast-grep demonstrated unique capabilities in specific sub-tasks:

- **Import tracing** (fastapi-P2-R03): `from starlette.middleware.cors import $$$` is a cleaner proof of re-export than text search.
- **Caller enumeration** (fastapi-P2-R04): `solve_dependencies($$$)` found all 3 call sites in a single query with zero false positives.
- **Raise site enumeration** (fastapi-P2-R05): `raise ResponseValidationError($$$)` located both raise sites precisely.
- **Class hierarchy enumeration** (django-P2-R02): `class Command(BaseCommand)` enumerated all 28 commands.
- **Absence confirmation** (django-P2-R05): Zero-match `select_for_update` pattern confirmed absence of concurrency primitives.

These sub-tasks are exactly where AST search should excel: bounded enumeration of specific syntactic patterns. The problem is that no Phase 2 query asked ONLY for enumeration — every query also required semantic synthesis, which is where text-based search agents produce richer answers.

---

## 6. Terminology-Mismatch Analysis

### Phase 2 had no terminology-mismatch queries

The Phase 2 query list was weighted toward structural/pattern-discovery/absence-proof categories (67% of queries) to test ast-grep's structural search capabilities. No terminology-mismatch queries were included. Therefore, Phase 3 go/no-go must rely entirely on Phase 1 data for this category.

### Phase 1 terminology-mismatch data (Explore vs Maproom only; ast-grep not tested)

| Round ID    | Codebase | Query                        | Explore | Maproom | Div | Winner  |
| ----------- | -------- | ---------------------------- | :-----: | :-----: | :-: | ------- |
| fastapi-R05 | FastAPI  | "Where are the controllers?" |   13    |   13    |  0  | Tie     |
| django-R05  | Django   | "Where are the DAOs?"        |   13    |   11    |  2  | Explore |

**fastapi-R05:** Both competitors scored identically (5/4/4 each). Both correctly identified the terminology mismatch (FastAPI has no controllers), described the decorator-based registration pattern, and translated MVC concepts to FastAPI's architecture. Maproom used 46% fewer tool calls (7 vs 13). Gap: 0 points.

**django-R05:** Explore won 13-11. Explore covered 5 layers (Manager, QuerySet, Model, DatabaseWrapper, SQLCompiler) while Maproom covered 3 (Manager, QuerySet, Model). Explore also explained the `from_queryset()` dynamic class creation mechanism. Gap: 2 points in Explore's favor.

### Does FTS fail on terminology-mismatch queries?

**No.** The data does not support this hypothesis:

1. **fastapi-R05:** Maproom (FTS) tied Explore at 13-13. FTS did not fail — both tools handled the terminology translation equally well. The 0-point gap is the opposite of the failure pattern we would need to justify Phase 3.

2. **django-R05:** Maproom scored 11 (recall 3, insight 3) vs Explore's 13 (recall 4, insight 4). The 2-point gap is within the gray zone and is attributable to Explore's deeper traversal of Django's layered ORM architecture, not to a FTS-specific failure on terminology mismatch. Maproom found the correct mapping (Manager/QuerySet, not DAO) — it simply found fewer layers.

3. **Average gap across 2 rounds:** Explore +1.0 points/round on terminology-mismatch. This is below the Phase 3 threshold of 2+ points.

4. **ast-grep was not tested on terminology-mismatch.** We have zero data on whether structural search handles or fails on terminology-mismatch queries. A Phase 3 focused on terminology-mismatch would introduce a variable (new query category for ast-grep) on top of the existing FTS question, making results harder to interpret.

### Extrapolation from Phase 2 data

Phase 2 included one query with a conceptual parallel to terminology-mismatch: django-P2-R06 (ambiguous-premise, "Active Record pattern"). All three competitors correctly identified the premise mismatch (Django is not Active Record). Scores: Explore 15, Maproom 13, ast-grep 11. The 2-point Explore-Maproom gap and 4-point Explore-ast-grep gap are larger than the terminology-mismatch gaps in Phase 1, but this is an ambiguous-premise query, not a pure terminology mismatch, and the divergence may reflect the harder reasoning required rather than a terminology-specific effect.

---

## 7. Phase 3 Go/No-Go Recommendation

### Decision: DEFER

### Criteria Assessment

| Criterion                                       | Threshold               | Result                                  | Status  |
| ----------------------------------------------- | ----------------------- | --------------------------------------- | :-----: |
| Terminology-mismatch FTS gap                    | 2+ pts avg below winner | 1.0 pts avg (0 on fastapi, 2 on django) |  FAIL   |
| Phase 2 identified FTS weakness on term queries | Qualitative             | No — FTS tied or came close             |  FAIL   |
| Sufficient data to design Phase 3 queries       | 3+ rounds of baseline   | Only 2 rounds, one was a tie            |  FAIL   |
| ast-grep untested on terminology-mismatch       | Blocking gap            | No data exists                          | CONCERN |

### Rationale

**1. The quantitative threshold is not met.**
Phase 3 criteria require FTS to score 2+ points below the winner on average for terminology-mismatch queries. The observed gap is 1.0 points average (0 on fastapi-R05, 2 on django-R05). This is below the threshold.

**2. The qualitative evidence does not support FTS failure.**
In fastapi-R05, Maproom (FTS) achieved an identical score to Explore on a terminology-mismatch query. The term "controllers" is absent from FastAPI, yet Maproom's FTS correctly surfaced route-registration code and the agent successfully translated the terminology. This demonstrates that FTS does not inherently fail on terminology mismatches — the agent's reasoning layer compensates.

**3. Phase 2's main finding makes Phase 3 less relevant.**
Phase 2 demonstrated that Explore dominates across all tested categories, including categories where ast-grep was expected to excel (pattern-discovery, absence-proof, enumeration). If structural search cannot beat text search on structural queries, it is unlikely that a Phase 3 focused on a different query category would produce a different competitive ordering.

**4. The 2-round sample is too small.**
Two terminology-mismatch rounds (one tie, one +2 Explore) do not constitute sufficient evidence to design a statistically meaningful Phase 3. Any Phase 3 recommendation based on this data would be speculative.

### What would change this recommendation?

- **New evidence of FTS failure:** If a future round or external test demonstrates FTS scoring 3+ points below text search on a terminology-mismatch query, that would provide the signal needed.
- **ast-grep terminology test:** A targeted 2-3 round mini-series testing ast-grep on terminology-mismatch queries could reveal whether structural search has a unique capability (or vulnerability) in this category.
- **Different competitor:** If a competitor with stronger semantic capabilities than Maproom's FTS were introduced, the terminology-mismatch analysis might become more relevant.

---

## 8. Key Takeaways

### What Phase 2 proved

1. **Text-based exhaustive search (Explore) is the strongest general-purpose code search approach tested.** It won 10/12 Phase 2 rounds and 83% of all rounds across both codebases.

2. **The 3-competitor format broke the Phase 1 gray ceiling.** Phase 1 had 100% gray rate across 21 rounds (Explore vs Maproom). Phase 2 produced 75% non-gray rounds (9/12 yellow or signal). Adding a structurally different competitor was the right design choice.

3. **Precision is non-discriminating on well-structured codebases.** All three competitors scored 4.83-5.00 average precision. This dimension should be considered for removal or replacement in future series.

4. **Recall and insight are the only dimensions that matter.** Explore's dominance comes from recall (5.00 avg, perfect across all 12 rounds) and insight (4.67 avg). The combination of exhaustive search + semantic synthesis is unmatched.

5. **ast-grep excels at bounded enumeration sub-tasks but not at holistic code understanding.** Single-pattern queries like "find all callers of X" or "enumerate all Signal definitions" are ast-grep's strength. But no realistic query asks only for enumeration — there is always a "why" or "how" component where text search agents outperform.

6. **Maproom (FTS) is a reasonable middle ground.** It scores 13% below Explore but uses 35% fewer tool calls. For latency-sensitive use cases where 12.75 avg/round quality is acceptable, Maproom remains viable.

### What Phase 2 did not prove

1. **Whether ast-grep fails on terminology-mismatch queries.** This was not tested.
2. **Whether the results generalize to non-Python codebases.** Both codebases were Python. TypeScript, Go, or Rust codebases with different AST structures might produce different results for ast-grep.
3. **Whether a hybrid approach (ast-grep for enumeration + Explore for synthesis) would outperform either alone.** This is the most promising follow-up hypothesis but was outside Phase 2 scope.
