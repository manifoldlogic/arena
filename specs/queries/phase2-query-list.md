# Phase 2 Query List

Phase 2 introduces ast-grep as a third competitor alongside Explore and Maproom. Queries are selected to test structural code understanding where AST-based search should have a discriminating advantage.

**Selection criteria applied:**
1. At least 3 of 6 per codebase from structural/pattern-discovery/absence-proof categories
2. Weighted toward queries where AST search paradigm should have an advantage (finding classes, tracing inheritance, discovering patterns by code shape)
3. No query repeats from Phase 1
4. Prefer harder difficulty to break out of gray-zone divergence

## FastAPI Queries (6)

| Query ID | Codebase | Category | Difficulty | Selection Rationale |
|----------|----------|----------|------------|---------------------|
| fastapi-pattern-discovery-1 | fastapi | pattern-discovery | easy | AST advantage: finding route identifier generation requires locating specific function patterns. Easy anchor for calibration. |
| fastapi-flow-tracing-2 | fastapi | flow-tracing | hard | Deep structural tracing of WebSocket lifecycle. ast-grep can find `@app.websocket` decorator patterns and async def shapes that text search may miss or over-match. |
| fastapi-absence-proof-3 | fastapi | absence-proof | hard | Requires tracing CORS middleware implementation across FastAPI/Starlette boundary. AST search can precisely find class inheritance chains. Not used in Phase 1. |
| fastapi-relationship-3 | fastapi | relationship | hard | Tracing all callers of `solve_dependencies` — ast-grep excels at finding function call patterns (`solve_dependencies($$$ARGS)`). Not used in Phase 1. |
| fastapi-bug-investigation-2 | fastapi | bug-investigation | hard | Finding `ResponseValidationError` raise sites and exception handler chains. AST patterns for `raise ResponseValidationError($$$)` are precise. Not used in Phase 1. |
| fastapi-pattern-discovery-2 | fastapi | pattern-discovery | medium | Sync/async handling pattern — ast-grep can find `asyncio.iscoroutinefunction` calls and `run_in_threadpool` usage patterns structurally. Not used in Phase 1. |

## Django Queries (6)

| Query ID | Codebase | Category | Difficulty | Selection Rationale |
|----------|----------|----------|------------|---------------------|
| django-pattern-discovery-3 | django | pattern-discovery | hard | QuerySet lazy evaluation — AST search can find `__iter__`, `__len__`, `_fetch_all` patterns that trigger evaluation. Structural code shape is critical. |
| django-pattern-discovery-1 | django | pattern-discovery | easy | Management command naming convention and discovery. ast-grep can find `class Command(BaseCommand)` across the codebase efficiently. Easy anchor. |
| django-absence-proof-3 | django | absence-proof | hard | CSP middleware search. AST search can conclusively prove absence by scanning all middleware class definitions. Not used in Phase 1. |
| django-enumeration-3 | django | enumeration | hard | Finding all signals across the entire codebase. ast-grep pattern `$NAME = Signal($$$)` can enumerate signal definitions precisely. Not used in Phase 1. |
| django-bug-investigation-2 | django | bug-investigation | hard | Race conditions in migration executor. Requires understanding atomicity patterns — ast-grep can find `atomic` context managers and `select_for_update` calls. Not used in Phase 1. |
| django-ambiguous-premise-1 | django | ambiguous-premise | medium | Active Record pattern claim. AST search can find `Model.save()` and `Model.delete()` to precisely characterize the pattern (Active Record vs not). Not used in Phase 1. |

## Summary

- **Total queries:** 12 (6 fastapi + 6 django)
- **Structural/pattern-discovery/absence-proof count:** 8 of 12 (67%) — fastapi: 3 (pattern-discovery x2, absence-proof x1), django: 5 (pattern-discovery x2, absence-proof x1, enumeration x1, ambiguous-premise x1)
- **Hard difficulty:** 8 of 12 (67%)
- **Phase 1 repeats:** 0
- **AST-advantaged categories:** pattern-discovery (3), absence-proof (2), enumeration (1), relationship (1) = 7 queries where ast-grep's structural matching should differentiate
