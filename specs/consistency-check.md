# ARENA-44 Consistency Check

**Date:** 2026-03-28
**Checked by:** verify-task

## Results Summary

| Check | Description                                 | Result | Notes                                                                                                                                                          |
| ----- | ------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Scoring dimension coverage (spec -> schema) | PASS   | All 7 spec dimensions map to schema fields with correct types                                                                                                  |
| 2     | Schema field coverage (schema -> spec)      | PASS   | No orphaned scored/judged fields; supplementary metadata fields (test_suite_passed, tests_total, tests_passed) are verification support, not scored dimensions |
| 3     | Process log fidelity enum alignment         | PASS   | All three enum values match exactly: "structured", "semi-structured", "minimal"                                                                                |
| 4     | Annotated example validity                  | PASS   | All 3 examples pass all validation rules                                                                                                                       |
| 5     | Backward compatibility with rounds.jsonl    | PASS   | 11 shared fields have identical types and semantics                                                                                                            |
| 6     | Composite formula field references          | PASS   | All 3 formula variables map to schema fields; efficiency metrics excluded from formula                                                                         |
| 7     | Difficulty tier alignment                   | PASS   | All three tier names match exactly: "localized", "cross-cutting", "subtle"                                                                                     |

## Detailed Findings

### Check 1: Scoring Dimension Coverage (spec -> schema)

Verified that each scoring dimension defined in `specs/competition-types/bug-fix.md` has a corresponding field in `specs/schemas/discovery-round-schema.md` with the correct type and constraints.

| Spec Dimension               | Schema Field      | Schema Type | Schema Constraints | Match |
| ---------------------------- | ----------------- | ----------- | ------------------ | ----- |
| Correctness (binary)         | `correctness`     | int         | 0 or 1             | Yes   |
| Process Quality (judged 1-5) | `process_quality` | int         | 1-5                | Yes   |
| Patch Quality (judged 1-5)   | `patch_quality`   | int         | 1-5                | Yes   |
| Tool calls (count)           | `calls`           | int         | >= 0               | Yes   |
| Wall time (seconds)          | `time_s`          | float       | >= 0.0             | Yes   |
| Tokens (count)               | `tokens`          | int         | >= 0 (Optional)    | Yes   |
| Cost (USD)                   | `cost_usd`        | float       | >= 0.0 (Optional)  | Yes   |

**Evidence:** bug-fix.md Scoring Dimensions section (lines 49-119) vs. discovery-round-schema.md Field Reference table (lines 49-78).

### Check 2: Schema Field Coverage (schema -> spec)

Examined all scored/judged fields in the schema and confirmed each has a definition in the spec.

**Scored fields in schema:** `correctness`, `process_quality`, `patch_quality` -- all three are defined in bug-fix.md's Scoring Dimensions section with anchored rubrics.

**Efficiency fields in schema:** `calls`, `time_s`, `tokens`, `cost_usd` -- all four are defined in bug-fix.md's Efficiency (Measured) table.

**Supplementary metadata fields in schema not explicitly named as scoring dimensions in the spec:**

- `test_suite_passed` (bool) -- Supports the correctness verification protocol described in bug-fix.md (lines 59-66). Not a scoring dimension; records whether the full test suite passed.
- `tests_total` (int, Optional) -- Implementation detail of test suite run. Not a scoring dimension.
- `tests_passed` (int, Optional) -- Implementation detail of test suite run. Not a scoring dimension.

These three fields are verification metadata that support the correctness determination process described in the spec. They are not orphaned scored fields.

**No orphaned scored/judged fields found.**

### Check 3: Process Log Fidelity Enum Alignment

Extracted fidelity level names from both documents and compared for exact string match.

**From bug-fix.md** (Process Log Comparability section, lines 245-249):

1. `structured`
2. `semi-structured`
3. `minimal`

**From discovery-round-schema.md** (Field Reference, `process_log_fidelity` field, line 74):

1. `"structured"`
2. `"semi-structured"`
3. `"minimal"`

**Result:** All three values are identical strings in both documents.

### Check 4: Annotated Example Validity

Validated each of the three annotated JSONL examples in discovery-round-schema.md against the field constraints.

**Example 1** (Successful Fix, source="score", line 106):

- `correctness`: 1 -- Valid (int, 0 or 1)
- `process_quality`: 4 -- Valid (int, 1-5, required for source="score")
- `patch_quality`: 5 -- Valid (int, 1-5, required for source="score")
- `process_log_fidelity`: "structured" -- Valid enum value
- `difficulty_tier`: "localized" -- Valid (matches bug-fix.md tier: `localized`)

**Example 2** (Failed Fix, source="score", line 123):

- `correctness`: 0 -- Valid (int, 0 or 1)
- `process_quality`: 3 -- Valid (int, 1-5, required for source="score")
- `patch_quality`: 2 -- Valid (int, 1-5, required for source="score")
- `process_log_fidelity`: "semi-structured" -- Valid enum value
- `difficulty_tier`: "localized" -- Valid (matches bug-fix.md tier: `localized`)

**Example 3** (Agent-Only Entry, source="agent", line 139):

- `correctness`: null -- Valid (null for source="agent")
- `process_quality`: null -- Valid (null for source="agent")
- `patch_quality`: null -- Valid (null for source="agent")
- `process_log_fidelity`: "structured" -- Valid enum value
- `difficulty_tier`: absent -- Valid (Optional field, not yet assigned per nullable rules)

**All 3 examples pass all validation rules.**

### Check 5: Backward Compatibility with rounds.jsonl

Identified all field names shared between `specs/schemas/discovery-round-schema.md` and `data/schema-definition.md`. Confirmed type and semantic compatibility for each.

The discovery schema explicitly states: "reuses field names where semantics overlap (e.g., round_id, competitor, calls, time_s, timestamp, session_id, source)".

| Shared Field     | rounds.jsonl Type           | discovery Type          | Semantics Match                                                                  |
| ---------------- | --------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `schema_version` | int (currently 1)           | int (currently 1)       | Yes -- same versioning policy                                                    |
| `round_id`       | string (non-empty)          | string (non-empty)      | Yes -- both are round identifiers; different prefix conventions (R/BR/CAL vs. D) |
| `competitor`     | string (non-empty)          | string (non-empty)      | Yes -- competitor name                                                           |
| `codebase`       | string                      | string                  | Yes -- target codebase identifier                                                |
| `calls`          | int, >= 0 (raw count)       | int, >= 0               | Yes -- raw tool call count, same semantics                                       |
| `time_s`         | float, >= 0.0 (raw seconds) | float, >= 0.0           | Yes -- raw wall-clock seconds, same semantics                                    |
| `round_winner`   | string, Optional            | string, Optional        | Yes -- winner as determined by judge                                             |
| `judge_notes`    | string, Optional            | string, Optional        | Yes -- judge commentary                                                          |
| `timestamp`      | string, ISO 8601 + Z        | string, ISO 8601 + Z    | Yes -- auto-generated UTC timestamp                                              |
| `session_id`     | string (non-empty)          | string (non-empty)      | Yes -- session identifier                                                        |
| `source`         | Enum: "agent" / "score"     | Enum: "agent" / "score" | Yes -- same enum values and deduplication semantics                              |

**All 11 shared fields have identical types and compatible semantics.**

### Check 6: Composite Formula Field References

Extracted variable names from the composite formula in bug-fix.md and verified each maps to a schema field.

**Formula** (bug-fix.md line 128):

```
composite = W_c * correctness + W_p * process_quality + W_q * patch_quality
```

| Formula Variable  | Schema Field      | Exists | Type Match   |
| ----------------- | ----------------- | ------ | ------------ |
| `correctness`     | `correctness`     | Yes    | int (0 or 1) |
| `process_quality` | `process_quality` | Yes    | int (1-5)    |
| `patch_quality`   | `patch_quality`   | Yes    | int (1-5)    |

**Efficiency metrics exclusion check:**

- `calls` -- NOT in formula (confirmed)
- `time_s` -- NOT in formula (confirmed)
- `tokens` -- NOT in formula (confirmed)
- `cost_usd` -- NOT in formula (confirmed)

Bug-fix.md explicitly states (line 163): "Efficiency metrics (tool calls, wall time, tokens, cost) are reported alongside the composite score but are NOT included in the composite formula."

**All formula variables map to schema fields. Efficiency metrics are correctly excluded.**

### Check 7: Difficulty Tier Alignment

Extracted tier names from both documents and compared for exact string match.

**From bug-fix.md** (Query Format > Difficulty Tiers table, lines 39-43):

1. `localized`
2. `cross-cutting`
3. `subtle`

**From discovery-round-schema.md** (`difficulty_tier` field enum, line 78):

1. `"localized"`
2. `"cross-cutting"`
3. `"subtle"`

**Result:** All three tier names are identical strings in both documents.

~~Additionally, bug-fix.md states (line 45): "The `query_difficulty` field on the round result uses these tier identifiers." The schema names this field `difficulty_tier` rather than `query_difficulty`.~~ **Resolved by ARENA-44.4001:** bug-fix.md line 45 now correctly references `difficulty_tier`.

## Overall Verdict

**PASS**

All 7 cross-reference checks passed. The bug-fix competition spec, discovery round schema, and existing rounds.jsonl schema are internally consistent.

---

## Re-Check After ARENA-44.4001 Corrections

**Date:** 2026-03-28
**Checked by:** verify-task

ARENA-44.4001 applied two HIGH-severity corrections to `specs/competition-types/bug-fix.md`:

1. **Field name mismatch resolved:** Line 45 now reads "The `difficulty_tier` field" (was `query_difficulty`). Check 7 (difficulty tier alignment) continues to PASS — the spec and schema now use identical field naming.
2. **Codebase scope corrected:** Known Limitations now correctly identifies `clap-rs/clap` as the discovery sprint target, consistent with the planning documents.

**Re-check result:** No new inconsistencies introduced. All 7 original checks remain PASS.
