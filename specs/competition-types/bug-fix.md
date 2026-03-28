# Bug-Fix Competition Specification

## Overview

**Competition type ID:** `"bug-fix"`

The bug-fix competition measures an agent's ability to diagnose a reported defect in a real-world codebase and produce a correct, high-quality patch. It extends Arena's evaluation surface beyond code search (locating information) into code modification (resolving problems).

Where the search competition asks "Can the agent find and explain?", the bug-fix competition asks "Can the agent find, understand, and fix?" The two competition types share codebases, efficiency instrumentation, and the comparative judging framework, but differ in query format, scoring dimensions, and verification protocol.

---

## Query Format

### Task Structure

Each bug-fix task provides the competitor with:

| Artifact              | Description                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Issue description** | A natural-language bug report: observed behavior, expected behavior, and reproduction context.                                                        |
| **Failing test(s)**   | One or more named test functions that fail on the pinned commit and that a correct fix must make pass. Follows the SWE-bench fail-to-pass convention. |
| **Pinned commit**     | The exact commit SHA in the target codebase at which the bug is reproducible.                                                                         |
| **Codebase**          | The repository (from `codebases/`) in which the fix must be applied.                                                                                  |

### What Competitors Must Discover

Competitors are NOT given the location of the bug. They must:

1. Locate the relevant source files and functions.
2. Understand the root cause.
3. Produce a patch (unified diff) that resolves the defect.
4. Verify that the named failing test(s) now pass.

### Difficulty Tiers

Each bug-fix task is classified into one of three difficulty tiers, analogous to the search competition's breadth/depth/constrained tiers.

| Tier            | Label         | Description                                                                                                                                                                                                                        | Expected Divergence                                                                             |
| --------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `localized`     | Localized     | Bug is confined to a single function or file. A correct diagnosis points directly at the fix location. Analogous to search's breadth tier.                                                                                         | Gray -- scores tend to converge since the bug is straightforward to locate and fix.             |
| `cross-cutting` | Cross-Cutting | Bug involves interactions across multiple files, modules, or layers. Diagnosis requires tracing data flow or control flow across boundaries. Analogous to search's depth tier.                                                     | Yellow/Signal -- scores diverge as competitors differ in diagnostic and patching quality.       |
| `subtle`        | Subtle        | Bug involves race conditions, edge cases, implicit invariants, or behavior that only manifests under specific conditions. The root cause is non-obvious even once the right code is found. Analogous to search's constrained tier. | Variable -- tests strategy and depth of understanding; divergence depends on reasoning quality. |

The `difficulty_tier` field on the round result uses these tier identifiers.

---

## Scoring Dimensions

Bug-fix rounds are scored on **4 dimensions**: 1 binary correctness check, 2 judged comparatively (1-5 scale), and 1 set of measured efficiency metrics reported as raw values.

### Correctness (Binary)

**What it measures:** Did the patch make the failing test(s) pass without breaking previously passing tests?

**Value:** 0 or 1.

#### Automated Verification Protocol

1. Apply the competitor's patch to the codebase at the pinned commit.
2. Run the full test suite (or the designated test subset if a full run exceeds 10 minutes).
3. Check the named failing test(s):
   - If ALL named failing tests now pass AND no previously-passing tests regress: **correctness = 1**.
   - Otherwise: **correctness = 0**.

#### Partial Test Suite Behavior

When the task specifies multiple failing tests, ALL must pass for correctness = 1. There is no partial credit. This follows the SWE-bench fail-to-pass convention: the set of named tests is the minimum acceptance criterion.

#### Timeout Scoring Behavior

If a competitor exceeds its time or tool-call budget:

- Apply whatever diff the competitor has produced at the point of timeout.
- Run the verification protocol as normal.
- Record `budget_exceeded: true` on the round result.
- Correctness is **NOT** automatically 0. If the partial patch happens to fix the bug, the competitor receives correctness = 1.

### Process Quality (Judged 1-5)

**What it measures:** How systematic, hypothesis-driven, and well-reasoned was the agent's diagnostic and fixing process?

| Score | Description                                                                                                                                                                                                                                           | Example                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | No discernible diagnostic strategy. Agent applied random or shotgun changes with no evidence of understanding the bug.                                                                                                                                | **Aider-style (text log):** Agent opens 15 unrelated files, makes 4 contradictory edits in succession, undoes all of them, then applies a copy-pasted StackOverflow snippet to the wrong file. **Claude Code-style (structured events):** Event stream shows `tool_call: edit` on 6 different files within 30 seconds, no `tool_call: search` or `tool_call: read` preceding them; each edit is overwritten by the next with no test runs between edits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2     | Weak diagnostic process. Agent found the general area but did not form or test hypotheses. Fix arrived by trial-and-error with some directional signal.                                                                                               | **Aider-style (text log):** Agent greps for the error message, opens the correct file, but then makes 3 successive edits without reading the surrounding code or running tests, finally stumbling onto a change that suppresses the error. **Claude Code-style (structured events):** Event stream shows `tool_call: grep` for the error string, then `tool_call: edit` repeated 3 times on the same function with different values; no `tool_call: bash(test)` events until the final attempt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 3     | Adequate diagnostic process. Agent located the bug area, showed some understanding of the cause, and iterated toward a fix with partial validation.                                                                                                   | **Aider-style (text log):** Agent searches for the error, reads the relevant function, states "this looks like an off-by-one in the loop bound," edits the bound, runs the failing test (it passes), but does not run the broader test suite to check for regressions. **Claude Code-style (structured events):** Event stream shows `tool_call: grep` -> `tool_call: read` -> reasoning event mentioning "off-by-one" -> `tool_call: edit` -> `tool_call: bash(pytest test_specific.py)` with pass result. No broader test run.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 4     | Strong diagnostic process. Agent formed a clear hypothesis about the root cause, validated it with targeted investigation, and confirmed the fix with appropriate testing.                                                                            | **Aider-style (text log):** Agent reads the issue, searches for the failing function, reads callers and callees, states "the bug is that `parse_header` does not handle empty strings — the guard clause was removed in commit abc123," edits the function to restore the guard, runs the failing test (passes), then runs the full test file. **Claude Code-style (structured events):** Event stream shows `tool_call: read(issue)` -> `tool_call: grep("parse_header")` -> `tool_call: read` on 3 related files -> reasoning event with root-cause hypothesis -> `tool_call: edit` (single targeted change) -> `tool_call: bash(pytest test_parser.py)` pass -> `tool_call: bash(pytest tests/)` pass.                                                                                                                                                                                                                                                        |
| 5     | Expert diagnostic process. Agent demonstrated deep understanding of the codebase, formed and tested a precise hypothesis, considered edge cases, and verified the fix thoroughly. The process log reads like a skilled developer's debugging session. | **Aider-style (text log):** Agent reads the issue, identifies two possible root causes, investigates both with targeted reads, rules out the first with evidence ("this path is guarded by the type check on line 142"), confirms the second by tracing the call chain through 3 modules, applies a minimal fix, runs the failing test, runs the full suite, and notes "the fix also addresses the related edge case where input is None." **Claude Code-style (structured events):** Event stream shows systematic investigation: `tool_call: read` on issue -> `tool_call: grep` for two candidate patterns -> `tool_call: read` on 4 files with reasoning events after each explaining what was learned -> reasoning event ruling out hypothesis A with evidence -> `tool_call: edit` (single precise change) -> `tool_call: bash(pytest -x test_specific.py)` pass -> `tool_call: bash(pytest tests/ -x)` pass -> reasoning event noting edge case coverage. |

#### Process Log Fidelity Handling

When a competitor's process log has lower fidelity (see [Process Log Comparability](#process-log-comparability)), the judge evaluates process quality based on whatever evidence is available. Competitors with minimal/diff-only logs receive a degraded maximum score (see degradation rules below). The judge MUST NOT infer diagnostic quality that is not evidenced in the log.

### Patch Quality (Judged 1-5)

**What it measures:** How clean, minimal, idiomatic, and safe is the patch itself?

| Score | Description                                                                                                                                                   | Example                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Patch is bloated, introduces new problems, or is clearly wrong despite passing the specific test. Violates codebase conventions.                              | **Diff minimality:** Patch adds a 40-line workaround wrapping the entire function in a try/except that silences all exceptions, when the fix required changing one conditional. **Regression safety:** Patch modifies the test assertion to match the buggy behavior instead of fixing the source code, masking the real defect for all other callers.                                                                                                                                                                            |
| 2     | Patch fixes the immediate symptom but is sloppy. Includes unnecessary changes, does not match codebase style, or has weak regression safety.                  | **Code idiomaticity:** Patch fixes the off-by-one but also reformats 20 surrounding lines, renames a local variable for no reason, and adds a comment with a typo. A reviewer would request significant cleanup. **Regression safety:** Patch adds a special-case `if` branch for the failing input but does not handle the equivalent case for Unicode strings, leaving a known variant of the bug unfixed.                                                                                                                      |
| 3     | Patch is functional and reasonably scoped. Minor style deviations or a slightly broader change than necessary, but no concerning issues.                      | **Diff minimality:** Patch correctly adds the missing null check but also moves an unrelated import to a different line, producing a 2-file diff when a 1-file diff would suffice. **Code idiomaticity:** Patch uses `if x == None` instead of the project's convention of `if x is None`. Functionally correct but stylistically inconsistent.                                                                                                                                                                                   |
| 4     | Patch is clean, well-scoped, and follows codebase conventions. Minimal diff with no unnecessary changes. Handles the obvious edge cases.                      | **Diff minimality:** Patch adds the null check using the same guard pattern found elsewhere in the file and touches only the lines necessary. Diff is 5 lines. **Regression safety:** Patch adds a corresponding test assertion for the edge case that triggered the bug, ensuring the fix is protected against future regressions.                                                                                                                                                                                               |
| 5     | Patch is exemplary. Minimal, idiomatic, handles edge cases, and could be merged as-is. Demonstrates understanding of the codebase's patterns and conventions. | **Code idiomaticity:** Patch adds the null check using the project's existing `ensure_not_none()` utility, follows the module's established error-handling pattern, and updates the relevant docstring. Diff is 8 lines, all purposeful. **Regression safety:** Patch adds a regression test following the existing test naming convention (`test_parse_header_empty_string`) and includes both the original failing case and two related edge cases (None, whitespace-only). A senior maintainer would approve without comments. |

### Efficiency (Measured)

These dimensions are recorded as raw values, not judged on a scale. They are reported alongside the scored dimensions but do NOT contribute to the composite score.

| Metric     | Unit    | Description                                                               |
| ---------- | ------- | ------------------------------------------------------------------------- |
| Tool calls | Count   | Total number of tool invocations during the round.                        |
| Wall time  | Seconds | Wall-clock seconds from round start to completion (or timeout).           |
| Tokens     | Count   | Total input + output tokens consumed.                                     |
| Cost       | USD     | Total API cost. Prefer actual billing (`total_cost_usd`) over estimation. |

**Rationale for raw reporting (consistent with search):** Different agent harnesses have fundamentally different tool-call patterns and token profiles. Banding or scoring efficiency would require paradigm-relative thresholds that add complexity without adding insight. Raw values let downstream analysis apply whatever normalization is appropriate.

---

## Composite Scoring

### Formula

```
composite = W_c * correctness + W_p * process_quality + W_q * patch_quality
```

Where:

| Weight | Value | Max Contribution               | Rationale                                                                                                                                                                                    |
| ------ | ----- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W_c    | 21.0  | 21.0 (correctness is 0 or 1)   | Correctness dominates. A wrong fix is fundamentally worse than a right fix done clumsily. Weight must exceed the max failed composite (W_p*5 + W_q*5 = 20.0) to enforce the gating property. |
| W_p    | 2.0   | 10.0 (process_quality max = 5) | Process quality matters but is secondary to actually fixing the bug.                                                                                                                         |
| W_q    | 2.0   | 10.0 (patch_quality max = 5)   | Patch quality matters but is secondary to actually fixing the bug.                                                                                                                           |

**Max composite:** 21.0 + 10.0 + 10.0 = **41.0**

### Correctness Gating Behavior

The weights guarantee that a failed fix (correctness = 0) can NEVER achieve a higher composite than a successful fix (correctness = 1) with mediocre process and patch quality.

**Verification:**

- Best possible failed fix: `0 + 2.0*5 + 2.0*5 = 20.0`
- Worst possible successful fix: `21.0 + 2.0*1 + 2.0*1 = 25.0`
- 25.0 > 20.0. The gate holds: any successful fix outscores any failed fix.

**W_c represents 51.2% of max composite** (21.0 / 41.0), satisfying the requirement that W_c >= 40% of max composite.

### Provisional Weight Rationale

All weights are marked **provisional for the discovery sprint**. They are designed to enforce the correctness-gating invariant while still rewarding process and patch quality. After the first calibration rounds:

- If correctness is too easy (most competitors fix most bugs), W_c may be reduced and process/patch weights increased to improve discrimination.
- If correctness is too hard (most competitors fail most bugs), the gating property ensures that any successful fix is still highly rewarded.
- The 2.0/2.0 split between process and patch quality assumes they are equally important. This may be adjusted based on judge calibration data.

### Efficiency as Reported-Alongside

Efficiency metrics (tool calls, wall time, tokens, cost) are reported alongside the composite score but are NOT included in the composite formula. This is consistent with the search competition's approach and avoids the complexity of paradigm-relative efficiency thresholds.

---

## Comparative Judging Protocol

Bug-fix rounds use the same comparative side-by-side evaluation framework as search rounds. A judge model evaluates all competitors' outputs for a given task simultaneously.

### Judge Input Artifacts

The judge receives the following artifacts in this fixed order:

1. **Issue description** -- the original bug report provided to all competitors.
2. **Process logs** -- one per competitor, labeled by competitor name and harness type (e.g., "Competitor A [Claude Code / structured]", "Competitor B [Aider / semi-structured]"). Presented according to fidelity-level rules (see below).
3. **Diffs** -- one per competitor, the unified diff of the patch applied.
4. **Test results** -- one per competitor, showing pass/fail status of the named failing tests and any regressions.

### Judge Prompt Template Outline

```
You are evaluating {N} competitors' attempts to fix a bug.

## Issue
{issue_description}

## Failing Test(s)
{test_names}

## Competitor Outputs

{for each competitor:}
### Competitor {label} [{harness_type} / {fidelity_level}]

#### Process Log
{process_log_content — presented per fidelity level rules}

#### Patch (unified diff)
{diff}

#### Test Results
- Named failing test(s): {pass|fail per test}
- Regression tests: {pass|fail summary}
- Correctness: {0|1}
- Budget exceeded: {true|false}

{end for}

## Scoring Instructions

For each competitor, provide:

1. **Process Quality (1-5):** How systematic and hypothesis-driven was the
   diagnostic process? Use the anchored rubric. If the process log is marked
   as "{fidelity_level}", apply the corresponding fidelity adjustment.

2. **Patch Quality (1-5):** How clean, minimal, and idiomatic is the patch?
   Use the anchored rubric.

Score each competitor independently against the rubric, then verify your
scores are consistent when compared side-by-side.
```

### Fidelity-Aware Evaluation

The judge prompt adapts process log presentation based on fidelity level:

- **Structured logs:** Presented in full (up to 2000 tokens). Events include typed tool calls, edits, and reasoning steps. The judge evaluates the complete diagnostic narrative.
- **Semi-structured (text) logs:** Summarized to approximately 500 words with action markers preserved (edit blocks, file references, test invocations). The judge evaluates based on discernible actions and stated reasoning. The summarization step is a DISC-03/DISC-04 implementation responsibility. The scoring pipeline or judge prompt builder performs this summarization before prompt construction.
- **Minimal / diff-only logs:** Noted as "process log unavailable -- scoring from diff only." The judge scores process quality based solely on what can be inferred from the diff and test results.

### Judge Model Disclosure

When the quality judge is the same model as a competitor, this MUST be disclosed as a methodological limitation in the results summary. Judge-model overlap may introduce scoring bias. This requirement is carried forward from the search competition's scoring rubric.

---

## Process Log Comparability

Different agent harnesses produce process logs at varying levels of detail. To ensure fair comparison, this specification defines three fidelity levels with explicit degradation rules.

### Fidelity Levels

| Level             | Label           | Description                                                                                                                                                            | Applies To                                                     |
| ----------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `structured`      | Structured      | Full JSON event stream with typed events: tool calls (with arguments and results), file edits, reasoning/thinking blocks, test executions. Each event has a timestamp. | Claude Code, Codex CLI                                         |
| `semi-structured` | Semi-Structured | Text log with parseable action markers: edit blocks with file paths, search commands, file references, test output. Actions are identifiable but not machine-typed.    | Aider with `--llm-history-file`, similar text-based harnesses  |
| `minimal`         | Minimal         | Only the final diff and test results are available. No intermediate process data.                                                                                      | Harnesses with no process logging, fallback when logging fails |

### Minimum Viable Process Log

For a log to qualify as `structured` or `semi-structured`, it MUST contain at minimum:

- Evidence of at least one file read or search action.
- Evidence of at least one edit action.
- Temporal ordering (events are in chronological sequence).

A log that contains only the final diff is classified as `minimal` regardless of its format.

A log that begins with structured JSON events but terminates abruptly (e.g., due to harness crash) is classified at the highest fidelity level for which it provides complete, parseable evidence. If fewer than the minimum viable process log requirements can be extracted, it degrades to `minimal`.

### Degradation Rules

| Fidelity Level    | Process Quality Max | Patch Quality Max | Rationale                                                                                                                                                                                                                                            |
| ----------------- | ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `structured`      | 5                   | 5                 | Full evidence available for both dimensions.                                                                                                                                                                                                         |
| `semi-structured` | 5                   | 5                 | Text logs can demonstrate systematic process; no cap needed. Action markers provide sufficient evidence.                                                                                                                                             |
| `minimal`         | 3                   | 5                 | Cannot assess diagnostic process beyond what is inferable from the diff. Process quality capped at 3 ("adequate") since systematic process may have occurred but is not evidenced. Patch quality remains uncapped since the diff is fully available. |

**Key principle:** The judge MUST NOT infer diagnostic quality that is not evidenced in the log. A competitor with a minimal log who produced an excellent patch may have had an excellent process -- but the judge cannot know this and must not assume it.

---

## Time and Tool Budgets

### Default Limits

| Budget     | Default        | Rationale                                                                                                                  |
| ---------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Tool calls | 120            | Bug-fix tasks require more exploration than search (reading, editing, testing). Higher than search's typical 60-80 budget. |
| Wall time  | 1800s (30 min) | Allows time for iterative diagnosis, patching, and test verification.                                                      |

### Per-Competitor Configuration

Budgets are configured per-competitor in `competitors.json` via the `performance_budget` object. The defaults above are starting points; individual competitors may have different budgets based on their paradigm's expected tool-call patterns.

```json
{
  "performance_budget": {
    "max_calls": 120,
    "max_time_s": 1800
  }
}
```

Budget limits are enforced by the harness. When a limit is reached, the harness captures the current state (partial diff, if any) and proceeds to verification. The round result records `budget_exceeded: true`.

---

## Known Limitations

### Discovery-Phase Constraints

This specification is written for the **discovery sprint** -- the first set of bug-fix rounds intended to validate the competition format. The following constraints apply:

1. **Limited codebase coverage.** Initial bug-fix tasks will target `clap-rs/clap` (a Rust CLI library selected by DISC-02). The competition format is designed to be codebase-agnostic; the django, fastapi, and mattermost-webapp codebases used by the search competition may be used in later bug-fix rounds. Bug-fix tasks require reproducible defects at pinned commits, which limits the available task pool.

2. **Test suite dependency.** The correctness verification protocol depends on the target codebase having a reliable, fast test suite. Codebases with flaky tests, slow test suites, or poor test coverage may not be suitable for bug-fix tasks.

3. **Synthetic vs. real bugs.** Initial tasks may use synthetically introduced bugs (reverting a known fix to a known commit) rather than naturally occurring defects. This trades ecological validity for reproducibility and answer-key availability.

4. **Process log standardization.** The three fidelity levels are a pragmatic starting point. As more harnesses are onboarded, additional fidelity levels or normalization strategies may be needed.

### Expected Friction Points

- **Environment setup:** Bug-fix tasks require the competitor's harness to support code editing and test execution, not just code reading. Some search-only harnesses will need adaptation.
- **Non-deterministic tests:** If a codebase's test suite has non-deterministic behavior, correctness verification may produce false negatives. The pipeline should support re-running verification with a configurable retry count.
- **Large diffs at timeout:** A competitor that times out mid-edit may produce a syntactically invalid diff. The verification protocol applies whatever diff exists; if it fails to apply cleanly, correctness = 0.
- **Judge calibration for process quality:** Process quality is harder to judge than search quality because it depends on understanding the diagnostic narrative. Initial calibration rounds should include human review of judge scores to establish reliability.
