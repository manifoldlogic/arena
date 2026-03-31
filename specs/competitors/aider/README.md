# Aider Competitor

**Harness type:** aider
**Model:** claude-sonnet-4-20250514
**Edit format:** diff

## Overview

Aider is a terminal-based AI coding assistant that edits code in a local git repository using LLM-generated diffs. In Arena, Aider competes as an alternative harness alongside Claude Code, using the same codebases and round specifications but a fundamentally different interaction model (edit-format diffs vs. tool calls).

This is a **discovery-only configuration**. It is not integrated into the main `competitors.json` pipeline. The purpose is to collect friction data (DISC-05) and inform the permanent multi-harness config format (ARENA-HARN).

## Prerequisites

- Python 3.10 or higher
- [uv](https://github.com/astral-sh/uv) package manager
- `jq` — JSON construction in `aider-runner.sh` (standard in most Linux environments; install with `apt-get install jq` or `brew install jq`)
- `ANTHROPIC_API_KEY` environment variable set (required for Claude model access)
- `OPENAI_API_KEY` environment variable set (optional, only if using OpenAI models)

## Installation

Install aider-chat pinned to the version specified in `config.json`:

```sh
uv venv specs/competitors/aider/.venv
uv pip install --python specs/competitors/aider/.venv aider-chat==0.86.2
```

## Verification

Confirm the installation succeeded and the version matches:

```sh
specs/competitors/aider/.venv/bin/aider --version
```

Expected output should include `aider 0.86.2`.

## Environment Variables

| Variable            | Required | Purpose                                              |
| ------------------- | -------- | ---------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Yes      | API key for Claude model access via Anthropic API    |
| `OPENAI_API_KEY`    | No       | API key for OpenAI models (only if switching models) |

## Invocation

Aider is invoked through the harness runner script. The `invocation_template` in `config.json` defines the call pattern:

```sh
scripts/harness/aider-runner.sh \
  --message-file {message_file} \
  --codebase-dir {codebase_dir} \
  --output-dir {output_dir} \
  --timeout {timeout} \
  --model {model} \
  --edit-format diff
```

The `--edit-format diff` flag is always passed explicitly to ensure parseable output. This is not a configurable placeholder.

> **Note:** `aider-runner.sh` resolves the Aider binary using a relative path by default. The script must be invoked from the repository root for this path to resolve correctly. If invoking from a different working directory, set `AIDER_BIN` to an absolute path:
>
> ```sh
> AIDER_BIN=/absolute/path/to/.venv/bin/aider scripts/harness/aider-runner.sh ...
> ```

### Post-Processing

After `aider-runner.sh` completes, run `parse-aider-log.py` on the output to produce a structured log artifact:

```sh
python scripts/harness/parse-aider-log.py \
  --input "$OUTPUT_DIR/llm-history.txt" \
  --output "$OUTPUT_DIR/parsed-log.json"
```

The resulting `parsed-log.json` is the structured artifact consumed by the scoring pipeline.

## Known Issues

### Issue #3903: `--yes-always` and Shell Commands

Aider's `--yes-always` flag, which is needed for non-interactive automated runs, does **not** auto-approve shell commands. Shell commands suggested by the LLM are silently skipped. Stdin redirection from `/dev/null` in the harness runner provides a belt-and-suspenders guard against interactive hangs.

**Status:** Open upstream (https://github.com/Aider-AI/aider/issues/3903)

**Mitigation:** The harness runner redirects stdin from `/dev/null` as an additional guard against unexpected interactive prompts. See the aider-runner.sh script (ARENA-46.2001) for details.

### Text-Based LLM History

Aider logs LLM interactions as plain text, not structured JSON. Extracting metrics like turn counts and token usage requires regex parsing of the log output, which is fragile and may break across aider versions.

### No Direct Tool Call Count

Unlike Claude Code which reports structured tool calls, aider does not expose a "tool call count" metric. The `llm_turns` value parsed from aider's history log is used as a proxy for the `calls` field in `rounds.jsonl` (see DISC-01 schema mapping notes in `config.json`).

## Version Pinning

The version (`0.86.2`) is pinned in both `config.json` and the installation instructions above. If updating the version, both locations must be kept in sync. The version may be updated in ARENA-46.1002 after confirming the actual installed version.
