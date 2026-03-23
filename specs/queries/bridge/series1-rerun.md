# Bridge Queries — Series 1 Rerun

These 5 queries are selected from the Series 1 query bank (`search-examples.md`) for cross-series comparison on mattermost-webapp. They are run with identical query text to enable direct comparison between Series 1 and Series 2 results.

## bridge-1

**Codebase:** mattermost-webapp
**Category:** bridge (Series 1: Conceptual)
**Difficulty:** medium
**Series 1 Round:** R4 (Env vars loading)
**Query:** How are environment variables loaded and validated?
**Selection rationale:** Maproom won R4 (11 vs 10) with 46% fewer tool calls. Medium difficulty conceptual query where the efficiency gap was stark — good test of whether structural improvements change the outcome.

## bridge-2

**Codebase:** mattermost-webapp
**Category:** bridge (Series 1: Relationship)
**Difficulty:** medium
**Series 1 Round:** R8 (UserProfile renderers)
**Query:** What components render the UserProfile component?
**Selection rationale:** One of only 2 rounds Explore won in Series 1 (12 vs 11). Explore used fewer tool calls here (21 vs 25), making it the clearest Explore advantage case. Tests whether this edge persists.

## bridge-3

**Codebase:** mattermost-webapp
**Category:** bridge (Series 1: Pattern/convention)
**Difficulty:** medium
**Series 1 Round:** R10 (Feature flags)
**Query:** How are feature flags checked throughout the code?
**Selection rationale:** A tie round (11-11) with nearly identical tool call counts (32 vs 31). The closest possible Series 1 result — any systematic advantage in Series 2 should break the tie.

## bridge-4

**Codebase:** mattermost-webapp
**Category:** bridge (Series 1: Bug investigation)
**Difficulty:** hard
**Series 1 Round:** R11 (WebSocket mgmt)
**Query:** Where are WebSocket connections managed and cleaned up?
**Selection rationale:** Maproom won (12 vs 11) with 37% fewer calls. High-difficulty query involving connection lifecycle tracing. Tests whether deep flow analysis favors one approach.

## bridge-5

**Codebase:** mattermost-webapp
**Category:** bridge (Series 1: Symbol-level)
**Difficulty:** hard
**Series 1 Round:** R12 (Event types)
**Query:** Find all event types/names that are emitted in this codebase
**Selection rationale:** Largest Maproom win in V2 (11 vs 9) with 52% fewer tool calls and 43% faster wall time. The most decisive V2 round — tests whether the gap persists or narrows with Series 2 infrastructure.
