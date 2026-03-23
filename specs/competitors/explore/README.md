# Explore Agent Specification — Derivation from Series 1 Data

## Overview

The Explore agent is the text/regex baseline competitor in Search Olympics Series 2. It uses standard Claude Code tools (Grep, Glob, Read, Bash) without any code index, semantic search, or AST tooling. This spec was derived from 15 rounds of empirical data in Series 1, documented in `olympics-plan.md`.

## Performance Budget Derivation

All performance budget values are derived from Series 1 Explore agent behavior across 15 scored rounds (V2: R4-R12, V3: R13-R18).

### Tool Call Data (sorted)

| Rank | Round  | Tool Calls | Category                                 |
| ---- | ------ | :--------: | ---------------------------------------- |
| 1    | R8     |     21     | Relationship (UserProfile renderers)     |
| 2    | R11    |     30     | Bug Investigation (WebSocket)            |
| 3    | R10    |     32     | Pattern (feature flags)                  |
| 4    | R18    |     37     | Pattern Anomaly (selectors)              |
| 5    | R13    |     43     | Deep Flow Trace (post metadata)          |
| 6    | R4     |     50     | Conceptual (env vars)                    |
| 7    | R6     |     51     | Architecture (signup flow)               |
| 8    | **R7** |   **54**   | **Architecture (middleware) — MEDIAN**   |
| 9    | R9     |     57     | Relationship (logger usage)              |
| 10   | R12    |     69     | Symbol-level (event types)               |
| 11   | R14    |     72     | Synonym Discovery (duplicate prevention) |
| 12   | R5     |     74     | Conceptual (HTTP external)               |
| 13   | R16    |     75     | Conditional Trace (compose box)          |
| 14   | R15    |     77     | Absence Proof (TTL caching)              |
| 15   | R17    |     80     | Scattered Cross-Cutting (date/time)      |

- **Median**: 54 tool calls (R7) -> `target_tool_calls: 54`
- **Maximum**: 80 tool calls (R17) -> `max_tool_calls: 80`
- **Average**: 54.8 tool calls

### Wall Time Data (sorted)

| Rank | Round  | Wall Time | Tool Calls |
| ---- | ------ | :-------: | :--------: | ---------- |
| 1    | R8     |    40s    |     21     |
| 2    | R11    |    64s    |     30     |
| 3    | R9     |    72s    |     57     |
| 4    | R10    |    73s    |     32     |
| 5    | R6     |    93s    |     51     |
| 6    | R4     |    98s    |     50     |
| 7    | R7     |   107s    |     54     |
| 8    | **R5** | **121s**  |     74     | **MEDIAN** |
| 9    | R18    |   134s    |     37     |
| 10   | R12    |   143s    |     69     |
| 11   | R17    |   189s    |     80     |
| 12   | R16    |   265s    |     75     |
| 13   | R15    |   340s    |     77     |
| 14   | R14    |   344s    |     72     |
| 15   | R13    |   379s    |    379     |

- **Median**: 121s (R5) -> `target_wall_time_seconds: 121`
- **Maximum**: 379s (R13) -> `max_wall_time_seconds: 600` (rounded up to allow headroom for new codebases)

## Failure Modes — Empirical Sources

### FM-E1: Search Loop Inflation

Observed in 6 of 15 rounds where Explore used 69+ tool calls. The clearest example is R12 (event types): Explore used 69 calls vs Maproom's 33 — 52% more — yet scored 9 vs 11. The agent kept searching for different event categories instead of reading the event definition files it had already found. R17 (date/time formatting) showed the same pattern at 80 calls vs Maproom's 39.

### FM-E2: False Negative on Absence-Proof

R15 (TTL caching) is the single most instructive failure in Series 1. Explore searched exhaustively (77 calls) and found 12 types of caching, but concluded "NO EXPLICIT TTL CACHING" — missing the custom status TTL implementation using `calculateExpiryTime()`. This was Explore's only accuracy failure across 15 rounds (2/3 accuracy, unique in the entire series). The failure mode is: broad search coverage masking a specific miss because the implementation used different terminology ("duration presets" and "expiry time" rather than "TTL").

### FM-E3: Breadth Over Depth Under Pressure

Visible in R12 and R15 where high call counts correlated with lower accuracy. In R12, Explore found event categories but undercounted WebSocket events compared to Maproom's accurate tally. The agent read many files superficially rather than fewer files deeply. The Explore agent scored perfect 45/45 on coverage but only 44/45 on accuracy — the coverage-accuracy trade-off is the defining characteristic of the text search paradigm.

### FM-E4: Structural Inefficiency

Across all 15 rounds, Explore averaged 54.8 calls vs Maproom's 37.9 — a 31% overhead that persisted regardless of query difficulty. Even on focused queries (R11: WebSocket, 30 vs 19 calls; R4: env vars, 50 vs 27), Explore used more calls. This is not a prompt deficiency — it is a paradigm characteristic. Text search requires more queries to converge because each Grep call returns string matches, not semantic matches.

## System Prompt Design Decisions

### Search Phase Limit (8-12 calls)

Derived from the observation that Explore's best-scoring rounds (R8: 12/12, R9: 11/12) used 21-57 total calls with a reasonable search-to-read ratio, while worst-scoring rounds (R12: 9/12, R15: 9/12) had inflated search phases. The 8-12 search call limit forces the transition to reading before the search loop inflates.

### Mandatory Read Phase (3-5 files)

The Maproom spec's winning formula is "search -> context -> read." The Explore equivalent is "search -> read -> synthesize." Rounds where Explore scored highest (R8: 12/12) showed the agent reading key files thoroughly. Rounds where it scored lowest (R12, R15) showed superficial scanning of many files.

### Absence Handling Protocol

Directly addresses FM-E2. The R15 failure showed that exhaustive search with a false conclusion is worse than targeted search with an honest "not found." The prompt requires synonym searches and explicit documentation of what was checked.

### New Category Guidance

Series 2 adds terminology-mismatch, ambiguous-premise, and cold-start categories. These were not tested in Series 1, so the prompt guidance is based on FM-E2 (terminology mismatch maps to the R15 failure mode) and general agent design principles. The cold-start guidance prioritizes breadth-first exploration (README, package.json, directory structure) based on the observation that Explore's strength is coverage (45/45 in Series 1).

## Structural Equivalence with Maproom Spec

| Section              | Maproom Spec (`maproom-agent-spec.md`)                | Explore Spec                                                                           |
| -------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Empirical foundation | 9-round benchmark, round-by-round stats               | 15-round benchmark (V2+V3), round-by-round stats                                       |
| Agent metadata       | name, model, tools, description                       | name, paradigm, model, tools (in agent-spec.json)                                      |
| System prompt        | 4 phases: Search, Deepen, Verify, Synthesize          | 4 phases: Plan, Search, Deepen, Synthesize                                             |
| Critical rules       | 5 rules (max searches, early Read, ignore i18n, etc.) | 7 rules (plan first, vary terms, early Read, depth, confidence, fairness, ignore i18n) |
| Performance budget   | Target 20-35 calls, 60-100s                           | Target 54 calls, 121s (higher — reflects paradigm cost)                                |
| Failure modes        | Search loops, coverage gaps                           | Search loops, false negatives, breadth over depth, structural inefficiency             |
| Output format        | File paths, snippets, connections                     | File paths, snippets, connections, confidence, search summary                          |

The Explore spec is structurally equivalent but reflects the text-search paradigm's higher call count baseline and different failure profile.
