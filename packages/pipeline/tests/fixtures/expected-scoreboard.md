# Olympics Scoreboard

## 1. Overall Standings

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| maproom | 47 | 4 | 0 | 0 | 4 |
| explore | 34 | 0 | 0 | 4 | 4 |
| baseline | 6 | 0 | 0 | 1 | 1 |

## 2. Per-Codebase Breakdown

### django

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| maproom | 26 | 2 | 0 | 0 | 2 |
| explore | 17 | 0 | 0 | 2 | 2 |
| baseline | 6 | 0 | 0 | 1 | 1 |

### fastapi

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| maproom | 21 | 2 | 0 | 0 | 2 |
| explore | 17 | 0 | 0 | 2 | 2 |

## 3. Per-Query-Category Breakdown

### configuration

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| maproom | 12 | 1 | 0 | 0 | 1 |
| explore | 9 | 0 | 0 | 1 | 1 |
| baseline | 6 | 0 | 0 | 1 | 1 |

### flow

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| maproom | 21 | 2 | 0 | 0 | 2 |
| explore | 17 | 0 | 0 | 2 | 2 |

### relationship

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| maproom | 14 | 1 | 0 | 0 | 1 |
| explore | 8 | 0 | 0 | 1 | 1 |

## 4. Round-by-Round Details

| Round | Competitor | Precision | Recall | Insight | Total | Calls | Time (s) | Divergence |
|-------|------------|-----------|--------|---------|-------|-------|----------|------------|
| BR01 | explore | 3 | 3 | 2 | 8 | 25 | 50.0 | yellow |
| BR01 | maproom | 4 | 4 | 3 | 11 | 19 | 42.0 | yellow |
| R01 | explore | 3 | 3 | 2 | 8 | 35 | 62.1 | signal |
| R01 | maproom | 4 | 5 | 5 | 14 | 18 | 45.2 | signal |
| R02 | explore | 3 | 3 | 3 | 9 | 28 | 55.0 | gray |
| R02 | maproom | 3 | 4 | 3 | 10 | 15 | 30.5 | gray |
| R03 | baseline | 2 | 2 | 2 | 6 | 40 | 70.0 | yellow |
| R03 | explore | 3 | 3 | 3 | 9 | 30 | 50.0 | yellow |
| R03 | maproom | 4 | 4 | 4 | 12 | 16 | 40.0 | yellow |

## 5. Divergence Signals

### Gray (spread 0-2): query failed as discriminator

| Round | Codebase | Spread |
|-------|----------|--------|
| R02 | fastapi | 1 |

### Yellow (spread 3-4): moderate discrimination

| Round | Codebase | Spread |
|-------|----------|--------|
| R03 | django | 6 |
| BR01 | fastapi | 3 |

### Signal (spread 5+): strong tool difference

| Round | Codebase | Spread |
|-------|----------|--------|
| R01 | django | 6 |

## 6. Closest Calls

Rounds where winning margin <= 1.

| Round | Codebase | Competitors | Totals | Margin |
|-------|----------|-------------|--------|--------|
| R02 | fastapi | explore, maproom | 9, 10 | 1 |

## 7. Dimension Totals

| Competitor | Total Precision | Total Recall | Total Insight |
|------------|----------------|--------------|---------------|
| baseline | 2 | 2 | 2 |
| explore | 12 | 12 | 10 |
| maproom | 15 | 17 | 15 |

## 8. Bridge Rounds

| Round | Competitor | S2 Precision | S2 Recall | S2 Insight | S2 Total | S1 Precision | S1 Recall | S1 Insight |
|-------|------------|-------------|----------|-----------|---------|-------------|----------|-----------|
| BR01 | explore | 3 | 3 | 2 | 8 | 3 | 3 | 2 |
| BR01 | maproom | 4 | 4 | 3 | 11 | 3 | 4 | 3 |

## 9. Calibration Rounds

*These rounds are excluded from competition standings.*

| Round | Competitor | Precision | Recall | Insight | Total |
|-------|------------|-----------|--------|---------|-------|
| CAL01 | explore | 3 | 3 | 3 | 9 |
| CAL01 | maproom | 4 | 4 | 3 | 11 |
