# Cross-Series Comparison — Search Olympics Series 1 vs Series 2

**Date:** 2026-03-21
**Codebase:** mattermost-webapp
**Methodology:** 5 bridge rounds reusing Series 1 queries, scored under both S1 and S2 rubrics

This document is suitable for `docs/olympics-v2/` as a standalone reference.

---

## Background

Series 1 (Olympics v1) compared Explore vs Maproom on mattermost-webapp using a 4-dimension rubric: Speed (1-3), Coverage (1-3), Accuracy (1-3), Efficiency (1-3). Maximum per-round score: 12.

Series 2 (Olympics v2) uses a 3-dimension rubric: Precision (1-5), Recall (1-5), Insight (1-5). Maximum per-round score: 15.

To isolate rubric effects from competitor changes, 5 bridge rounds reused exact Series 1 queries on the same codebase. Each bridge round was scored under both systems, and compared against the Series 1 baseline from the original competition.

---

## Scoring System Comparison

| Property           | Series 1                              | Series 2                   |
| ------------------ | ------------------------------------- | -------------------------- |
| Dimensions         | Speed, Coverage, Accuracy, Efficiency | Precision, Recall, Insight |
| Scale per dim      | 1-3                                   | 1-5                        |
| Max per round      | 12                                    | 15                         |
| Efficiency tracked | Explicit dimension                    | Measured but not scored    |
| Dynamic range      | 3 levels per dimension                | 5 levels per dimension     |
| Total points/round | 4 dims x 3 = 12                       | 3 dims x 5 = 15            |

**Key difference:** S1 rewards tool call economy (Efficiency dimension favors Maproom). S2 rewards explanation depth (Insight dimension favors whichever competitor explains architectural decisions better — on mattermost-webapp, this is Explore).

---

## Round-by-Round Results

### BR01: "How are environment variables loaded and validated?"

| System      | Explore | Maproom | Winner  |
| ----------- | :-----: | :-----: | ------- |
| S1 Baseline |   10    |   11    | Maproom |
| S1 Rerun    |   10    |   12    | Maproom |
| S2          |   13    |   13    | Tie     |

Maproom's S1 edge came from efficiency (3 vs 2). Under S2, both competitors achieve identical scores because equivalent depth of explanation neutralizes the tool call gap.

### BR02: "What components render the UserProfile component?"

| System      | Explore | Maproom | Winner  |
| ----------- | :-----: | :-----: | ------- |
| S1 Baseline |   12    |   11    | Explore |
| S1 Rerun    |   12    |   12    | Tie     |
| S2          |   13    |   12    | Explore |

Explore wins under both S1 baseline and S2. Maproom improved coverage in the rerun (2 to 3) but Explore's Recall edge (5 vs 4, from finding more rendering locations) persists under S2.

### BR03: "How are feature flags checked throughout the code?"

| System      | Explore | Maproom | Winner  |
| ----------- | :-----: | :-----: | ------- |
| S1 Baseline |   11    |   11    | Tie     |
| S1 Rerun    |   10    |   12    | Maproom |
| S2          |   13    |   12    | Explore |

The S1 tie breaks differently depending on rubric: S1 rerun favors Maproom (efficiency), S2 favors Explore (insight). Explore's Insight 4 vs Maproom's 3 reflects the multi-pattern taxonomy and the absence-of-boolean-coercion observation.

### BR04: "Where are WebSocket connections managed and cleaned up?"

| System      | Explore | Maproom | Winner  |
| ----------- | :-----: | :-----: | ------- |
| S1 Baseline |   11    |   12    | Maproom |
| S1 Rerun    |   12    |   12    | Tie     |
| S2          |   15    |   14    | Explore |

**The clearest reversal.** Maproom won S1 via efficiency; Explore wins S2 via insight. Explore's S2 Insight score of 5 (the only perfect insight score in all bridge rounds) reflects explaining thundering herd jitter design, connectionId-based missed message detection, and the 4-layer WebSocket architecture with separation of concerns.

### BR05: "Find all event types/names that are emitted in this codebase"

| System      | Explore | Maproom | Winner  |
| ----------- | :-----: | :-----: | ------- |
| S1 Baseline |    9    |   11    | Maproom |
| S1 Rerun    |   10    |   12    | Maproom |
| S2          |   14    |   13    | Explore |

**Largest baseline gap, full reversal.** Explore's S1 weakness was efficiency (1/3) — it used many more tool calls than Maproom. Under S2, those extra calls are not penalized and enable deeper investigation. Explore found 6 event systems vs Maproom's 5 (including the window.postMessage desktop app channel).

---

## Aggregate Totals

### By Scoring System

| System      | Explore Total | Maproom Total | Winner  | Margin |
| ----------- | :-----------: | :-----------: | ------- | :----: |
| S1 Baseline |      53       |      56       | Maproom |   +3   |
| S1 Rerun    |      54       |      60       | Maproom |   +6   |
| S2          |      68       |      64       | Explore |   +4   |

### Win/Tie/Loss Record

| System      | Explore Wins | Ties | Maproom Wins |
| ----------- | :----------: | :--: | :----------: |
| S1 Baseline |      1       |  2   |      2       |
| S1 Rerun    |      0       |  1   |      4       |
| S2          |      4       |  1   |      0       |

---

## Dimension-Level Analysis

### S2 Dimension Totals (5 bridge rounds)

| Dimension | Explore | Maproom | Leader  | Gap/Round |
| --------- | :-----: | :-----: | ------- | :-------: |
| Precision |   25    |   25    | Tied    |   0.00    |
| Recall    |   23    |   22    | Explore |   +0.20   |
| Insight   |   20    |   17    | Explore |   +0.60   |

### S1 Rerun Dimension Totals

| Dimension  | Explore | Maproom | Leader  | Gap/Round |
| ---------- | :-----: | :-----: | ------- | :-------: |
| Speed      |   12    |   15    | Maproom |   +0.60   |
| Coverage   |   15    |   15    | Tied    |   0.00    |
| Accuracy   |   15    |   15    | Tied    |   0.00    |
| Efficiency |   11    |   15    | Maproom |   +0.80   |

The data shows that Coverage/Accuracy (S1) and Precision/Recall (S2) are tied or near-tied. The outcome depends entirely on whether Efficiency (S1, favors Maproom) or Insight (S2, favors Explore) is included.

---

## Conclusions

### 1. The scoring system determines the winner

The same competitors, on the same codebase, with the same queries, produce opposite outcomes under different rubrics. This is the central finding of the cross-series comparison.

### 2. Maproom's efficiency advantage is real and stable

Maproom consistently uses 15-36% fewer tool calls across all series and codebases. This advantage is robust and independent of scoring system.

### 3. Explore's insight advantage is real on larger codebases

Explore consistently provides richer architectural context, design rationales, and cross-component connections. On mattermost-webapp (large, ~500k+ LOC) and Django (~202k LOC), this translates to higher Insight scores. On FastAPI (~19k LOC), Maproom's efficiency leaves more budget for synthesis, and Maproom leads on Insight.

### 4. The bridge methodology validates rubric comparison

By controlling for competitor behavior (same queries, same codebase, rerunning with both scoring systems), the bridge rounds isolate the effect of scoring design. Future series changes to the rubric can be benchmarked against these bridge results.

### 5. Neither competitor is dominant

Across all scoring systems and codebases, neither Explore nor Maproom produces consistently superior results. The choice between them is a choice about which dimension to optimize: tool call economy (Maproom) or explanation depth (Explore). The "right" tool depends on what the user values.
