# Bug-Fix Tasks: clap

This file defines 5 bug-fix tasks for the clap codebase. Each task corresponds to a
closed GitHub issue with a linked fix PR that includes test changes (fail-to-pass pattern).

All tasks have been verified using the SWE-bench fail-to-pass methodology: the test
changes from the fix PR are applied at the pre-fix commit, confirmed to FAIL (demonstrating
the bug), then the full fix PR is applied, confirmed to PASS. Each task's **Pre-Fix Commit**
and **Verification** fields are required by this methodology — the pre-fix commit pins a
known-buggy state so the failing test is reproducible, and the verification command confirms
that an agent's fix causes the test to pass.

**Areas covered:** Parser (A-parsing), Help display (A-help), Shell completion engine (A-completion)
**Difficulty mix:** 2 easy, 3 medium

---

> **Operator Note — Shallow Submodule Limitation**
>
> The `codebases/clap/` submodule is configured as a shallow clone (`shallow = true` in `.gitmodules`).
> Only the competition pinned commit (9ab6dee / v4.6.0) is present in the shallow clone.
> DISC-04 fail-to-pass verification requires checking out each task's **Pre-Fix Commit**,
> which is between 35 and 553 commits before the pinned commit. These earlier commits
> are **not available** in the shallow clone, so `git checkout <pre-fix-commit>` will fail.
>
> **Option 1 — Unshallow the existing submodule:**
>
> ```bash
> git -C codebases/clap fetch --unshallow
> ```
>
> **Option 2 — Clone the full repository separately:**
>
> ```bash
> git clone https://github.com/clap-rs/clap.git /tmp/clap-full
> git -C /tmp/clap-full checkout <pre-fix-commit>
> ```
>
> The `deliverables/fail-to-pass-verification-report.md` used Option 2 (via `/tmp/clap-replace`).

---

> **Build Requirements — Non-Default Feature Flags**
>
> Some tasks in this file require Cargo feature flags that are **not enabled by default**.
> DISC-04 operators must pass these flags explicitly or the verification command will
> fail to exercise the correct code path (tests may silently pass with 0 tests run).
>
> | Task           | Feature Flag       | Cargo Invocation                                                                                                                 | Reason                                                                                                                                                                                                                                              |
> | -------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | clap-bug-fix-2 | `unstable-dynamic` | `cargo test -p clap_complete --features unstable-dynamic --test testsuite -- engine::suggest_subcommand_positional_after_escape` | The dynamic completion engine (`clap_complete/src/engine/`) is gated behind the `unstable-dynamic` feature. Without this flag, the `engine` test module is not compiled and the test filter matches zero tests, producing a misleading exit code 0. |
>
> Always check each task's **Verification** command for `--features` flags before running.

---

## clap-bug-fix-1

**Codebase:** clap
**Category:** bug-fix
**Difficulty:** easy
**GitHub Issue:** #5867 - Default value not filled in on ignored error
**Fix PR:** #5873
**Affected Crate:** clap_builder
**Competition Pinned Commit:** 9ab6dee710aa384e02ec5e9e2cfeadb2f35abf2a (v4.6.0 tagged release; the competition baseline)
**Pre-Fix Commit:** 1d5c6798dc16db0b8130a0c73c8a5d818ec22131
**Pre-Fix Commit Note:** Predates the tagged release by 553 commits. This is the state of the main branch immediately before the fix PR was merged. The bug is reproducible at this commit (default values are overwritten when `ignore_errors` is set and a "did you mean" suggestion is triggered). Agents work on the competition pinned commit for the codebase context, but fail-to-pass verification runs at this pre-fix commit.
**Description:** When `ignore_errors(true)` is set on a command and an unknown argument triggers a "did you mean?" suggestion, the parser incorrectly calls `start_custom_arg` which sets the suggested argument's source to `CommandLine` instead of preserving `DefaultValue`. This means default values are overwritten even though the error is being ignored.
**Verification:** `cargo test --test builder -- ignore_errors::did_you_mean`
**Agent Instructions:** When a command has `ignore_errors(true)` and a user provides an unknown argument like `--ig` that triggers a "did you mean `--ignore-immutable`?" suggestion, the parser incorrectly fills in the suggested argument as if it were provided on the command line. After ignoring the error, the argument's value source should be `DefaultValue`, but it reports `CommandLine`. Fix the parser in `clap_builder/src/parser/parser.rs` to skip the `start_custom_arg` call in the "did you mean" handling when `ignore_errors` is set, so that the argument retains its default value and source.

---

## clap-bug-fix-2

**Codebase:** clap
**Category:** bug-fix
**Difficulty:** medium
**GitHub Issue:** #6130 - Completion keeps suggesting options (long/short) after an escape (`--`)
**Fix PR:** #6131
**Affected Crate:** clap_complete
**Competition Pinned Commit:** 9ab6dee710aa384e02ec5e9e2cfeadb2f35abf2a (v4.6.0 tagged release; the competition baseline)
**Pre-Fix Commit:** 281f8aec7ce468d677ae24bf5bc17d41e9c7cbcb
**Pre-Fix Commit Note:** Predates the tagged release by 240 commits. This is the state of the main branch immediately before the fix PR was merged. The bug is reproducible at this commit (options are suggested after `--` in completions). Agents work on the competition pinned commit for the codebase context, but fail-to-pass verification runs at this pre-fix commit.
**Description:** The dynamic completion engine continues to suggest options (like `--help`, `--delimiter`, etc.) after a `--` escape sequence. After `--`, only positional argument values should be suggested, not options. The `complete_arg` function does not track whether the parser has seen `--` and unconditionally calls `complete_option`.
**Verification:** `cargo test -p clap_complete --features unstable-dynamic --test testsuite -- engine::suggest_subcommand_positional_after_escape`
**Agent Instructions:** The dynamic completion engine in `clap_complete/src/engine/complete.rs` suggests options (e.g., `--help`) even after the user has typed `--` (the escape sequence that signals "no more options"). Fix the `complete_arg` function to accept an `is_escaped` parameter and skip calling `complete_option` when the parser is in escaped mode. The `is_escaped` state is already tracked in the `complete()` function's main loop; it needs to be passed through to `complete_arg`.

---

## clap-bug-fix-3

**Codebase:** clap
**Category:** bug-fix
**Difficulty:** easy
**GitHub Issue:** #5860 - `ArgMatches::args_present` behaviour with `ArgAction::SetTrue`
**Fix PR:** #5908
**Affected Crate:** clap_builder
**Competition Pinned Commit:** 9ab6dee710aa384e02ec5e9e2cfeadb2f35abf2a (v4.6.0 tagged release; the competition baseline)
**Pre-Fix Commit:** 190a3f225a851f7ee780abf7e0969b924443a8f4
**Pre-Fix Commit Note:** Predates the tagged release by 501 commits. This is the state of the main branch immediately before the fix PR was merged. The bug is reproducible at this commit (`args_present()` returns true even when no args are provided). Agents work on the competition pinned commit for the codebase context, but fail-to-pass verification runs at this pre-fix commit.
**Description:** `ArgMatches::args_present()` returns `true` even when no arguments are provided on the command line, because `SetTrue` action arguments are always added to the internal args map with a default value. The method checks `!self.args.is_empty()` which is true whenever any `SetTrue` arg is defined, regardless of whether the user actually provided it.
**Verification:** `cargo test --test builder -- arg_matches::args_present_flag`
**Agent Instructions:** `ArgMatches::args_present()` incorrectly returns `true` when a command has `SetTrue` flag arguments even if no arguments were provided by the user. The current implementation simply checks `!self.args.is_empty()`, but `SetTrue` arguments are always inserted into the map with their default value. Fix the `args_present()` method in `clap_builder/src/parser/matches/arg_matches.rs` to check whether any argument has an explicit value source (i.e., was actually provided by the user) rather than just checking if the args map is non-empty. You will need to add a `values()` method to the `FlatMap` utility in `clap_builder/src/util/flat_map.rs` to iterate over values.

---

## clap-bug-fix-4

**Codebase:** clap
**Category:** bug-fix
**Difficulty:** medium
**GitHub Issue:** #6164 - Arg: `action(ArgAction::Count)` conflicts with `help_header` and other oddities causing panics and alarming memory usage
**Fix PR:** #6165
**Affected Crate:** clap_builder
**Competition Pinned Commit:** 9ab6dee710aa384e02ec5e9e2cfeadb2f35abf2a (v4.6.0 tagged release; the competition baseline)
**Pre-Fix Commit:** df7bdfc4996ba2f4388e2c01a6ab4cbe26b2e4df
**Pre-Fix Commit Note:** Predates the tagged release by 186 commits. This is the state of the main branch immediately before the fix PR was merged. The bug is reproducible at this commit (incorrect help alignment for short-only arguments). Agents work on the competition pinned commit for the codebase context, but fail-to-pass verification runs at this pre-fix commit.
**Description:** The help template incorrectly calculates the alignment padding for arguments that have only a short flag (no long flag). The `longest_filter` function excludes short-only non-value-taking args from the width calculation, and when computing the actual width for args that pass the filter, it unconditionally adds `SHORT_SIZE` padding as if a short flag prefix is always present. This results in extra whitespace in help output when short-only args are mixed with long args.
**Verification:** `cargo test --test builder -- multiple_values::optional_value`
**Agent Instructions:** The help output has incorrect alignment when a command has arguments with only short flags (no long flags). For example, `-p [<NUM>]` gets extra padding compared to `-h, --help`. The issue is in `clap_builder/src/output/help_template.rs` in the width calculation logic. The `longest_filter` function incorrectly excludes some args from the calculation, and the width computation adds `SHORT_SIZE` unconditionally based on `is_positional()` instead of checking `get_long().is_some()`. Remove the `longest_filter` function entirely and fix the width calculation to add `SHORT_SIZE` only when the argument has a long flag (since that implies a `--long, ` prefix is present), not merely when it is not positional.

---

## clap-bug-fix-5

**Codebase:** clap
**Category:** bug-fix
**Difficulty:** medium
**GitHub Issue:** #6275 - Shared global args with `ignore_errors = true` with `#[command(flatten)]` and subcommands breaks `--help`
**Fix PR:** #6276
**Affected Crate:** clap_builder
**Competition Pinned Commit:** 9ab6dee710aa384e02ec5e9e2cfeadb2f35abf2a (v4.6.0 tagged release; the competition baseline)
**Pre-Fix Commit:** d201a490f2f46013166d53d950a4d0e2ecbcaad9
**Pre-Fix Commit Note:** Predates the tagged release by 35 commits. This is the state of the main branch immediately before the fix PR was merged. The bug is reproducible at this commit (`--help` in a subcommand is silently swallowed when `ignore_errors` is set). Agents work on the competition pinned commit for the codebase context, but fail-to-pass verification runs at this pre-fix commit.
**Description:** When a command has `ignore_errors(true)` set and a subcommand is invoked with `--help`, the help output is not displayed. The parser's subcommand error handling checks `partial_parsing_enabled` and ignores ALL errors from subcommand parsing, including the special "display help" error (which is not a real error but a signal to print help and exit). This means `--help` is silently swallowed in subcommands.
**Verification:** `cargo test --test builder -- ignore_errors::help_flag_subcommand`
**Agent Instructions:** When `ignore_errors(true)` is set on a parent command, passing `--help` to a subcommand does not display help output. The parser silently ignores the help "error" (which is actually a display request, not a real error). Fix the subcommand error handling in `clap_builder/src/parser/parser.rs` in the `parse_subcommand` method. The condition that suppresses errors when `partial_parsing_enabled` is true should also check `error.use_stderr()` -- only suppress errors that would go to stderr (actual errors), not errors that go to stdout (like help and version display).
