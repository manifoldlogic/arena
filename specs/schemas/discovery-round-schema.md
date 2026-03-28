# Discovery Round JSONL Schema Definition

**Schema Version:** 1
**File:** `data/discovery-rounds.jsonl`
**Format:** One JSON object per line, newline-terminated

This is the authoritative schema contract for all scripts that read or write `data/discovery-rounds.jsonl`. It defines the record format for bug-fix competition rounds run during the discovery sprint.

## Relationship to rounds.jsonl

`discovery-rounds.jsonl` is a **separate file** from `data/rounds.jsonl`. This is a deliberate design decision:

- `rounds.jsonl` records search-competition results and has a stable, production schema (`data/schema-definition.md`).
- `discovery-rounds.jsonl` records bug-fix competition results. Its schema shares naming conventions and reuses field names where semantics overlap (e.g., `round_id`, `competitor`, `calls`, `time_s`, `timestamp`, `session_id`, `source`) but introduces new fields specific to bug-fix scoring (`correctness`, `process_quality`, `patch_quality`, `issue_url`, `failing_test`, etc.).
- Keeping the files separate avoids polluting the production search data with experimental discovery data and allows the discovery schema to evolve independently during the sprint.

### Why this schema lives in specs/schemas/ not data/

The search competition's schema definition (`data/schema-definition.md`) lives alongside its data file because it is a stable, production-grade contract. This discovery schema lives in `specs/schemas/` because it is **experimental** -- written for the discovery sprint and expected to evolve before reaching production status. Once the bug-fix competition format is validated and stabilized, the schema may move to `data/` alongside `discovery-rounds.jsonl`.

### TypeScript Types

TypeScript types for this schema will eventually be needed for the web-ui dashboard but are NOT created by this specification. They will be added to `packages/schemas/` in a separate ticket once the schema stabilizes.

---

## Versioning

The `schema_version` field is an integer, currently `1`. Increment it only on **breaking** schema changes (field removals, type changes, semantic redefinitions). Additive changes (new optional fields) do not require a version bump.

This follows the same versioning policy as `data/rounds.jsonl`.

---

## Atomic Write Requirement

Each JSONL line must be written with a **single `write()` call** including the trailing newline character. On POSIX systems, writes smaller than `PIPE_BUF` (4096 bytes) are atomic, preventing interleaved partial lines from concurrent writers.

---

## Deduplication Rule

When both `source: "agent"` and `source: "score"` entries exist for the same `(round_id, competitor)` pair, downstream tools **must prefer the `source: "score"` entry**. Agent entries are supplementary and are used only when no score entry exists yet for that pair.

If two `source="score"` entries exist for the same `(round_id, competitor)` pair, the entry with the later `timestamp` takes precedence.

---

## Field Reference

| Field                  | Type   | Required                      | Constraints                                                | Description                                                                                                                                                                                                              |
| ---------------------- | ------ | ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema_version`       | int    | Yes                           | Currently `1`                                              | Schema version number. Increment only on breaking changes.                                                                                                                                                               |
| `round_id`             | string | Yes                           | Non-empty string                                           | Round identifier (e.g., `"D01"`, `"D02"`).                                                                                                                                                                               |
| `competitor`           | string | Yes                           | Non-empty string                                           | Competitor name (e.g., `"maproom"`, `"explore"`).                                                                                                                                                                        |
| `timestamp`            | string | Yes                           | ISO 8601 with trailing `Z`                                 | Auto-generated UTC timestamp (e.g., `"2026-03-28T14:00:00Z"`).                                                                                                                                                           |
| `source`               | string | Yes                           | Enum: `"agent"` \| `"score"`                               | Which hook produced this entry. `"score"` entries are authoritative; `"agent"` entries are supplementary.                                                                                                                |
| `session_id`           | string | Yes                           | Non-empty string                                           | Session identifier from the harness. For Claude Code, this is the session identifier from the hook input. For Aider and other harnesses without native session IDs, use a generated UUID at harness invocation time.     |
| `competition_type`     | string | Yes                           | Value: `"bug-fix"`                                         | Competition type identifier. Currently only `"bug-fix"` is defined; future competition types (e.g., `"refactor"`, `"feature"`) would use distinct values.                                                                |
| `issue_url`            | string | Yes                           | Valid GitHub issue URL                                     | URL of the GitHub issue describing the bug (e.g., `"https://github.com/django/django/issues/34567"`).                                                                                                                    |
| `failing_test`         | string | Yes                           | Non-empty string                                           | Test identifier that must pass for the fix to be correct (e.g., `"tests.test_utils.test_parse_header_empty"`). When multiple tests are required, they are joined with `;` as a delimiter.                                |
| `pinned_commit`        | string | Yes                           | 40-character hex SHA                                       | Git commit SHA at which the bug is reproducible. The competitor's patch is applied to this commit.                                                                                                                       |
| `codebase`             | string | Yes                           | Must match a known codebase identifier                     | Target codebase (e.g., `"django"`, `"fastapi"`, `"mattermost-webapp"`). Same semantics as `codebase` in `rounds.jsonl`.                                                                                                  |
| `correctness`          | int    | Required for `source="score"` | `0` or `1`                                                 | Binary correctness result. `1` = all named failing tests pass and no regressions; `0` = otherwise. Stored as int (not bool) for consistency with integer scoring fields. `null` for agent-only entries.                  |
| `test_suite_passed`    | bool   | Required for `source="score"` | `true` or `false`                                          | Whether the full test suite passed after applying the patch. `null` for agent-only entries.                                                                                                                              |
| `tests_total`          | int    | Optional                      | >= 0                                                       | Total number of tests in the test suite run. May be absent if the harness does not report test counts.                                                                                                                   |
| `tests_passed`         | int    | Optional                      | >= 0                                                       | Number of tests that passed. May be absent if the harness does not report test counts.                                                                                                                                   |
| `process_quality`      | int    | Required for `source="score"` | 1-5                                                        | Judged process quality score. How systematic and hypothesis-driven was the diagnostic process? See `specs/competition-types/bug-fix.md` for the anchored rubric. `null` for agent-only entries.                          |
| `patch_quality`        | int    | Required for `source="score"` | 1-5                                                        | Judged patch quality score. How clean, minimal, and idiomatic is the patch? See `specs/competition-types/bug-fix.md` for the anchored rubric. `null` for agent-only entries.                                             |
| `calls`                | int    | Yes                           | >= 0                                                       | Raw tool call count. Same semantics as `calls` in `rounds.jsonl`.                                                                                                                                                        |
| `time_s`               | float  | Yes                           | >= 0.0                                                     | Raw wall-clock time in seconds. Same semantics as `time_s` in `rounds.jsonl`.                                                                                                                                            |
| `tokens`               | int    | Optional                      | >= 0                                                       | Total input + output tokens consumed. May be absent if the harness does not report token counts.                                                                                                                         |
| `cost_usd`             | float  | Optional                      | >= 0.0                                                     | Total API cost in USD. Prefer actual billing over estimation. May be absent if cost data is unavailable.                                                                                                                 |
| `harness_type`         | string | Yes                           | Non-empty string                                           | Identifier for the agent harness used (e.g., `"claude-code"`, `"aider"`, `"codex-cli"`).                                                                                                                                 |
| `harness_version`      | string | Yes                           | Non-empty string                                           | Version of the harness (e.g., `"1.0.23"`, `"0.75.1"`).                                                                                                                                                                   |
| `process_log_fidelity` | string | Yes                           | Enum: `"structured"` \| `"semi-structured"` \| `"minimal"` | Fidelity level of the process log captured for this competitor's run. Determines how the judge evaluates process quality. See `specs/competition-types/bug-fix.md` for fidelity level definitions and degradation rules. |
| `budget_exceeded`      | bool   | Optional                      | `true` or `false`                                          | Whether the competitor exceeded its time or tool-call budget. When `true`, the harness captured partial state at timeout. Absent when the competitor completed within budget.                                            |
| `round_winner`         | string | Optional                      | Competitor name or `null`                                  | Winner of the round as determined by the judge. `null` for agent-only entries.                                                                                                                                           |
| `judge_notes`          | string | Optional                      | Free text or `null`                                        | Judge's commentary on the comparative evaluation.                                                                                                                                                                        |
| `difficulty_tier`      | string | Optional                      | Enum: `"localized"` \| `"cross-cutting"` \| `"subtle"`     | Difficulty classification of the bug-fix task. See `specs/competition-types/bug-fix.md` for tier definitions.                                                                                                            |

> **Note:** The composite score is computed per the formula in `specs/competition-types/bug-fix.md` and is not stored directly in JSONL. It is a derived value calculated by downstream tools.

---

## Nullable / Optional Rules Summary

| Condition                               | Nullable Fields                                                                        | Absent Fields                               |
| --------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| `source = "agent"`                      | `correctness`, `process_quality`, `patch_quality`, `test_suite_passed`, `round_winner` | --                                          |
| `source = "score"`                      | None of the score fields                                                               | --                                          |
| Budget not exceeded                     | --                                                                                     | `budget_exceeded` may be absent             |
| Budget exceeded                         | --                                                                                     | `budget_exceeded` is `true`                 |
| Harness reports token/cost data         | --                                                                                     | --                                          |
| Harness does NOT report token/cost data | --                                                                                     | `tokens`, `cost_usd` may be absent          |
| Harness reports test counts             | --                                                                                     | --                                          |
| Harness does NOT report test counts     | --                                                                                     | `tests_total`, `tests_passed` may be absent |
| Difficulty tier assigned                | --                                                                                     | --                                          |
| Difficulty tier not yet assigned        | --                                                                                     | `difficulty_tier` may be absent             |

---

## Annotated JSONL Examples

### Example 1: Successful Fix (source="score")

All score fields populated. The competitor correctly diagnosed and fixed the bug. Harness is Claude Code with structured process logs.

```json
{
  "schema_version": 1,
  "round_id": "D01",
  "competitor": "maproom",
  "timestamp": "2026-03-28T14:00:00Z",
  "source": "score",
  "session_id": "sess_abc123",
  "competition_type": "bug-fix",
  "issue_url": "https://github.com/django/django/issues/34567",
  "failing_test": "tests.test_utils.test_parse_header_empty",
  "pinned_commit": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "codebase": "django",
  "correctness": 1,
  "test_suite_passed": true,
  "tests_total": 1247,
  "tests_passed": 1247,
  "process_quality": 4,
  "patch_quality": 5,
  "calls": 34,
  "time_s": 187.3,
  "tokens": 48200,
  "cost_usd": 0.72,
  "harness_type": "claude-code",
  "harness_version": "1.0.23",
  "process_log_fidelity": "structured",
  "round_winner": "maproom",
  "judge_notes": "Maproom formed a clear hypothesis about the missing guard clause and verified with targeted tests before and after the fix.",
  "difficulty_tier": "localized"
}
```

**Notes:**

- `correctness` is `1` (int, not bool) -- the failing test now passes and no regressions occurred
- `test_suite_passed` is `true` -- all 1247 tests passed after applying the patch
- `process_quality` is `4` (strong diagnostic process) and `patch_quality` is `5` (exemplary patch)
- `process_log_fidelity` is `"structured"` -- full JSON event stream available for judge evaluation
- `harness_type` is `"claude-code"` -- identifies the agent framework used
- `competition_type` is `"bug-fix"` -- distinguishes this from search-competition entries
- `calls` and `time_s` are raw values, consistent with their semantics in `rounds.jsonl`

### Example 2: Failed Fix (source="score")

The competitor attempted a fix but the failing test still fails. Process and patch quality are still scored -- the judge evaluates diagnostic effort and patch quality even on failed fixes.

```json
{
  "schema_version": 1,
  "round_id": "D01",
  "competitor": "explore",
  "timestamp": "2026-03-28T14:05:00Z",
  "source": "score",
  "session_id": "sess_def456",
  "competition_type": "bug-fix",
  "issue_url": "https://github.com/django/django/issues/34567",
  "failing_test": "tests.test_utils.test_parse_header_empty",
  "pinned_commit": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "codebase": "django",
  "correctness": 0,
  "test_suite_passed": false,
  "tests_total": 1247,
  "tests_passed": 1243,
  "process_quality": 3,
  "patch_quality": 2,
  "calls": 58,
  "time_s": 412.6,
  "tokens": 91500,
  "cost_usd": 1.38,
  "harness_type": "aider",
  "harness_version": "0.75.1",
  "process_log_fidelity": "semi-structured",
  "round_winner": "maproom",
  "judge_notes": "Explore found the right file but misidentified the root cause, applying a workaround that suppressed the error without fixing the underlying issue.",
  "difficulty_tier": "localized"
}
```

**Notes:**

- `correctness` is `0` -- the failing test still fails and 4 previously passing tests regressed
- `test_suite_passed` is `false` -- 1243 of 1247 tests passed (4 regressions)
- `process_quality` is `3` and `patch_quality` is `2` -- even failed fixes receive judged scores for diagnostic effort and patch quality
- `process_log_fidelity` is `"semi-structured"` -- text log with parseable action markers (Aider with `--llm-history-file`)
- `harness_type` is `"aider"` -- different harness from Example 1
- `round_winner` is `"maproom"` -- the same `round_winner` value appears on all entries for this round

### Example 3: Agent-Only Entry (source="agent")

Submitted by the harness before judging. Judged score fields are `null`; efficiency fields are populated.

```json
{
  "schema_version": 1,
  "round_id": "D02",
  "competitor": "maproom",
  "timestamp": "2026-03-29T09:30:00Z",
  "source": "agent",
  "session_id": "sess_ghi789",
  "competition_type": "bug-fix",
  "issue_url": "https://github.com/fastapi/fastapi/issues/12345",
  "failing_test": "tests.test_routing.test_path_param_validation",
  "pinned_commit": "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5",
  "codebase": "fastapi",
  "correctness": null,
  "test_suite_passed": null,
  "process_quality": null,
  "patch_quality": null,
  "calls": 27,
  "time_s": 143.8,
  "tokens": 35600,
  "cost_usd": 0.53,
  "harness_type": "claude-code",
  "harness_version": "1.0.23",
  "process_log_fidelity": "structured",
  "round_winner": null,
  "judge_notes": null
}
```

**Notes:**

- `source` is `"agent"` -- this entry was written by the harness hook, not the scoring pipeline
- `correctness`, `test_suite_passed`, `process_quality`, and `patch_quality` are all `null` -- judged/verified scores are not yet available
- `round_winner` and `judge_notes` are `null` -- judging has not occurred
- `calls`, `time_s`, `tokens`, and `cost_usd` are populated -- the harness records efficiency metrics regardless of source
- `difficulty_tier` is absent -- not yet assigned for this round
- `budget_exceeded` is absent -- the competitor completed within budget
- When the score entry for `(D02, maproom)` is written, the deduplication rule means it will take precedence over this agent entry
