# Calibration Round 2 — FastAPI (Hard)

This is a pre-scored calibration round. The judge must score the competitor output below and match the official scores within 1 point on each dimension before proceeding. This round deliberately includes incomplete recall — the competitor missed important locations.

---

**Query:** fastapi-flow-tracing-2 (hard)
> Trace how a WebSocket connection is established and managed in FastAPI. Follow the code path from the `@app.websocket` decorator through connection acceptance, message handling, and disconnection.

**Competitor output (excerpt):**

> The `@app.websocket("/path")` decorator is defined on the `FastAPI` class in `fastapi/applications.py`, which delegates to `APIRouter.websocket()` in `fastapi/routing.py`.
>
> The decorator creates an `APIWebSocketRoute` (also in `routing.py`) that wraps the user's async function. When a WebSocket connection arrives:
>
> 1. The ASGI app receives a `scope` with `type="websocket"`. Starlette's routing matches the path and delegates to the `APIWebSocketRoute`.
>
> 2. The route calls the endpoint function, passing a `WebSocket` object. The `WebSocket` class is in `fastapi/websockets.py` and wraps Starlette's `WebSocket` with a few additions.
>
> 3. Inside the endpoint, the user calls `await websocket.accept()` to complete the handshake, then `await websocket.receive_text()` / `websocket.send_text()` for messaging, and `await websocket.close()` to disconnect.
>
> 4. If the client disconnects unexpectedly, a `WebSocketDisconnect` exception is raised (from Starlette).
>
> The dependency injection system also works with WebSocket routes — `Depends()` is resolved the same way as for HTTP routes, via `solve_dependencies` in `fastapi/dependencies/utils.py`.

**Official scores:** Precision: 4, Recall: 3, Insight: 2

**Scoring rationale:**

- **Precision: 4** — The core facts are correct: the decorator chain through `FastAPI` -> `APIRouter` -> `APIWebSocketRoute`, the `WebSocket` class in `fastapi/websockets.py`, the ASGI scope type, the accept/receive/send/close lifecycle, and `WebSocketDisconnect`. One imprecision: the route class may be `WebSocketRoute` (from Starlette) rather than `APIWebSocketRoute` depending on the exact code path — the agent does not distinguish between FastAPI's wrapper and Starlette's base class precisely. Nearly all correct.

- **Recall: 3** — Covers the main establishment and messaging path. Missing several important pieces: (a) `WebSocketRequestValidationError` handling for validation failures during WebSocket dependency resolution; (b) the `AsyncExitStack` middleware in `fastapi/middleware/asyncexitstack.py` which manages dependency lifespans for WebSocket connections; (c) the `on_disconnect` handling and how `WebSocketState` transitions are managed in Starlette; (d) the `websocket_request_validation_exception_handler` that closes with `WS_1008_POLICY_VIOLATION`. The core answer is present but multiple secondary paths are absent.

- **Insight: 2** — Describes each step of the WebSocket lifecycle sequentially but does not draw meaningful connections. Does not explain: how WebSocket dependency injection differs from HTTP (lifespan management across the connection duration vs per-request), why `AsyncExitStack` is needed for WebSocket deps but not HTTP deps, or how the ASGI protocol's three-message handshake (connect -> accept -> messages -> disconnect) maps to the code abstractions. Individual steps are described but relationships between them are not analyzed.
