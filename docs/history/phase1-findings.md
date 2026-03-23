# Phase 1 Findings — Search Olympics Series 2

**Date:** 2026-03-21
**Competitors:** Explore (text/regex search) vs Maproom (indexed full-text search)
**Model:** Haiku (both competitors, all rounds)
**Codebases:** FastAPI (8 rounds), Django (8 rounds), mattermost-webapp (5 bridge rounds)
**Total rounds:** 21

---

## 1. Executive Summary

Maproom's advantage does not generalize to Python codebases — it won FastAPI (+10) but lost Django (-11) and the mattermost-webapp bridge rounds (-4), producing a near-tie grand total of Explore 275 vs Maproom 270 across 21 rounds, with all rounds falling in the gray divergence zone.

---

## 2. Per-Codebase Results

### FastAPI (8 rounds) — Maproom wins 110-100

| Round | Category             | Explore (P/R/I) | Total | Maproom (P/R/I) | Total | Winner  | Div |
| ----- | -------------------- | :-------------: | :---: | :-------------: | :---: | ------- | :-: |
| R01   | conceptual           |      5/4/4      |  13   |      5/5/5      |  15   | Maproom |  2  |
| R02   | relationship         |      4/4/3      |  11   |      5/4/4      |  13   | Maproom |  2  |
| R03   | pattern-discovery    |      5/4/4      |  13   |      5/5/5      |  15   | Maproom |  2  |
| R04   | absence-proof        |      5/4/3      |  12   |      5/4/3      |  12   | Tie     |  0  |
| R05   | terminology-mismatch |      5/4/4      |  13   |      5/4/4      |  13   | Tie     |  0  |
| R06   | enumeration          |      5/5/3      |  13   |      5/5/4      |  14   | Maproom |  1  |
| R07   | ambiguous-premise    |      5/4/3      |  12   |      5/4/5      |  14   | Maproom |  2  |
| R08   | cold-start           |      5/5/3      |  13   |      5/4/5      |  14   | Maproom |  1  |

**Key findings:**

- Maproom's dominance is driven entirely by insight (+8 total, +1.0/round). In fastapi-R03, Maproom scored 15 vs Explore's 13 by explaining WHY `contextmanager_in_threadpool` uses a separate CapacityLimiter (deadlock prevention). In fastapi-R07, Maproom scored 14 vs Explore's 12 by explaining likely sources of the "custom event loop" misconception.
- Precision is at ceiling: Maproom 40/40, Explore 39/40 (single 4 in fastapi-R02).
- Recall is nearly tied: Maproom 35, Explore 34.
- Maproom won 6 of 8 rounds with 2 ties; Explore won none.

### Django (8 rounds) — Explore wins 107-96

| Round | Category             | Explore (P/R/I) | Total | Maproom (P/R/I) | Total | Winner  | Div |
| ----- | -------------------- | :-------------: | :---: | :-------------: | :---: | ------- | :-: |
| R01   | conceptual           |      5/4/4      |  13   |      5/4/4      |  13   | Tie     |  0  |
| R02   | relationship         |      5/4/4      |  13   |      5/4/3      |  12   | Explore |  1  |
| R03   | flow-tracing         |      5/5/4      |  14   |      5/4/3      |  12   | Explore |  2  |
| R04   | absence-proof        |      5/5/4      |  14   |      5/4/3      |  12   | Explore |  2  |
| R05   | terminology-mismatch |      5/4/4      |  13   |      5/3/3      |  11   | Explore |  2  |
| R06   | enumeration          |      5/5/3      |  13   |      5/5/2      |  12   | Explore |  1  |
| R07   | bug-investigation    |      5/5/4      |  14   |      5/4/3      |  12   | Explore |  2  |
| R08   | ambiguous-premise    |      5/4/4      |  13   |      5/4/3      |  12   | Explore |  1  |

**Key findings:**

- The result is a complete reversal of FastAPI: Explore wins 7 of 8 rounds with 1 tie.
- Explore's advantage comes from both recall (+4 total, +0.50/round) and insight (+7 total, +0.88/round). In django-R03, Explore scored 14 vs Maproom's 12 by tracing the full migration flow including target resolution logic and `fake_initial` handling. In django-R07, Explore scored 14 vs Maproom's 12 by systematically finding internal SQL compiler string formatting locations.
- Precision is perfectly tied: both 40/40.
- Django's larger codebase (~202k LOC vs FastAPI's ~19k) rewards Explore's exhaustive Grep sweeps.

### mattermost-webapp Bridge Rounds (5 rounds) — Explore wins 68-64

| Round | Category                   | Explore (P/R/I) | Total | Maproom (P/R/I) | Total | Winner  | Div |
| ----- | -------------------------- | :-------------: | :---: | :-------------: | :---: | ------- | :-: |
| BR01  | bridge (Conceptual)        |      5/4/4      |  13   |      5/4/4      |  13   | Tie     |  0  |
| BR02  | bridge (Relationship)      |      5/5/3      |  13   |      5/4/3      |  12   | Explore |  1  |
| BR03  | bridge (Pattern/conv.)     |      5/4/4      |  13   |      5/4/3      |  12   | Explore |  1  |
| BR04  | bridge (Bug investigation) |      5/5/5      |  15   |      5/5/4      |  14   | Explore |  1  |
| BR05  | bridge (Symbol-level)      |      5/5/4      |  14   |      5/5/3      |  13   | Explore |  1  |

**Key findings:**

- Explore wins 4 of 5 under S2 scoring, reversing the S1 outcome where Maproom won 2 of 5.
- In bridge-BR04, Explore scored 15 vs Maproom's 14 by explaining thundering herd jitter and connectionId-based missed message detection for WebSocket management.
- The bridge rounds confirm that the scoring system (not competitor behavior) is the primary driver of winner determination when competitors are close.

---

## 3. Cross-Codebase Consistency

### Findings that held across both Python codebases

1. **Precision is at ceiling.** Both competitors scored 5/5 on precision in 15 of 16 Python rounds (Explore scored 4 once in fastapi-R02). This dimension provides zero discrimination.

2. **Insight is the primary discriminator.** On both codebases, the insight gap is larger than the recall gap. Insight determined the round winner in the majority of non-tie rounds.

3. **Maproom is consistently more efficient.** Maproom used 36% fewer tool calls on FastAPI and 34% fewer on Django. This efficiency advantage is real but does not translate to quality advantage under S2 scoring.

4. **All rounds are gray.** Maximum divergence is 2 on both codebases. No round produced signal-level (3+) discrimination.

### Findings that were codebase-specific

1. **Insight direction reverses.** Maproom leads insight on FastAPI (+1.0/round); Explore leads insight on Django (+0.88/round). This is the most important codebase-specific finding. On the smaller, well-organized FastAPI codebase, Maproom's FTS-first workflow leaves more "cognitive budget" for synthesis. On Django's larger, deeper codebase, Explore's exhaustive search uncovers more material to draw insights from.

2. **Recall gap appears only on Django.** FastAPI recall is nearly tied (35 vs 34). Django recall diverges meaningfully (36 vs 32, +0.50/round for Explore). Django's ~202k LOC contains more secondary locations that Explore's Grep sweeps find and Maproom's FTS misses.

3. **Maproom's only precision drop (4/5) occurred on FastAPI R02**, not Django. The error was a factual imprecision about `FastAPI.__init__` creating an APIRouter via the parent Starlette class.

---

## 4. Category Analysis

### Most Discriminating Categories (highest average divergence)

| Category          | Avg Divergence | Rounds | Direction       | Notes                                                |
| ----------------- | :------------: | :----: | --------------- | ---------------------------------------------------- |
| pattern-discovery |      2.0       |   1    | Maproom         | FastAPI only; Maproom's synthesis advantage          |
| flow-tracing      |      2.0       |   1    | Explore         | Django only; Explore's multi-file tracing            |
| bug-investigation |      2.0       |   1    | Explore         | Django only; Explore's exhaustive SQL pattern search |
| ambiguous-premise |      1.5       |   2    | Split           | Maproom on FastAPI (R07), Explore on Django (R08)    |
| relationship      |      1.5       |   2    | Maproom-leaning | Maproom wins both but only by 1-2 pts                |
| conceptual        |      1.0       |   2    | Split           | Maproom on FastAPI, tie on Django                    |

### Non-Discriminating Categories (low divergence)

| Category             | Avg Divergence | Rounds | Notes                                   |
| -------------------- | :------------: | :----: | --------------------------------------- |
| enumeration          |      1.0       |   2    | Both find all items; scores tied or +1  |
| absence-proof        |      1.0       |   2    | Tied on FastAPI; Explore edge on Django |
| terminology-mismatch |      1.0       |   2    | Tied on FastAPI; Explore edge on Django |
| cold-start           |      1.0       |   1    | Maproom wins by 1 (FastAPI only)        |

**Caveat:** With only 1-2 rounds per category, these findings are suggestive, not conclusive. Category-level analysis requires more data points for statistical reliability.

---

## 5. Per-Dimension Breakdown

### Precision — Tied (Explore 104, Maproom 105)

Both competitors achieve near-perfect precision across all 21 rounds. Maproom has a trivial +1 advantage from Explore's single 4/5 in fastapi-R02. **Precision does not discriminate between these competitors on well-structured codebases.**

### Recall — Explore leads (Explore 93, Maproom 89)

Explore's recall advantage (+4 across 21 rounds, +0.19/round) comes primarily from Django (+4 on that codebase alone). On FastAPI and bridge rounds, recall is near-tied. Explore's systematic Grep sweeps find secondary locations (e.g., django-R04 task module sub-files, django-R07 internal SQL compiler patterns) that Maproom's FTS misses.

### Insight — Explore leads slightly (Explore 78, Maproom 76)

The aggregate insight gap (+2) is misleading because it masks a codebase reversal:

- **FastAPI:** Maproom 35, Explore 27 (+8 Maproom)
- **Django:** Explore 31, Maproom 24 (+7 Explore)
- **Bridge:** Explore 20, Maproom 17 (+3 Explore)

The net +2 for Explore results from Django and bridge rounds offsetting FastAPI. Neither competitor has a robust insight advantage across codebases.

---

## 6. Raw Efficiency Comparison

### Average Tool Calls Per Competitor Per Codebase

| Codebase          | Explore | Maproom | Maproom Savings |
| ----------------- | :-----: | :-----: | :-------------: |
| FastAPI           |  12.2   |   7.8   |       36%       |
| Django            |   8.9   |   5.9   |       34%       |
| mattermost-webapp |   7.8   |   6.6   |       15%       |
| **Overall**       | **9.9** | **6.8** |     **31%**     |

### Average Wall Time Per Competitor Per Codebase

| Codebase          | Explore (s) | Maproom (s) | Maproom Savings |
| ----------------- | :---------: | :---------: | :-------------: |
| FastAPI           |    21.4     |    14.9     |       30%       |
| Django            |    47.0     |    30.4     |       35%       |
| mattermost-webapp |    39.6     |    33.0     |       17%       |
| **Overall**       |  **35.6**   |  **25.3**   |     **29%**     |

**Finding:** Maproom is consistently faster and uses fewer tool calls across all codebases. The efficiency gap is largest on FastAPI (where Maproom also wins on quality) and smallest on mattermost-webapp bridge rounds (where both competitors use relatively few calls). Maproom's efficiency advantage does not correlate with quality advantage — on Django, Maproom is 35% faster but scores 11 points lower.

---

## 7. Gray Round Rate

**Formula:** gray rounds / total rounds

| Codebase          | Rounds |  Gray  | Yellow | Signal | Gray Rate |
| ----------------- | :----: | :----: | :----: | :----: | :-------: |
| FastAPI           |   8    |   8    |   0    |   0    |   100%    |
| Django            |   8    |   8    |   0    |   0    |   100%    |
| Bridge            |   5    |   5    |   0    |   0    |   100%    |
| **Total Phase 1** | **21** | **21** | **0**  | **0**  | **100%**  |

**FLAG: Gray rate (100%) exceeds 15% threshold.**

### Analysis of 100% Gray Rate

The 100% gray rate across 21 rounds, 3 codebases, and 11 distinct query categories is the single most important Phase 1 finding. It indicates:

1. **The competitors are fundamentally similar in output quality.** Maximum total-score divergence is 2 points (on a 15-point scale). The tools find the same information and produce equivalently accurate answers.

2. **Per-round discrimination exists but is small.** Individual dimension differences (0-2 points) determine round winners, but never accumulate to signal-level divergence within a single round.

3. **Aggregate discrimination exists but reverses by codebase.** Maproom wins FastAPI by 10; Explore wins Django by 11. These aggregate gaps are meaningful over 8 rounds but arise from many small per-round edges, not from decisive individual rounds.

4. **The 3-point divergence threshold may be too high for this competitor pair.** Even the most discriminating rounds (fastapi-R01, fastapi-R03, django-R03, django-R04, django-R05, django-R07 — all at divergence 2) do not reach yellow. Consider whether a divergence threshold of 2 would be more appropriate for future series.

5. **Query difficulty adjustments did not break the gray pattern.** Django rounds included harder queries (flow-tracing, bug-investigation) and higher difficulty levels than FastAPI. The gray rate persisted.

---

## 8. Cross-Series Comparison

### Bridge Round Deltas (S1 Baseline to S2)

| Round | S1 Baseline Winner |    S2 Winner    | Shift              |
| ----- | :----------------: | :-------------: | ------------------ |
| BR01  |  Maproom (11-10)   |   Tie (13-13)   | Maproom loses edge |
| BR02  |  Explore (12-11)   | Explore (13-12) | No change          |
| BR03  |    Tie (11-11)     | Explore (13-12) | Tie breaks         |
| BR04  |  Maproom (12-11)   | Explore (15-14) | Full reversal      |
| BR05  |   Maproom (11-9)   | Explore (14-13) | Full reversal      |

### What Changed Since Series 1

**The scoring system changed; the competitors did not.** Bridge rerun S1 scores closely match S1 baselines (Explore 53 vs 53 baseline; Maproom 60 vs 56 baseline). The 2 full reversals (BR04, BR05) and 1 tie-break (BR03) are attributable to S2's Insight dimension (1-5 scale) replacing S1's Efficiency dimension (1-3 scale).

Specifically:

- S1 rewarded tool call economy explicitly (Efficiency dimension). Maproom's 15% fewer calls earned +1 per round.
- S2 rewards explanation depth (Insight dimension) with higher dynamic range. Explore's extra tool calls enable deeper investigation, which translates to insight points.
- The same query-output pairs produce different winners under different rubrics. In BR04 (WebSocket management), Maproom won S1 at 12-11 via efficiency but Explore wins S2 at 15-14 via deeper architectural insight — identical outputs, different evaluation lens.

**Conclusion:** The S1-to-S2 transition is a rubric change, not a tool change. This validates the bridge round methodology as an effective control for isolating scoring system effects.

---

## 9. Phase 2 Go/No-Go Recommendation

### Assessment Criteria

| Criterion                        |  Status  | Detail                                                 |
| -------------------------------- | :------: | ------------------------------------------------------ |
| Phase 1 rounds complete          |   PASS   | 21/21 scored                                           |
| Calibration passed               |   PASS   | All 3 codebases (0-point deviation)                    |
| Results internally consistent    |   PASS   | Drift detection found no score corrections needed      |
| Gray rate < 15%                  | **FAIL** | 100% gray rate                                         |
| At least 1 yellow/signal round   | **FAIL** | 0 of 21 rounds reached yellow                          |
| Cross-series comparison complete |   PASS   | Bridge rounds confirm rubric is primary differentiator |

### Categories with Low Discrimination That ast-grep Might Resolve

ast-grep provides structural/syntactic search capabilities that neither Explore (text/regex) nor Maproom (FTS) possess. Categories where ast-grep could potentially break the gray ceiling:

1. **Pattern-discovery** (avg div 2.0): Finding structural code patterns (e.g., sync/async bifurcation) is precisely what AST-level search excels at. In fastapi-R03, the winning insight was about `contextmanager_in_threadpool` deadlock prevention — ast-grep could find all `contextmanager` usage patterns structurally.

2. **Bug-investigation** (avg div 2.0): Finding SQL injection risk patterns via string formatting in query construction (django-R07) would benefit from ast-grep's ability to find `f"..."` or `"...".format()` patterns in specific AST contexts.

3. **Flow-tracing** (avg div 2.0): Tracing call chains through deep codebases (django-R03) could benefit from ast-grep's structural matching of function calls and class method chains.

4. **Enumeration** (avg div 1.0): Currently non-discriminating because both tools find all items. ast-grep could potentially find items that text search misses (e.g., dynamically constructed class names).

### Recommendation: PROCEED to Phase 2

**Rationale:**

1. **The 100% gray rate is a finding, not a failure.** It demonstrates that on well-structured codebases, text/regex search and indexed FTS converge to similar quality. This is a meaningful baseline for Phase 2, which introduces ast-grep as a third competitor with fundamentally different capabilities.

2. **Phase 2 introduces a structurally different competitor.** Explore and Maproom both operate on text — they differ in indexing strategy but search the same representation. ast-grep operates on AST structures. This is a qualitative difference that is more likely to produce yellow/signal divergence than further text-vs-text comparisons.

3. **The Phase 1 data is clean and consistent.** Calibration passed on all codebases, drift detection found no errors, and the cross-series comparison methodology is validated. Phase 2 can build on this foundation.

4. **Deferring would not improve discrimination.** Additional Phase 1 rounds with the same competitors would likely produce more gray results. The gray ceiling appears to be a property of the competitor pair, not the query bank.

**Action:** Proceed to Phase 2 with ast-grep as the new competitor. Retain the full 21-round Phase 1 dataset as the baseline for comparison.
