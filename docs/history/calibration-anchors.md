# Calibration Anchors — Search Olympics Series 2

This document describes the calibration protocol for the Opus judge. Calibration ensures consistent scoring before each codebase block by locking in what each score level looks like for that specific codebase.

---

## When to Use Calibration Anchors

Calibration anchors are used **before each codebase block** during the competition:

1. **Before the FastAPI block**: Load `queries/calibration/fastapi/anchors.md`, then run both calibration rounds
2. **Before the Django block**: Load `queries/calibration/django/anchors.md`, then run both calibration rounds
3. **Before the mattermost-webapp block**: Load `queries/calibration/mattermost-webapp/anchors.md`, then run both calibration rounds

The judge must complete calibration before scoring any competition rounds for that codebase. Calibration resets between codebases — passing FastAPI calibration does not carry over to Django.

### Mid-Competition Recalibration

If dimension histograms during the competition show scoring compression (e.g., all Insight scores cluster at 3-4 with no 1s or 5s), recalibrate by re-reading the anchor examples for the affected dimension. Anchors at scores 1, 2, 4, and 5 should help re-expand the scoring range.

---

## Calibration Protocol

### Step 1: Read Anchors

The judge reads the codebase-specific anchor file, which contains 15 anchor examples: 3 dimensions (Precision, Recall, Insight) at 5 score levels (1-5). Each anchor is a concrete response excerpt showing what that score level looks like for the codebase.

### Step 2: Score Calibration Round 1 (Easy)

The judge reads `calibration-round-1.md` for the current codebase. This contains:
- A query from the query bank (typically easy or medium difficulty)
- A realistic competitor output excerpt (not ideal — includes typical imperfections)
- Official scores hidden until the judge commits their own scores

The judge scores the competitor output on all 3 dimensions (Precision, Recall, Insight) and then compares against the official scores.

### Step 3: Score Calibration Round 2 (Hard)

Same process with `calibration-round-2.md`, which features a harder query. This round deliberately includes a case where Recall is NOT 5 — something was missed by the competitor. The judge must recognize the gap and score accordingly.

---

## The 1-Point Tolerance Rule

For each dimension, the judge's score must be within **1 point** of the official reference score.

| Judge Score vs Official | Result |
|------------------------|--------|
| Exact match | Pass |
| Off by 1 | Pass |
| Off by 2+ on any dimension | Fail |

**Both calibration rounds must pass** before the judge proceeds to score competition rounds.

### Examples

Official scores: Precision 4, Recall 3, Insight 3

| Judge scores | Precision delta | Recall delta | Insight delta | Result |
|-------------|:---:|:---:|:---:|--------|
| P:4, R:3, I:3 | 0 | 0 | 0 | Pass |
| P:5, R:3, I:2 | 1 | 0 | 1 | Pass |
| P:4, R:4, I:4 | 0 | 1 | 1 | Pass |
| P:3, R:3, I:1 | 1 | 0 | **2** | **Fail** |
| P:2, R:3, I:3 | **2** | 0 | 0 | **Fail** |

---

## What to Do If Calibration Fails

If the judge's scores are off by 2+ on any dimension:

1. **Identify the dimension(s) with discrepancy.** Was it Precision, Recall, or Insight?

2. **Re-read the anchors for that dimension.** Focus on the score levels where the discrepancy occurred. For example, if the judge scored Recall 5 but the official is Recall 3, re-read anchors for Recall 3 and Recall 5 to understand the boundary.

3. **Review the scoring rationale.** The calibration round includes an explanation of why each score was assigned. The judge should understand the reasoning before retrying.

4. **Re-score the calibration round.** The judge re-scores the same calibration round. If the scores now fall within 1-point tolerance, proceed.

5. **If calibration still fails after re-reading anchors**, escalate: the competition operator should review the anchor examples and calibration round scores for potential errors, and discuss the discrepancy with the judge prompt before continuing.

---

## Anchor File Locations

| Codebase | Anchors | Calibration Round 1 | Calibration Round 2 |
|----------|---------|---------------------|---------------------|
| FastAPI | `queries/calibration/fastapi/anchors.md` | `queries/calibration/fastapi/calibration-round-1.md` | `queries/calibration/fastapi/calibration-round-2.md` |
| Django | `queries/calibration/django/anchors.md` | `queries/calibration/django/calibration-round-1.md` | `queries/calibration/django/calibration-round-2.md` |
| mattermost-webapp | `queries/calibration/mattermost-webapp/anchors.md` | `queries/calibration/mattermost-webapp/calibration-round-1.md` | `queries/calibration/mattermost-webapp/calibration-round-2.md` |

---

## Anchor Structure

Each anchor file contains 15 examples organized as:

```
## Precision
### Precision — Score 1 ... Score 5

## Recall
### Recall — Score 1 ... Score 5

## Insight
### Insight — Score 1 ... Score 5
```

Each anchor includes:
- **Example output excerpt**: A concrete competitor response at that score level, referencing real files and functions from the codebase
- **Why this scores N**: Explanation of what makes this response score at this level, and what distinguishes it from adjacent levels

Anchors are codebase-specific because what constitutes good recall or insight varies by codebase size and complexity. Finding 4 of 5 key files in FastAPI (a small codebase) is different from finding 40 of 50 key locations in mattermost-webapp (a large codebase).
