# Bug-Fix Tasks: clap

This file defines 5 bug-fix tasks for the clap codebase. Each task corresponds to a
closed GitHub issue with a linked fix PR that includes test changes (fail-to-pass pattern).

**Areas covered:** Man pages (A-man), Help display (A-help), Parser, Shell completion (A-completion)
**Difficulty mix:** 2 easy, 3 medium

---

## clap-bug-fix-1

**Codebase:** clap
**Category:** bug-fix
**Difficulty:** easy
**GitHub Issue:** #3362 - `clap_mangen` should respect the configured display order for args and subcommands
**Fix PR:** #6142
**Affected Crate:** clap_mangen
**Competition Pinned Commit:** 9ab6dee710aa384e02ec5e9e2cfeadb2f35abf2a (v4.6.0 tagged release; the competition baseline)
**Pre-Fix Commit:** c7c761f988684ad97c8b2c521b05cf7f8192b3eb
**Pre-Fix Commit Note:** Predates the tagged release by 191 commits. This is the state of the main branch immediately before the fix PR was merged. The bug is reproducible at this commit (man page output ignores `display_order`). Agents work on the competition pinned commit for the codebase context, but fail-to-pass verification runs at this pre-fix commit.
**Description:** `clap_mangen` ignores the `display_order` setting when rendering man pages. Arguments and subcommands appear in insertion order rather than the configured display order, which is inconsistent with how `clap_builder` renders help output.
**Verification:** `cargo test -p clap_mangen -- configured_display_order_args configured_subcmd_order default_subcmd_order`
**Agent Instructions:** The `clap_mangen` crate does not respect the `display_order()` configuration when generating man pages. Arguments and subcommands are rendered in their insertion order instead of the order specified via `display_order()` on `Arg` and `Command`. Fix the man page rendering in `clap_mangen/src/render.rs` so that arguments in the synopsis and options sections, and subcommands in the subcommands section, are sorted by their configured display order before rendering. The existing `clap_builder` help output already handles this correctly and can serve as a reference for the sort key logic.

---

## clap-bug-fix-2

**Codebase:** clap
**Category:** bug-fix
**Difficulty:** easy
**GitHub Issue:** #6067 - Missing visible long flag aliases in help
**Fix PR:** #6068
**Affected Crate:** clap_builder
**Competition Pinned Commit:** 9ab6dee710aa384e02ec5e9e2cfeadb2f35abf2a (v4.6.0 tagged release; the competition baseline)
**Pre-Fix Commit:** 7f164521b29e547cef396608246f977edbe3b616
**Pre-Fix Commit Note:** Predates the tagged release by 302 commits. This is the state of the main branch immediately before the fix PR was merged. The bug is reproducible at this commit (long flag aliases are missing from help output). Agents work on the competition pinned commit for the codebase context, but fail-to-pass verification runs at this pre-fix commit.
**Description:** When a subcommand has visible long flag aliases set via `visible_long_flag_alias()` or `visible_long_flag_aliases()`, the help output does not display them in the `[aliases: ...]` section. Only visible short flag aliases and regular visible aliases are shown, while visible long flag aliases are silently omitted.
**Verification:** `cargo test -p clap_builder -- visible_aliases_with_short_help visible_aliases_with_long_help flag_subcommand_long_with_aliases_vis_and_hidden`
**Agent Instructions:** The help output for subcommands with visible long flag aliases is incomplete. When a subcommand has `visible_long_flag_alias()` or `visible_long_flag_aliases()` configured, those aliases do not appear in the `[aliases: ...]` annotation in help output. Fix the help template rendering in `clap_builder/src/output/help_template.rs` so that visible long flag aliases are collected alongside visible short flag aliases and regular visible aliases, and included in the aliases display. Look at how `get_visible_short_flag_aliases()` is already used and add the equivalent handling for `get_visible_long_flag_aliases()`.

---

## clap-bug-fix-3

**Codebase:** clap
**Category:** bug-fix
**Difficulty:** medium
**GitHub Issue:** #5040 - `value_terminator` has no effect when it is the first argument
**Fix PR:** #6212
**Affected Crate:** clap_builder
**Competition Pinned Commit:** 9ab6dee710aa384e02ec5e9e2cfeadb2f35abf2a (v4.6.0 tagged release; the competition baseline)
**Pre-Fix Commit:** b9009a76d1f2d62ba6af168bcef12ad7272626ca
**Pre-Fix Commit Note:** Predates the tagged release by 73 commits. This is the state of the main branch immediately before the fix PR was merged. The bug is reproducible at this commit (value_terminator is ignored as first arg). Agents work on the competition pinned commit for the codebase context, but fail-to-pass verification runs at this pre-fix commit.
**Description:** When `value_terminator` is set on a positional argument with `allow_hyphen_values(true)` and the terminator is passed as the very first argument (e.g., `program -- ls -l`), the parser treats the terminator as a regular value instead of terminating the argument's value collection. This causes subsequent positional arguments to receive no values.
**Verification:** `cargo test -p clap_builder -- escape_as_value_terminator_with_empty_list`
**Agent Instructions:** The `value_terminator` feature does not work correctly when the terminator string appears as the first argument to a positional. For example, given two positional args where the first has `value_terminator("--")` and `allow_hyphen_values(true)`, running `program -- ls -l` should result in the first arg getting no values and the second arg getting `["ls", "-l"]`. Instead, the parser enters trailing-values mode and assigns all values to the first arg. Fix the parser in `clap_builder/src/parser/parser.rs` to check for value terminators on the current positional argument before falling through to the trailing-values logic.

---

## clap-bug-fix-4

**Codebase:** clap
**Category:** bug-fix
**Difficulty:** medium
**GitHub Issue:** #6236 - Confusing `Usage: <...>` suggestion when using an argument together with an argument from a conflicting argument group
**Fix PR:** #6237
**Affected Crate:** clap_builder
**Competition Pinned Commit:** 9ab6dee710aa384e02ec5e9e2cfeadb2f35abf2a (v4.6.0 tagged release; the competition baseline)
**Pre-Fix Commit:** 2047862681cecd15562d86e4e30e3229073abf91
**Pre-Fix Commit Note:** Predates the tagged release by 68 commits. This is the state of the main branch immediately before the fix PR was merged. The bug is reproducible at this commit (conflicting args from groups appear in usage). Agents work on the competition pinned commit for the codebase context, but fail-to-pass verification runs at this pre-fix commit.
**Description:** When an argument conflicts with an argument group, the error message's `Usage:` line incorrectly includes the conflicting arguments from the group. For example, if `--conflict` conflicts with a group containing `--a` and `--b`, the usage should show only `prog --conflict` but instead shows both conflicting group members, which is confusing. Additionally, duplicate conflict IDs can appear when groups are expanded.
**Verification:** `cargo test -p clap_builder -- conflict_with_group`
**Agent Instructions:** When a conflict error is reported between an argument and an argument group, the error message displays a confusing usage line that includes the conflicting arguments rather than excluding them. The issue is in the conflict error building logic in `clap_builder/src/parser/validator.rs`. The `build_conflict_err` method expands group IDs into their member argument IDs but can produce duplicates because it does not deduplicate after expansion. Fix the method to collect the expanded conflict IDs into a `FlatSet` (for deduplication) before mapping them to display strings, and pass the deduplicated list to `build_conflict_err_usage`.

---

## clap-bug-fix-5

**Codebase:** clap
**Category:** bug-fix
**Difficulty:** medium
**GitHub Issue:** #6208 - Optional value to argument not handled correctly in the generated zsh completion script
**Fix PR:** #6209
**Affected Crate:** clap_complete
**Competition Pinned Commit:** 9ab6dee710aa384e02ec5e9e2cfeadb2f35abf2a (v4.6.0 tagged release; the competition baseline)
**Pre-Fix Commit:** 4ecbf54ac314b6cd9a84d7e48350b71f6bd4c7ac
**Pre-Fix Commit Note:** Predates the tagged release by 126 commits. This is the state of the main branch immediately before the fix PR was merged. The bug is reproducible at this commit (zsh completions broken for optional-value args). Agents work on the competition pinned commit for the codebase context, but fail-to-pass verification runs at this pre-fix commit.
**Description:** When an argument has an optional value (i.e., `num_args(0..=1)`), the generated zsh completion script produces an invalid completion specification. The `min_values()` returns 0, causing `vc.repeat(0)` to produce an empty string, which results in the argument being treated as a flag rather than an option that can accept a value.
**Verification:** `cargo test -p clap_complete -- optional_value_option`
**Agent Instructions:** The zsh shell completion generator in `clap_complete/src/aot/shells/zsh.rs` does not handle optional-value arguments correctly. When an argument is configured with `num_args(0..=1)` (optional value), the generated zsh completion spec calls `vc.repeat(min_values)` where `min_values` is 0, producing an empty string. This means the argument is treated as if it takes no value at all, breaking tab completion. Fix the `write_opts_of` function to handle the case where `min_values()` is 0 by emitting the value completion spec as an optional value (prefixed with `:`) instead of repeating it zero times.
