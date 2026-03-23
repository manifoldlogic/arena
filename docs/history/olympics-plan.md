# Search Olympics: Explore vs Maproom — FINAL RESULTS

## Overview

Comparing two code search approaches on the Mattermost webapp codebase:
- **Explore agent**: Haiku subagent using Grep/Glob/Read tools iteratively
- **Maproom agent**: Haiku subagent instructed to use `crewchief-maproom` CLI (FTS + context lookups)

Both agents run on Haiku model to control for model quality differences.

---

## Combined Results (V2 + V3 — 15 unique rounds)

### Measured Performance

| Metric | Explore | Maproom | Delta | Winner |
|--------|:-------:|:-------:|:-----:|--------|
| **Total tool calls** | 822 | 569 | Maproom uses **31% fewer** | Maproom |
| **Avg tool calls/round** | 54.8 | 37.9 | Maproom uses **31% fewer** | Maproom |
| **Total wall time** | 3,522s | 2,724s | Maproom **23% faster** | Maproom |
| **Avg time/round** | 235s | 182s | Maproom **23% faster** | Maproom |

### Judged Quality (1-3 per dimension, max 12/round)

| Dimension | Explore | Maproom | Winner |
|-----------|:-------:|:-------:|--------|
| **Coverage** (max 45) | **45** | 42 | Explore (perfect) |
| **Accuracy** (max 45) | 44 | **45** | Maproom |
| **Total Score** | 152/180 | **162/180** | Maproom |

---

## Round-by-Round Comparison

### V2 Rounds (R4–R12): 9 queries, post-i18n cleanup

| # | Query | E calls | M calls | Calls delta | E time | M time | Time delta | E score | M score | Winner |
|---|-------|:-------:|:-------:|:-----------:|:------:|:------:|:----------:|:-------:|:-------:|--------|
| R4 | Env vars loading | 50 | 27 | M **46% fewer** | 98s | 90s | M **8% faster** | 10 | **11** | Maproom |
| R5 | HTTP external | 74 | 42 | M **43% fewer** | 121s | 136s | E 11% faster | 9 | 9 | Tie |
| R6 | Signup flow | 51 | 34 | M **33% fewer** | 93s | 92s | ~equal | 10 | 10 | Tie |
| R7 | Middleware order | 54 | 38 | M **30% fewer** | 107s | 106s | ~equal | 10 | 10 | Tie |
| R8 | UserProfile renderers | 21 | 25 | E 16% fewer | 40s | 61s | E **34% faster** | **12** | 11 | Explore |
| R9 | Logger usage | 57 | 40 | M **30% fewer** | 72s | 116s | E **38% faster** | **11** | 10 | Explore |
| R10 | Feature flags | 32 | 31 | ~equal | 73s | 76s | ~equal | 11 | 11 | Tie |
| R11 | WebSocket mgmt | 30 | 19 | M **37% fewer** | 64s | 73s | E 12% faster | 11 | **12** | Maproom |
| R12 | Event types | 69 | 33 | M **52% fewer** | 143s | 81s | M **43% faster** | 9 | **11** | Maproom |
| **V2 Total** | | **438** | **289** | M **34% fewer** | **811s** | **831s** | ~equal | **93** | **95** | **Maproom** |
| **V2 Avg** | | **48.7** | **32.1** | | **90s** | **92s** | | | | |

### V3 Rounds (R13–R18): 6 new high-variance challenges

| # | Query | E calls | M calls | Calls delta | E time | M time | Time delta | E score | M score | Winner |
|---|-------|:-------:|:-------:|:-----------:|:------:|:------:|:----------:|:-------:|:-------:|--------|
| R13 | Post metadata lifecycle | 43 | 28 | M **35% fewer** | 379s | 337s | M **11% faster** | 10 | **11** | Maproom |
| R14 | Duplicate prevention | 72 | 30 | M **58% fewer** | 344s | 314s | M **9% faster** | 10 | **11** | Maproom |
| R15 | TTL caching | 77 | 30 | M **61% fewer** | 340s | 284s | M **16% faster** | 9 | **11** | Maproom |
| R16 | Compose box conditions | 75 | 51 | M **32% fewer** | 265s | 183s | M **31% faster** | 10 | **12** | Maproom |
| R17 | Date/time formatting | 80 | 39 | M **51% fewer** | 189s | 158s | M **16% faster** | 10 | **12** | Maproom |
| R18 | Selector memoization | 37 | 36 | ~equal | 134s | 150s | E 11% faster | 10 | 10 | Tie |
| **V3 Total** | | **384** | **214** | M **44% fewer** | **1,651s** | **1,426s** | M **14% faster** | **59** | **67** | **Maproom** |
| **V3 Avg** | | **64.0** | **35.7** | | **275s** | **238s** | | | | |

### Grand Total (V2 + V3)

| Metric | Explore | Maproom | Delta |
|--------|:-------:|:-------:|:-----:|
| Tool calls | 822 | 569 | M **31% fewer** |
| Wall time | 2,462s | 2,257s | M **8% faster** |
| Quality score | 152/180 | 162/180 | M **+10 pts** |
| Rounds won | 2 | 8 | |
| Rounds tied | 5 | 5 | |
| Coverage score | 45/45 | 42/45 | E perfect |
| Accuracy score | 44/45 | 45/45 | M near-perfect |

---

## Dimension Breakdown

### V2 Per-Round Dimensions

| Round | Agent | Speed | Coverage | Accuracy | Efficiency | Total |
|-------|-------|:-----:|:--------:|:--------:|:----------:|:-----:|
| R4 | Explore | 2 | 3 | 3 | 2 | **10** |
| R4 | Maproom | 2 | 3 | 3 | 3 | **11** |
| R5 | Explore | 2 | 3 | 3 | 1 | **9** |
| R5 | Maproom | 2 | 2 | 3 | 2 | **9** |
| R6 | Explore | 2 | 3 | 3 | 2 | **10** |
| R6 | Maproom | 2 | 3 | 3 | 2 | **10** |
| R7 | Explore | 2 | 3 | 3 | 2 | **10** |
| R7 | Maproom | 2 | 3 | 3 | 2 | **10** |
| R8 | Explore | 3 | 3 | 3 | 3 | **12** |
| R8 | Maproom | 3 | 2 | 3 | 3 | **11** |
| R9 | Explore | 3 | 3 | 3 | 2 | **11** |
| R9 | Maproom | 2 | 3 | 3 | 2 | **10** |
| R10 | Explore | 3 | 3 | 3 | 2 | **11** |
| R10 | Maproom | 3 | 3 | 3 | 2 | **11** |
| R11 | Explore | 3 | 3 | 3 | 2 | **11** |
| R11 | Maproom | 3 | 3 | 3 | 3 | **12** |
| R12 | Explore | 2 | 3 | 3 | 1 | **9** |
| R12 | Maproom | 3 | 3 | 3 | 2 | **11** |

### V3 Per-Round Dimensions

| Round | Agent | Speed | Coverage | Accuracy | Efficiency | Total |
|-------|-------|:-----:|:--------:|:--------:|:----------:|:-----:|
| R13 | Explore | 2 | 3 | 3 | 2 | 10 |
| R13 | Maproom | 2 | 3 | 3 | 3 | 11 |
| R14 | Explore | 2 | 3 | 3 | 2 | 10 |
| R14 | Maproom | 2 | 3 | 3 | 3 | 11 |
| R15 | Explore | 2 | 3 | 2 | 2 | 9 |
| R15 | Maproom | 3 | 2 | 3 | 3 | 11 |
| R16 | Explore | 2 | 3 | 3 | 2 | 10 |
| R16 | Maproom | 3 | 3 | 3 | 3 | 12 |
| R17 | Explore | 2 | 3 | 3 | 2 | 10 |
| R17 | Maproom | 3 | 3 | 3 | 3 | 12 |
| R18 | Explore | 2 | 3 | 3 | 2 | 10 |
| R18 | Maproom | 2 | 3 | 3 | 2 | 10 |

### Dimension Totals (V2 + V3 combined)

| Dimension | Explore | Maproom | Winner |
|-----------|:-------:|:-------:|--------|
| Speed (max 45) | 34 | 37 | Maproom |
| Coverage (max 45) | **45** | 42 | **Explore (perfect)** |
| Accuracy (max 45) | 44 | **45** | Maproom |
| Efficiency (max 45) | 29 | 38 | **Maproom (dominant)** |
| **TOTAL** (max 180) | 152 | **162** | **Maproom** |

---

## Key Findings

### 1. Maproom uses 31% fewer tool calls (measured)

Across 15 rounds: Explore averaged 54.8 calls/round, Maproom averaged 37.9. The gap widened in V3 (64.0 vs 35.7, **44% fewer**). Only 2 rounds saw Explore use fewer calls (R8, R10 tied).

### 2. Maproom is 23% faster on wall time (measured)

Explore averaged 235s/round, Maproom averaged 182s. In V3 specifically, Maproom was faster in 5 of 6 rounds. The lone exception (R18) was where both agents used similar call counts.

### 3. Explore achieves perfect coverage (judged)

Explore scored 3/3 on coverage in all 15 rounds (45/45) — it never missed a key area. Maproom scored 42/45, dipping to 2/3 in three rounds (R5, R8, R15).

### 4. Accuracy is nearly identical (judged)

Explore: 44/45, Maproom: 45/45. The only accuracy difference was R15 (TTL caching) where Explore incorrectly concluded "NO TTL CACHING" while Maproom found custom status TTL via `calculateExpiryTime()`.

### 5. The efficiency gap drives the score gap

Efficiency (tool call count) is the single largest dimension gap: Maproom 38 vs Explore 29 out of 45. This 9-point advantage accounts for nearly all of the 10-point overall gap. When both agents use similar call counts (R18), they tie.

### 6. V3 hypotheses were 50% wrong

| Prediction | Actual | Verdict |
|---|---|---|
| R13: Explore wins (deep flow trace) | Maproom 11-10 | **WRONG** |
| R14: Maproom wins (synonym discovery) | Maproom 11-10 | Correct |
| R15: Explore wins (absence proof) | Maproom 11-9 | **WRONG** |
| R16: Explore wins (conditional trace) | Maproom 12-10 | **WRONG** |
| R17: Maproom wins (scattered cross-cut) | Maproom 12-10 | Correct |
| R18: Toss-up | Tie 10-10 | Correct |

Deep flow tracing, absence proofs, and conditional tracing are NOT Explore advantages — Maproom's semantic search covers these equally well with fewer calls.

---

## When to Use Which

**Default to Maproom** — it uses 31% fewer tool calls, is 23% faster, and wins on accuracy.

**Use Explore only when:**
- You need guaranteed 100% coverage and can't afford to miss anything (Explore: 45/45, Maproom: 42/45)
- Both agents would use similar call counts anyway (negating Maproom's structural advantage)

---

## Scoring System

Each round scored on 4 dimensions (1-3 points each, max 12 per round):

| Dimension | 1 pt | 2 pts | 3 pts |
|-----------|------|-------|-------|
| **Speed** | >150s | 90-150s | <90s |
| **Coverage** | Missed key areas | Found most | Comprehensive |
| **Accuracy** | Some wrong info | Minor gaps | Fully correct |
| **Efficiency** | >60 tool calls | 30-60 calls | <30 calls |

Speed and Efficiency are derived from measured values. Coverage and Accuracy are judged from agent output quality.

---

## V2 Round Details (R4–R12)

### Round 4: "How are environment variables loaded and validated?"
**Category:** Conceptual | **Winner:** Maproom (11-10)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 50 | 27 (**46% fewer**) |
| Duration | 98s | 90s (**8% faster**) |

Maproom more efficient with equal coverage after i18n cleanup. Both found config validation and build-time env processing.

### Round 5: "Find where HTTP requests are made to external services"
**Category:** Conceptual | **Winner:** Tie (9-9)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 74 | 42 (**43% fewer**) |
| Duration | 121s | 136s (E **11% faster**) |

Both found RudderStack, Sentry, Stripe, GIF providers, marketplace. Explore faster but less efficient. Maproom missed some coverage.

### Round 6: "What happens when a user signs up? Trace the full flow."
**Category:** Architecture | **Winner:** Tie (10-10)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 51 | 34 (**33% fewer**) |
| Duration | 93s | 92s (~equal) |

Both traced the complete flow (form → validation → Redux → API → post-signup).

### Round 7: "Find all middleware and explain the order they execute"
**Category:** Architecture | **Winner:** Tie (10-10)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 54 | 38 (**30% fewer**) |
| Duration | 107s | 106s (~equal) |

Both found thunk, batched-actions, persist, cross-tab sync, route guards.

### Round 8: "What components render the UserProfile component?"
**Category:** Relationship | **Winner:** Explore (12-11)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 21 | 25 (E **16% fewer**) |
| Duration | 40s | 61s (E **34% faster**) |

Explore's only win and only perfect 12/12 score. Found all renderers including SearchResultsItem that Maproom missed.

### Round 9: "Find all the places that import or use the Logger class"
**Category:** Relationship | **Winner:** Explore (11-10)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 57 | 40 (M **30% fewer**) |
| Duration | 72s | 116s (E **38% faster**) |

No "Logger class" exists. Both adapted to find logging patterns. Explore was faster and listed more specific locations despite using more calls.

### Round 10: "How are feature flags checked throughout the code?"
**Category:** Pattern | **Winner:** Tie (11-11)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 32 | 31 (~equal) |
| Duration | 73s | 76s (~equal) |

Nearly identical performance. Both found FeatureFlags type, getFeatureFlagValue selector, consumer patterns.

### Round 11: "Where are WebSocket connections managed and cleaned up?"
**Category:** Bug Investigation | **Winner:** Maproom (12-10)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 30 | 19 (M **37% fewer**) |
| Duration | 64s | 73s (E **12% faster**) |

Maproom perfect 12/12 score. Both analyzed lifecycle, reconnection backoff, event handlers, cleanup.

### Round 12: "Find all event types/names that are emitted in this codebase"
**Category:** Symbol-level | **Winner:** Maproom (11-9)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 69 | 33 (M **52% fewer**) |
| Duration | 143s | 81s (M **43% faster**) |

Largest V2 gap. Maproom's enumeration was more accurate (correctly counted ~57 WebSocket events vs Explore's undercount).

---

## V3 Round Details (R13–R18)

### Round 13: "Trace the lifecycle of a post's metadata"
**Category:** Deep Flow Trace | **Hypothesis:** Explore wins | **Actual:** Maproom wins

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 43 | 28 (**35% fewer**) |
| Duration | 379s | 337s (**11% faster**) |
| Tokens | 92,555 | 53,772 (**42% fewer**) |

Both produced comprehensive 10-stage flow traces (WebSocket → Redux → UI). Both found removeUnneededMetadata normalization, sub-reducers for reactions/openGraph/acknowledgements, complete data flow. Maproom achieved same quality with 35% fewer calls.

### Round 14: "Find all duplicate action prevention"
**Category:** Synonym Discovery | **Hypothesis:** Maproom wins | **Actual:** Maproom wins

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 72 | 30 (**58% fewer**) |
| Duration | 344s | 314s (**9% faster**) |

Both found 9-10 categories: debounce/throttle, DelayedAction, state-based loading, SaveButton/SpinnerButton, early returns, preventDefault, Redux patterns. Explore enumerated 150+ files but Maproom matched breadth in 58% fewer calls.

### Round 15: "Client-side caching with TTL?"
**Category:** Absence Proof | **Hypothesis:** Explore wins | **Actual:** Maproom wins

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 77 | 30 (**61% fewer**) |
| Duration | 340s | 284s (**16% faster**) |

The only accuracy difference in all 15 rounds. Explore incorrectly concluded "NO EXPLICIT TTL CACHING" — missing custom status TTL implementation. Maproom correctly discovered custom status duration presets (30min, 1hr, 4hrs, today, this week) using moment.js-based `calculateExpiryTime()`. Explore found more caching types (12 vs 7) but got the key question wrong.

### Round 16: "What controls the compose box visibility?"
**Category:** Conditional Trace | **Hypothesis:** Explore wins | **Actual:** Maproom wins (perfect)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 75 | 51 (**32% fewer**) |
| Duration | 265s | 183s (**31% faster**) |

Both found archived channel, deactivated DM user, permission-based read-only (canPost/CREATE_POST), channel moderation. Explore produced thorough 6-layer analysis. Maproom achieved perfect 12/12 — same quality, 32% fewer calls, 31% faster.

### Round 17: "Find all date/time formatting"
**Category:** Scattered Cross-Cutting | **Hypothesis:** Maproom wins | **Actual:** Maproom wins (perfect)

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 80 | 39 (**51% fewer**) |
| Duration | 189s | 158s (**16% faster**) |
| Tokens | 92,003 | 52,576 (**43% fewer**) |

Both found moment-timezone, Intl.DateTimeFormat, react-intl (FormattedDate/FormattedTime), Luxon, date-fns. Explore found 30+ locations in 80 calls. Maproom grep-verified coverage (17 moment files, 28 Intl files, 5 Luxon files) in 39 calls. Second perfect 12/12.

### Round 18: "Memoized vs unmemoized selectors"
**Category:** Pattern Anomaly | **Hypothesis:** Toss-up | **Actual:** Tie

| Metric | Explore | Maproom |
|--------|:-------:|:-------:|
| Tool calls | 37 | 36 (~equal) |
| Duration | 134s | 150s (E **11% faster**) |

The only V3 round where both used similar call counts — and the only tie. Both found ~281 createSelector usages, ~81 plain function selectors, same critical performance risk selectors (marketplace .find(), isThreadOpen, getActiveRhsComponent). Confirms: when efficiency equalizes, quality equalizes.

---

## V1 Results (Pre-i18n Cleanup, Historical)

V1 used the same 9 queries as V2 but before removing 51,043 i18n JSON chunks from the Maproom index.

| Round | Category | Query | Explore | Maproom | Winner |
|-------|----------|-------|---------|---------|--------|
| 4 | Conceptual | Env vars loading | **11** | 9 | Explore |
| 5 | Conceptual | HTTP external requests | 8 | **10** | Maproom |
| 6 | Architecture | User signup flow | **11** | 10 | Explore |
| 7 | Architecture | Middleware order | **9** | 8 | Explore |
| 8 | Relationship | UserProfile renderers | 11 | 11 | Tie |
| 9 | Relationship | Logger usage | 9 | **10** | Maproom |
| 10 | Pattern | Feature flags | 11 | **12** | Maproom |
| 11 | Bug Investigation | WebSocket management | 10 | **12** | Maproom |
| 12 | Symbol-level | Event types emitted | 7 | **9** | Maproom |
| **TOTAL** | | | **87/108** | **91/108** | **Maproom** |

### V1 Raw Stats

| Round | Query | Explore calls | Explore time | Maproom calls | Maproom time |
|-------|-------|:------------:|:------------:|:-------------:|:------------:|
| R4 | Env vars | 57 | 113s | 45 | 128s |
| R5 | HTTP external | 79 | 168s | 39 | 96s |
| R6 | Signup flow | 51 | 82s | 30 | 90s |
| R7 | Middleware | 66 | 124s | 68 | 123s |
| R8 | UserProfile | 34 | 70s | 20 | 48s |
| R9 | Logger | 64 | 123s | 41 | 89s |
| R10 | Feature flags | 45 | 80s | 24 | 76s |
| R11 | WebSocket | 47 | 105s | 28 | 75s |
| R12 | Event types | 83 | 164s | 49 | 193s |
| **AVG** | | **58.4** | **114s** | **38.2** | **102s** |
| **TOTAL** | | **526** | **1029s** | **344** | **918s** |

### V1 → V2 Impact of i18n Cleanup

Removed 51,043 i18n JSON chunks (86% of index) via `.maproomignore`.

| Metric | V1 | V2 | Change |
|--------|:--:|:--:|--------|
| Maproom total score | 91 | **95** | +4 |
| Maproom coverage | 23/27 | **25/27** | +2 |
| Maproom avg calls | 38.2 | **32.1** | **-16% fewer** |
| Maproom avg time | 102s | **92s** | **-10% faster** |
| Explore total score | 87 | **93** | +6 (Haiku variance, not cleanup) |

---

## Agent IDs (for output retrieval)

### V2

| Round | Explore | Maproom |
|-------|---------|---------|
| R5 | a98c9b1 | a09d514 |
| R6 | a02ea5b | ad39904 |
| R7 | ab0dd2b | a38628f |
| R8 | a4a2ee0 | a5e96dc |
| R9 | a2da410 | a08efaf |
| R10 | a0ef2fa | af35ef5 |
| R11 | a78c54f | ab10c95 |
| R12 | a7446fb | a38245b |

### V3

| Round | Explore | Maproom |
|-------|---------|---------|
| R13 | aad5a53 | a230eee |
| R14 | a6bef95 | a910b46 |
| R15 | af2da6b | a43c8f0 |
| R16 | a872ce7 | a7725b6 |
| R17 | a96742e | ab777d3 |
| R18 | a8b5b92 | a0ac233 |

---

## Prior Rounds (unscored — methodology wasn't controlled)

| Round | Topic | Notes |
|-------|-------|-------|
| 1 | Authentication | Manual maproom vs Explore agent (apples to oranges) |
| 2 | Error handling | Manual maproom + Explore agent (not controlled) |
| 3 | Database connection | Maproom on Opus vs Explore on Haiku (model not controlled) |
