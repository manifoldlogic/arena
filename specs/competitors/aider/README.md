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

## Known Issues

### Issue #3903: `--yes-always` Shell Command Auto-Confirmation

Aider's `--yes-always` flag, which is needed for non-interactive automated runs, also auto-confirms shell command execution without any sandboxing. This means aider can execute arbitrary shell commands suggested by the LLM without human review.

**Status:** Open upstream (https://github.com/Aider-AI/aider/issues/3903)

**Workaround:** The harness runner script must implement its own sandboxing or run aider in a restricted environment (container, limited user permissions) to mitigate this risk. See the aider-runner.sh script (ARENA-46.1003) for the containment approach.

### Text-Based LLM History

Aider logs LLM interactions as plain text, not structured JSON. Extracting metrics like turn counts and token usage requires regex parsing of the log output, which is fragile and may break across aider versions.

### No Direct Tool Call Count

Unlike Claude Code which reports structured tool calls, aider does not expose a "tool call count" metric. The `llm_turns` value parsed from aider's history log is used as a proxy for the `calls` field in `rounds.jsonl` (see DISC-01 schema mapping notes in `config.json`).

## Version Pinning

The version (`0.86.2`) is pinned in both `config.json` and the installation instructions above. If updating the version, both locations must be kept in sync. The version may be updated in ARENA-46.1002 after confirming the actual installed version.
