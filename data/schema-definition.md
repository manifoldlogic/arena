# JSONL Round-Result Schema Definition

**Schema Version:** 1
**File:** `/workspace/olympics/rounds.jsonl`
**Format:** One JSON object per line, newline-terminated

This is the authoritative schema contract for all scripts that read or write `rounds.jsonl`. Phase 2 implementers must validate against this specification exactly.

## Versioning

The `schema_version` field is an integer, currently `1`. Increment it only on **breaking** schema changes (field removals, type changes, semantic redefinitions). Additive changes (new optional fields) do not require a version bump.

## Atomic Write Requirement

Each JSONL line must be written with a **single `write()` call** including the trailing newline character. On POSIX systems, writes smaller than `PIPE_BUF` (4096 bytes) are atomic, preventing interleaved partial lines from concurrent writers.

## Deduplication Rule

When both `source: "agent"` and `source: "score"` entries exist for the same `(round_id, competitor)` pair, downstream tools (e.g., `generate-scoreboard.py`) **must prefer the `source: "score"` entry**. Agent entries are supplementary and are used only when no score entry exists yet for that pair.

---

## Field Reference

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `schema_version` | int | Yes | Currently `1` | Schema version number. Increment only on breaking changes. |
| `round_id` | string | Yes | Format: `"R01"`, `"BR01"`, `"CAL01"`, etc. | Round identifier taken directly from OLYMP2's `round_id` field. Prefix determines round type: `R` = regular, `BR` = bridge, `CAL` = calibration. Not an integer counter. |
| `competitor` | string | Yes | Non-empty string | Competitor name (e.g., `"maproom"`, `"explore"`). |
| `query_category` | string | Yes | One of the 11 OLYMP2 categories | Category of the query being evaluated (e.g., `"relationship"`, `"flow"`, `"configuration"`). |
| `query_text` | string | Optional | Free text | The full query text posed to competitors. May be absent. |
| `codebase` | string | Yes | Must match OLYMP2's `codebase` field exactly | Target codebase (e.g., `"mattermost-webapp"`, `"django"`, `"fastapi"`). |
| `phase` | int | Yes | 1-3 | OLYMP2 competition phase number. |
| `round_type` | string | Yes | Enum: `"regular"` \| `"bridge"` \| `"calibration"` | Type of round. Derived from `round_id` prefix: `R` -> `"regular"`, `BR` -> `"bridge"`, `CAL` -> `"calibration"`. |
| `precision` | int | Required for `source="score"` | 1-5 | Judged precision score on a 1-5 scale. `null` for agent-only entries (`source="agent"`). |
| `recall` | int | Required for `source="score"` | 1-5 | Judged recall score on a 1-5 scale. `null` for agent-only entries (`source="agent"`). |
| `insight` | int | Required for `source="score"` | 1-5 | Judged insight score on a 1-5 scale. `null` for agent-only entries (`source="agent"`). |
| `total` | int | Required for `source="score"` | 3-15 (sum of precision + recall + insight) | Computed sum of the three score dimensions. `null` for agent-only entries (`source="agent"`). |
| `calls` | int | Yes | >= 0, raw count (not banded) | Raw tool call count. No "low/medium/high" bucketing. |
| `time_s` | float | Yes | >= 0.0, raw seconds (not banded) | Raw wall-clock time in seconds. No banding. |
| `round_winner` | string | Optional | Competitor name or `null` | Winner of the round as determined by the judge. Set on score entries; `null` for agent-only entries. |
| `judge_notes` | string | Optional | Free text or `null` | Judge's commentary. For bridge rounds, this contains `judge_notes_s2` (Series 2 notes); Series 1 notes are not captured. |
| `divergence_signal` | string | Optional, nullable | Enum: `"gray"` \| `"yellow"` \| `"signal"` | Divergence tier from OLYMP2. `"gray"` = spread 0-2 (failed as discriminator), `"yellow"` = spread 3-4 (moderate), `"signal"` = spread 5+ (strong difference). Absent on agent-only entries. |
| `is_calibration` | bool | Yes | `true` when `round_type == "calibration"`, else `false` | Derived flag. Calibration rounds are excluded from competition standings. |
| `series1_scores` | object | Optional | `{"precision": int, "recall": int, "insight": int}` | Series 1 scores for this competitor. **Present only when `round_type == "bridge"`**; `null` or absent for non-bridge rounds. Each sub-field is int 1-5. |
| `series1_baseline` | object | Optional | `{"precision": int, "recall": int, "insight": int}` | Series 1 baseline scores for this competitor. **Present only when `round_type == "bridge"`**; `null` or absent for non-bridge rounds. Each sub-field is int 1-5. |
| `timestamp` | string | Yes | ISO 8601 with trailing `Z` | Auto-generated UTC timestamp (e.g., `"2026-03-20T10:35:00Z"`). |
| `session_id` | string | Yes | Non-empty string | Claude Code session identifier from hook input. |
| `source` | string | Yes | Enum: `"agent"` \| `"score"` | Which hook produced this entry. `"score"` entries are authoritative; `"agent"` entries are supplementary. |

---

## Nullable / Optional Rules Summary

| Condition | Nullable Fields | Absent Fields |
|-----------|----------------|---------------|
| `source = "agent"` | `precision`, `recall`, `insight`, `total`, `round_winner` | `divergence_signal` may be absent |
| `source = "score"` | None of the score fields | All fields present |
| `round_type != "bridge"` | `series1_scores`, `series1_baseline` (null or absent) | -- |
| `round_type = "bridge"` | -- | `series1_scores` and `series1_baseline` are present with sub-fields |

---

## Annotated JSONL Examples

### Example 1: Regular Round (source="score")

All fields populated. This is the canonical entry type produced by `log-round.py --mode=score` for a standard competition round.

```json
{"schema_version": 1, "round_id": "R01", "competitor": "maproom", "query_category": "relationship", "query_text": "What calls the ORM QuerySet evaluation methods?", "codebase": "django", "phase": 1, "round_type": "regular", "precision": 4, "recall": 3, "insight": 5, "total": 12, "calls": 18, "time_s": 45.2, "round_winner": "maproom", "judge_notes": "Maproom found all three call sites plus the lazy evaluation path", "divergence_signal": "signal", "is_calibration": false, "series1_scores": null, "series1_baseline": null, "timestamp": "2026-03-20T10:35:00Z", "session_id": "sess_abc123", "source": "score"}
```

**Notes:**
- `round_id` is `"R01"` (string, not integer) -- prefix `R` means `round_type = "regular"`
- Score fields are all populated integers 1-5; `total` = 4 + 3 + 5 = 12
- `series1_scores` and `series1_baseline` are `null` because this is not a bridge round
- `divergence_signal` is `"signal"` (spread >= 5, strong tool difference)
- `calls` and `time_s` are raw numbers, not banded

### Example 2: Bridge Round (round_type="bridge")

Bridge rounds carry Series 1 scores and baseline alongside the current (Series 2) scores.

```json
{"schema_version": 1, "round_id": "BR01", "competitor": "explore", "query_category": "flow", "query_text": "Trace the request lifecycle from middleware to view", "codebase": "fastapi", "phase": 2, "round_type": "bridge", "precision": 3, "recall": 4, "insight": 3, "total": 10, "calls": 22, "time_s": 38.7, "round_winner": "explore", "judge_notes": "Explore traced the full ASGI lifecycle including middleware chain", "divergence_signal": "yellow", "is_calibration": false, "series1_scores": {"precision": 3, "recall": 4, "insight": 3}, "series1_baseline": {"precision": 3, "recall": 3, "insight": 2}, "timestamp": "2026-03-21T14:20:00Z", "session_id": "sess_def456", "source": "score"}
```

**Notes:**
- `round_id` prefix `BR` means `round_type = "bridge"`
- `series1_scores` contains this competitor's scores from the original Series 1 evaluation
- `series1_baseline` contains the baseline scores for cross-series comparison
- `judge_notes` contains Series 2 notes (`judge_notes_s2` from the comparative JSON); Series 1 notes are not captured
- The main score fields (`precision`, `recall`, `insight`, `total`) reflect Series 2 scoring

### Example 3: Calibration Round (round_type="calibration")

Calibration rounds are excluded from competition standings. `is_calibration` is `true`.

```json
{"schema_version": 1, "round_id": "CAL01", "competitor": "maproom", "query_category": "configuration", "query_text": "Where is the database connection pool configured?", "codebase": "mattermost-webapp", "phase": 1, "round_type": "calibration", "precision": 4, "recall": 4, "insight": 3, "total": 11, "calls": 12, "time_s": 28.1, "round_winner": "maproom", "judge_notes": "Both tools found the config; Maproom also identified the env override", "divergence_signal": "gray", "is_calibration": true, "series1_scores": null, "series1_baseline": null, "timestamp": "2026-03-20T09:15:00Z", "session_id": "sess_ghi789", "source": "score"}
```

**Notes:**
- `round_id` prefix `CAL` means `round_type = "calibration"` and `is_calibration = true`
- Calibration rounds have full score data but are **excluded from competition standings** by the scoreboard generator
- `divergence_signal` is `"gray"` (spread 0-2, query failed as discriminator)
- `series1_scores` and `series1_baseline` are `null` (calibration rounds are not bridge rounds)
