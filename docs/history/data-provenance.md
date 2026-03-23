# Data Provenance — Search Olympics Series 2

## How Competition Rounds Were Executed

All competition rounds in Series 2 were executed as **subagent invocations** within the Claude Code orchestrator context. Each competitor (Explore, Maproom, ast-grep) was spawned as a Haiku-model subagent via the Agent/Task tool with the competitor's system prompt and access to the specified codebase.

### Tool Call Counts

Tool call counts reflect the number of tool invocations the subagent made during its execution. Because subagents run within the orchestrator's API context (not as standalone CLI sessions), call counts are typically lower than Series 1:

- **Series 1**: Agents ran as full CLI sessions with higher overhead and more exploratory behavior (Explore avg 54.8 calls, Maproom avg 37.9 calls)
- **Series 2**: Agents ran as focused subagents with tighter system prompts and explicit call budgets (Explore avg 9-15 calls, Maproom avg 6-8 calls, ast-grep avg 5-12 calls)

The reduction is attributable to:
1. Improved system prompts with explicit call budgets (Phase 2 learning from Series 1)
2. Subagent context vs full CLI session (less initialization overhead)
3. Haiku model improvements between Series 1 and Series 2

### Wall Time

Wall times represent elapsed real-time for each subagent execution. Times are lower than Series 1 reference ranges because:
1. Subagent execution is faster than CLI session startup + execution
2. No human interaction delays
3. Haiku model inference is faster in the current API version

### Scoring Rubric Reference Ranges

The scoring rubric's reference ranges (Explore: 30-50 calls, Maproom: 15-25 calls) were calibrated from Series 1 data. Series 2 actuals are below these ranges due to the factors above. The rubric states these are "for context, not scoring" — tool calls and wall time are reported as raw numbers and do not affect judged scores (Precision/Recall/Insight).

### Comparative Validity

Despite absolute number differences from Series 1, the **relative** comparison between competitors within Series 2 is valid:
- All competitors used the same model (Haiku), same tools, same codebase, same query
- The execution environment was identical for all competitors in each round
- Differences in tool call counts and wall time reflect genuine paradigm differences (text search vs FTS vs AST)
