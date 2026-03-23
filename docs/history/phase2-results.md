# Phase 2 Results — Search Olympics Series 2

**Generated:** 2026-03-21
**Competitors:** Explore (text/regex), Maproom (FTS), ast-grep (structural/AST)
**Model:** Haiku (all competitors, all rounds)
**Codebases:** FastAPI (6 rounds), Django (6 rounds)
**Total Phase 2 rounds:** 12 + 1 showdown gate

---

## Full Results Table

### FastAPI Phase 2 (6 rounds)

| Round ID       | Category          | ast-grep | Explore | Maproom | Winner  | Div | Signal |
| -------------- | ----------------- | :------: | :-----: | :-----: | ------- | :-: | :----: |
| fastapi-P2-R01 | pattern-discovery |    11    |   14    |   15    | Maproom |  4  | yellow |
| fastapi-P2-R02 | flow-tracing      |    9     |   14    |   11    | Explore |  5  | signal |
| fastapi-P2-R03 | absence-proof     |    13    |   14    |   12    | Explore |  2  |  gray  |
| fastapi-P2-R04 | relationship      |    12    |   15    |   13    | Explore |  3  | yellow |
| fastapi-P2-R05 | bug-investigation |    13    |   15    |   12    | Explore |  3  | yellow |
| fastapi-P2-R06 | pattern-discovery |    12    |   15    |   14    | Explore |  3  | yellow |
| **TOTAL**      |                   |  **70**  | **87**  | **77**  |         |     |        |

**FastAPI winner: Explore (87)** — wins 5/6 rounds, loses only P2-R01 (pattern-discovery) to Maproom.

### Django Phase 2 (6 rounds)

| Round ID      | Category          | ast-grep | Explore | Maproom | Winner  | Div | Signal |
| ------------- | ----------------- | :------: | :-----: | :-----: | ------- | :-: | :----: |
| django-P2-R01 | pattern-discovery |    11    |   15    |   12    | Explore |  4  | yellow |
| django-P2-R02 | pattern-discovery |    14    |   14    |   14    | Tie     |  0  |  gray  |
| django-P2-R03 | absence-proof     |    12    |   15    |   12    | Explore |  3  | yellow |
| django-P2-R04 | enumeration       |    14    |   15    |   13    | Explore |  2  |  gray  |
| django-P2-R05 | bug-investigation |    11    |   15    |   12    | Explore |  4  | yellow |
| django-P2-R06 | ambiguous-premise |    11    |   15    |   13    | Explore |  4  | yellow |
| **TOTAL**     |                   |  **73**  | **89**  | **76**  |         |     |        |

**Django winner: Explore (89)** — wins 5/6 rounds, ties P2-R02 (management command naming, all competitors at 14).

### Showdown Gate Round (pre-Phase 2)

| Round ID    | Category     | ast-grep | Explore | Maproom | Winner  | Div | Signal |
| ----------- | ------------ | :------: | :-----: | :-----: | ------- | :-: | :----: |
| showdown-01 | flow-tracing |    12    |   14    |   10    | Explore |  4  | signal |

---

## Combined Phase 2 Totals

| Competitor  | FastAPI | Django | Combined (180 max) | Avg/Round |
| ----------- | :-----: | :----: | :----------------: | :-------: |
| **Explore** |   87    |   89   |      **176**       |   14.67   |
| Maproom     |   77    |   76   |        153         |   12.75   |
| ast-grep    |   70    |   73   |        143         |   11.92   |

### Win/Tie/Loss Record

| Competitor | Wins | Ties | Losses | Win Rate |
| ---------- | :--: | :--: | :----: | :------: |
| Explore    |  10  |  1   |   1    |   83%    |
| Maproom    |  1   |  1   |   10   |    8%    |
| ast-grep   |  0   |  1   |   11   |    0%    |

### Divergence Signal Distribution

| Signal | Count | Rounds                                                                        |
| ------ | :---: | ----------------------------------------------------------------------------- |
| gray   |   3   | fastapi-P2-R03, django-P2-R02, django-P2-R04                                  |
| yellow |   8   | fastapi-P2-R01, P2-R04, P2-R05, P2-R06; django-P2-R01, P2-R03, P2-R05, P2-R06 |
| signal |   1   | fastapi-P2-R02                                                                |

Gray rate: 3/12 = 25% (down from 100% in Phase 1).

---

## Dimension-Level Summary

### Per-Dimension Totals (12 rounds, max 60 per dimension)

| Dimension | ast-grep | Explore | Maproom |
| --------- | :------: | :-----: | :-----: |
| Precision |    59    |   60    |   59    |
| Recall    |    45    |   60    |   52    |
| Insight   |    39    |   56    |   42    |
| **Total** | **143**  | **176** | **153** |

### Per-Dimension Averages (per round)

| Dimension | ast-grep | Explore | Maproom |
| --------- | :------: | :-----: | :-----: |
| Precision |   4.92   |  5.00   |  4.92   |
| Recall    |   3.75   |  5.00   |  4.33   |
| Insight   |   3.25   |  4.67   |  3.50   |

### Dimension Gap Analysis

- **Precision** is non-discriminating: all three competitors cluster at 4.83-5.00. Precision provides zero useful signal for separating tools.
- **Recall** is the primary gap driver: Explore achieves perfect 5.00 average across all 12 rounds. ast-grep trails by 1.25 points/round; Maproom trails by 0.67 points/round.
- **Insight** is the secondary driver: Explore leads at 4.67, with ast-grep (3.25) and Maproom (3.50) closely clustered.

---

## Per-Codebase Dimension Comparison

### FastAPI

| Dimension | ast-grep | Explore | Maproom |
| --------- | :------: | :-----: | :-----: |
| Precision |   4.83   |  5.00   |  4.83   |
| Recall    |   3.67   |  5.00   |  4.33   |
| Insight   |   3.17   |  4.50   |  3.67   |

### Django

| Dimension | ast-grep | Explore | Maproom |
| --------- | :------: | :-----: | :-----: |
| Precision |   5.00   |  5.00   |  5.00   |
| Recall    |   3.83   |  5.00   |  4.33   |
| Insight   |   3.33   |  4.83   |  3.33   |

**Observation:** Maproom's insight advantage over ast-grep on FastAPI (+0.50) vanishes on Django (tied at 3.33). Both non-Explore tools converge to similar insight quality on the larger codebase.
