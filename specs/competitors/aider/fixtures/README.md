# Aider LLM History Fixtures

## Source

The file `llm-history-sample.txt` was captured from a **real Aider invocation**
(v0.86.2) using the `--llm-history-file` flag. The API call itself failed
(no API key was available), but Aider still wrote the outbound request to the
history file, including system prompt, few-shot examples, and the user message.
The `LLM RESPONSE` section is empty because no API response was received.

This is **not synthetic** -- it is genuine Aider output, just truncated at the
point where the LLM would have responded.

## Confirmed Role Marker Format (Aider 0.86.2)

The `--llm-history-file` format does **NOT** use `#### user` / `#### aider`
markers as was initially assumed in planning documents. The actual format is:

### Section Headers

```text
TO LLM <ISO-8601-timestamp>
```

Marks the beginning of a message block sent to the LLM.

```text
LLM RESPONSE <ISO-8601-timestamp>
```

Marks the beginning of the LLM's response. Content follows on subsequent lines.

### Role Prefixes

Each content line within a section is prefixed with a role tag:

| Prefix      | Meaning                                       |
|-------------|-----------------------------------------------|
| `SYSTEM `   | System message line                            |
| `USER `     | User message line                              |
| `ASSISTANT `| Assistant message line (few-shot examples)     |

Note: The prefix is followed by a single space, then the line content.
Blank continuation lines within a role block use the prefix alone (e.g., `SYSTEM ` with trailing space, or just `SYSTEM`).

### Separators

```text
-------
```

A line of seven hyphens separates role blocks within a `TO LLM` section.

### Structure Summary

```text
TO LLM <timestamp>
-------
SYSTEM <system prompt line 1>
SYSTEM <system prompt line 2>
...
-------
USER <few-shot example user message>
-------
ASSISTANT <few-shot example assistant response>
-------
USER <actual user message>
...
LLM RESPONSE <timestamp>
<response content lines, if any>
```

### Regex Patterns for Phase 3 Parser

```python
# Section headers
RE_TO_LLM = r'^TO LLM \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
RE_LLM_RESPONSE = r'^LLM RESPONSE \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'

# Role prefixes (start of line)
RE_SYSTEM = r'^SYSTEM(?:\s|$)'
RE_USER = r'^USER(?:\s|$)'
RE_ASSISTANT = r'^ASSISTANT(?:\s|$)'

# Separator
RE_SEPARATOR = r'^-{7}$'
```

### Turn Counting Logic

For counting LLM turns (the `llm_turns` / `calls` metric):
- Each `TO LLM` ... `LLM RESPONSE` pair constitutes one turn
- Count the number of `TO LLM` lines to get the total turn count
- Few-shot examples within the SYSTEM/USER/ASSISTANT blocks are part of the
  prompt, not separate turns

## Capture Details

- **Aider version**: 0.86.2
- **Date captured**: 2026-03-28
- **Command used**:
  ```sh
  aider --message "What does the variable x contain?" \
    --model claude-haiku-4-20240307 \
    --yes-always --no-stream --no-pretty --no-fancy-input \
    --no-auto-lint --no-auto-commits \
    --llm-history-file "$LLM_HISTORY" \
    --edit-format diff \
    test.py < /dev/null
  ```
- **API key available**: No (ANTHROPIC_API_KEY and OPENAI_API_KEY both unset)
- **Result**: Partial history file produced (outbound request only, no LLM response)
