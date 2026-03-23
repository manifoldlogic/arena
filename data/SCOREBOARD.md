# Olympics Scoreboard

## 1. Overall Standings

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| maproom | 55 | 3 | 0 | 1 | 4 |
| explore | 53 | 1 | 0 | 3 | 4 |

## 2. Per-Codebase Breakdown

### mattermost-webapp

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| maproom | 55 | 3 | 0 | 1 | 4 |
| explore | 53 | 1 | 0 | 3 | 4 |

## 3. Per-Query-Category Breakdown

### flow

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| maproom | 28 | 2 | 0 | 0 | 2 |
| explore | 26 | 0 | 0 | 2 | 2 |

### pattern

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| explore | 14 | 1 | 0 | 0 | 1 |
| maproom | 13 | 0 | 0 | 1 | 1 |

### relationship

| Competitor | Total Score | W | T | L | Rounds |
|------------|------------|---|---|---|--------|
| maproom | 14 | 1 | 0 | 0 | 1 |
| explore | 13 | 0 | 0 | 1 | 1 |

## 4. Round-by-Round Details

| Round | Competitor | Precision | Recall | Insight | Total | Calls | Time (s) | Divergence |
|-------|------------|-----------|--------|---------|-------|-------|----------|------------|
| R19 | explore | 5 | 4 | 4 | 13 | 47 | 150.6 | gray |
| R19 | maproom | 5 | 5 | 4 | 14 | 58 | 245.5 | gray |
| R20 | explore | 5 | 5 | 4 | 14 | 51 | 159.0 | gray |
| R20 | maproom | 5 | 4 | 4 | 13 | 50 | 196.5 | gray |
| R21 | explore | 5 | 4 | 4 | 13 | 46 | 154.8 | gray |
| R21 | maproom | 5 | 5 | 4 | 14 | 47 | 116.2 | gray |
| R22 | explore | 5 | 4 | 4 | 13 | 67 | 190.7 | gray |
| R22 | maproom | 5 | 5 | 4 | 14 | 76 | 177.9 | gray |

## 5. Divergence Signals

### Gray (spread 0-2): query failed as discriminator

| Round | Codebase | Spread |
|-------|----------|--------|
| R19 | mattermost-webapp | 1 |
| R20 | mattermost-webapp | 1 |
| R21 | mattermost-webapp | 1 |
| R22 | mattermost-webapp | 1 |

### Yellow (spread 3-4): moderate discrimination

| Round | Codebase | Spread |
|-------|----------|--------|

### Signal (spread 5+): strong tool difference

| Round | Codebase | Spread |
|-------|----------|--------|

## 6. Closest Calls

Rounds where winning margin <= 1.

| Round | Codebase | Competitors | Totals | Margin |
|-------|----------|-------------|--------|--------|
| R19 | mattermost-webapp | explore, maproom | 13, 14 | 1 |
| R20 | mattermost-webapp | explore, maproom | 14, 13 | 1 |
| R21 | mattermost-webapp | explore, maproom | 13, 14 | 1 |
| R22 | mattermost-webapp | explore, maproom | 13, 14 | 1 |

## 7. Dimension Totals

| Competitor | Total Precision | Total Recall | Total Insight |
|------------|----------------|--------------|---------------|
| explore | 20 | 17 | 16 |
| maproom | 20 | 19 | 16 |

## 8. Bridge Rounds

| Round | Competitor | S2 Precision | S2 Recall | S2 Insight | S2 Total | S1 Precision | S1 Recall | S1 Insight |
|-------|------------|-------------|----------|-----------|---------|-------------|----------|-----------|

## 9. Calibration Rounds

*These rounds are excluded from competition standings.*

| Round | Competitor | Precision | Recall | Insight | Total |
|-------|------------|-----------|--------|---------|-------|
