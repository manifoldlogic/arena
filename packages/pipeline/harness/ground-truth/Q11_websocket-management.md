# Ground Truth: Q11 - Where Are WebSocket Connections Managed and Cleaned Up?

## Query
"Where are WebSocket connections managed and cleaned up?"

## Category
Bug Investigation

## Ideal Answer Summary
WebSocket connections in the Mattermost webapp are managed by the `WebSocketClient` class defined in `packages/client/src/websocket.ts`. This class handles the full lifecycle: initialization via the `initialize()` method (which creates a native `WebSocket` and sets up `onopen`, `onclose`, `onerror`, and `onmessage` handlers), automatic reconnection with a quadratic backoff strategy (base 3s, scaling by `connectFailCount^2` up to 5min, plus random jitter up to 2s), and cleanup via the `close()` method (which resets state, nullifies the `onclose` handler to prevent auto-reconnect, closes the connection, and nulls the `conn` reference). A singleton `WebSocketClient` instance is created in `client/web_websocket_client.jsx` and provided to React components via `WebSocketContext` in `components/root/root_provider.tsx`. The application-level integration lives in `actions/websocket_actions.jsx`, which exports `initialize()` and `close()` functions that register/remove all event listeners and handle the reconnection logic (syncing posts, threads, channels, statuses). The `LoggedIn` component (`components/logged_in/logged_in.tsx`) manages the lifecycle at the component level: calling `WebSocketActions.initialize()` on mount, `WebSocketActions.close()` on unmount, and also on `beforeunload`. Connection state is tracked in the Redux store at `state.websocket` via a reducer in `packages/mattermost-redux/src/reducers/websocket.ts`, which responds to `WEBSOCKET_SUCCESS`, `WEBSOCKET_FAILURE`, `WEBSOCKET_CLOSED`, and `SET_CONNECTION_ID` action types.

## Coverage Items

### Required-Easy (Baseline -- basic search should find these)

1. **`WebSocketClient` class definition**: The `WebSocketClient` class in `packages/client/src/websocket.ts` is the core class managing all WebSocket connection logic. It wraps the native browser `WebSocket` object and manages connection URLs, sequence numbers, fail counts, response callbacks, and a connection ID for reconnection identification.

2. **`initialize()` method - connection setup**: The `initialize()` method on `WebSocketClient` creates a new `WebSocket` connection with connection ID and sequence number as URL parameters. It sets up handlers for open (authentication and reconnect detection), close (auto-reconnect with backoff), error (logging), and message (JSON parsing, sequence validation, listener dispatch) events.

3. **`close()` method - cleanup**: The `close()` method performs a clean shutdown by resetting state, replacing the `onclose` handler with a no-op to prevent auto-reconnect, closing the connection, and nullifying the reference. This is the key distinction from an unexpected disconnection, which triggers auto-reconnect.

4. **Application-level `initialize()` and `close()` functions**: The `actions/websocket_actions.jsx` file exports application-level `initialize()` and `close()` functions. The `initialize()` function constructs the WebSocket URL from config, registers event listeners (message, first connect, reconnect, missed message, close), and calls `WebSocketClient.initialize()`. The `close()` function calls `WebSocketClient.close()` and removes all listeners.

### Required-Hard (Differentiation -- precise details)

1. **`WebSocketClient` class definition**: Located in `packages/client/src/websocket.ts` (line 18). This is the core class that manages all WebSocket connection logic. It wraps the native browser `WebSocket` object (`private conn: WebSocket | null`) and manages connection URL, sequence numbers (`responseSequence` for client-sent messages, `serverSequence` for server-sent events), fail count (`connectFailCount`), response callbacks, and a `connectionId` for cross-tab/reconnection identification. Exported as default from `@mattermost/client` package.

2. **`initialize()` method - connection setup**: In `packages/client/src/websocket.ts` (line 85). Creates a new `WebSocket` with URL params `connection_id` and `sequence_number` appended (line 102: `` `${connectionUrl}?connection_id=${this.connectionId}&sequence_number=${this.serverSequence}` ``). Guards against double initialization (`if (this.conn) { return; }`). Sets up four native WebSocket event handlers:
   - `conn.onopen` (line 105): Sends authentication challenge token, fires `reconnectCallback`/`reconnectListeners` if `connectFailCount > 0`, otherwise fires `firstConnectCallback`/`firstConnectListeners`. Resets `connectFailCount` to 0.
   - `conn.onclose` (line 123): Nulls `conn`, resets `responseSequence`, increments `connectFailCount`, fires close listeners, computes backoff retry time, and calls `setTimeout` to re-invoke `initialize()`.
   - `conn.onerror` (line 157): Logs error on first failure, fires error listeners.
   - `conn.onmessage` (line 167): Parses JSON, handles reply-to-request messages via `responseCallbacks`, processes `hello` packet for `connectionId` changes (triggers missed message listeners if connection ID differs), validates `serverSequence` (disconnects on mismatch to force reconnect), and dispatches to message listeners.

3. **`close()` method - cleanup**: In `packages/client/src/websocket.ts` (line 340). Performs a clean shutdown: resets `connectFailCount` to 0, resets `responseSequence` to 1, checks `readyState === WebSocket.OPEN`, replaces `onclose` with a no-op (line 344: `this.conn.onclose = () => {};`) to prevent the auto-reconnect behavior that the normal `onclose` handler would trigger, calls `this.conn.close()`, and sets `this.conn = null`.

4. **Application-level `initialize()` and `close()` functions**: In `actions/websocket_actions.jsx` (lines 128, 180). The `initialize()` function (line 128) constructs the WebSocket URL from config (using `WebsocketURL` or deriving from `SiteURL` with protocol swap to `ws://`/`wss://`), registers five listeners on the singleton `WebSocketClient` (`addMessageListener(handleEvent)`, `addFirstConnectListener(handleFirstConnect)`, `addReconnectListener(reconnect)`, `addMissedMessageListener(restart)`, `addCloseListener(handleClose)`), then calls `WebSocketClient.initialize(connUrl)`. The `close()` function (line 180) calls `WebSocketClient.close()` and removes all five listeners.

### Expected (Should Find - Comprehensive Answer)

1. **Reconnection backoff strategy**: In `packages/client/src/websocket.ts` (lines 136-154, constants at lines 4-7). Uses quadratic backoff with jitter. Constants: `MAX_WEBSOCKET_FAILS = 7`, `MIN_WEBSOCKET_RETRY_TIME = 3000` (3s), `MAX_WEBSOCKET_RETRY_TIME = 300000` (5min), `JITTER_RANGE = 2000` (2s). After `MAX_WEBSOCKET_FAILS` (7) consecutive failures, retry time scales as `MIN_WEBSOCKET_RETRY_TIME * connectFailCount * connectFailCount`, capped at `MAX_WEBSOCKET_RETRY_TIME`. Random jitter `Math.random() * JITTER_RANGE` is always added to prevent thundering herd. Reconnection is handled inside `conn.onclose` via `setTimeout(() => this.initialize(connectionUrl, token), retryTime)`.

2. **Listener-based event system**: The `WebSocketClient` class supports six listener types via `Set<Listener>` collections (lines 63-68): `messageListeners`, `firstConnectListeners`, `reconnectListeners`, `missedMessageListeners`, `errorListeners`, `closeListeners`. Each has `add*Listener()` and `remove*Listener()` methods. The class also maintains deprecated single-callback fields (`eventCallback`, `firstConnectCallback`, etc.) for backward compatibility. Listener sets warn to console when more than 5 listeners are registered (e.g., line 230-233).

3. **`LoggedIn` component lifecycle integration**: In `components/logged_in/logged_in.tsx`. Calls `WebSocketActions.initialize()` in `componentDidMount()` (line 78) and `WebSocketActions.close()` in `componentWillUnmount()` (line 129). Also registers a `beforeunload` event handler (line 85, handler at line 212) that calls `WebSocketActions.close()` before the page unloads to ensure connections are cleaned up. This is the primary React integration point that ties the WebSocket lifecycle to the authenticated user session.

4. **Redux connection state tracking**: The reducer in `packages/mattermost-redux/src/reducers/websocket.ts` tracks `{ connected: boolean, lastConnectAt: number, lastDisconnectAt: number, connectionId: string }` in `state.websocket`. Responds to `GeneralTypes.WEBSOCKET_SUCCESS` (sets `connected: true` with timestamp), `GeneralTypes.WEBSOCKET_FAILURE` / `WEBSOCKET_CLOSED` (sets `connected: false` with disconnect timestamp), and `GeneralTypes.SET_CONNECTION_ID` (stores the server-assigned connection ID). Resets to initial state on `UserTypes.LOGOUT_SUCCESS`. The selector `getSocketStatus` in `selectors/views/websocket.ts` reads `state.websocket`.

5. **Application-level `reconnect()` handler**: In `actions/websocket_actions.jsx` (line 207). On reconnection, dispatches `WEBSOCKET_SUCCESS`, syncs posts in the current channel (via `syncPostsInChannel`), reloads channels, statuses, team unreads, threads (for collapsed threads), plugins, and calls any registered plugin reconnect handlers. Also dispatches `checkForModifiedUsers()` if there was a previous disconnect, resets the WS error count, and clears errors. The `restart()` function (line 200) wraps `reconnect()` and additionally re-fetches client config (for server restart scenarios).

### Bonus (Extra Credit - Expert Answer)

1. **Sequence number validation and forced reconnect**: In `packages/client/src/websocket.ts` (lines 204-211). The `onmessage` handler checks `msg.seq !== this.serverSequence` to detect missed messages. If a gap is detected, it logs the mismatch, resets `connectFailCount` to 0 and `responseSequence` to 1, then calls `this.conn?.close()` (which triggers the `onclose` handler and its auto-reconnect logic) rather than calling `this.close()`, because `close()` would suppress auto-reconnect. This ensures missed messages trigger a clean reconnection cycle.

2. **Plugin WebSocket event handler system**: Plugins can register custom WebSocket event handlers via `registerWebSocketEventHandler(event, handler)` and reconnect handlers via `registerReconnectHandler(handler)` in the plugin registry (`plugins/registry.ts`, lines 697-719). These delegate to `registerPluginWebSocketEvent()` and `registerPluginReconnectHandler()` in `actions/websocket_actions.jsx` (lines 281-298). The main `handleEvent()` function iterates over `pluginEventHandlers` after processing core events (line 590-598), allowing plugins to receive any WebSocket event.

3. **React hook-based WebSocket access (`useWebSocket`)**: In `utils/use_websocket/hooks.ts`. Provides `useWebSocket({handler})` and `useWebSocketClient()` hooks. The `useWebSocket` hook registers a message listener via `wsClient.addMessageListener(handler)` in a `useEffect` and returns a cleanup function that calls `wsClient.removeMessageListener(handler)`. The WebSocket client is provided via React Context (`WebSocketContext` in `utils/use_websocket/context.ts`), with the provider in `components/root/root_provider.tsx` (line 19) passing the singleton `WebSocketClient` instance.

## Accuracy Markers

### Must Be Correct

1. **`WebSocketClient` class location**: Must be in `packages/client/src/websocket.ts`. Must be a class with a native `WebSocket` field (`conn`), an `initialize()` method for connecting, and a `close()` method for cleanup.

2. **Backoff formula**: Must describe quadratic scaling (`MIN_WEBSOCKET_RETRY_TIME * connectFailCount * connectFailCount`) that kicks in after `MAX_WEBSOCKET_FAILS` (7) consecutive failures, capped at `MAX_WEBSOCKET_RETRY_TIME` (300000ms / 5min), with random jitter added (`Math.random() * JITTER_RANGE` where `JITTER_RANGE = 2000`).

3. **`close()` prevents auto-reconnect**: Must note that `close()` replaces the `onclose` handler with a no-op (`this.conn.onclose = () => {}`) before calling `this.conn.close()`, which is what prevents the automatic reconnection that would otherwise be triggered by the normal `onclose` handler.

4. **Singleton pattern**: The `WebSocketClient` is instantiated once in `client/web_websocket_client.jsx` as `var WebClient = new WebSocketClient()` and exported as default. This single instance is used throughout the application.

### Common Mistakes

1. **Confusing `close()` with `conn.onclose`** (Type: factual_error): The `close()` method (line 340) is the intentional shutdown path that prevents reconnection by overriding `onclose`. The `conn.onclose` handler (line 123) is the automatic reconnection path that fires when the connection is lost unexpectedly. An agent might incorrectly state that `close()` triggers reconnection, or miss that `onclose` is nullified before calling `conn.close()`.

2. **Mischaracterizing the backoff as exponential** (Type: terminological_imprecision): The backoff is quadratic (`connectFailCount^2`), not exponential (`2^connectFailCount`). An agent might incorrectly describe it as "exponential backoff" which is a common but imprecise characterization. The formula is `3000 * n * n` where `n` is the fail count, not `3000 * 2^n`.

3. **Missing the connection_id / sequence_number query params** (Type: factual_error): An agent might describe the WebSocket connection without mentioning that `connection_id` and `sequence_number` are sent as URL query parameters (line 102) to enable the server to identify returning connections and resume the event stream. This is critical for understanding why the `hello` packet checks `connectionId` changes.

4. **Confusing the two `initialize()` functions** (Type: factual_error): There are two distinct `initialize()` functions: (1) `WebSocketClient.initialize()` in `packages/client/src/websocket.ts` which creates the raw WebSocket connection, and (2) `initialize()` in `actions/websocket_actions.jsx` which constructs the URL, registers listeners, and calls `WebSocketClient.initialize()`. An agent might conflate these or only mention one.

## Coverage Topics

1. WebSocketClient class definition: The core class managing all WebSocket connection logic, wrapping the native browser WebSocket object and managing connection URLs, sequence numbers, fail counts, response callbacks, and a connection ID.

2. initialize() method - connection setup: The initialization method creates a new WebSocket connection with identification parameters, sets up handlers for open (authentication and reconnect detection), close (auto-reconnect with backoff), error (logging), and message (parsing and listener dispatch) events.

3. close() method - cleanup: The cleanup method performs a clean shutdown by resetting state, suppressing auto-reconnect behavior, closing the connection, and nullifying the reference. This is distinct from unexpected disconnection which triggers auto-reconnect.

4. Application-level initialize() and close() functions: A separate application-level module exports wrapper functions that construct the WebSocket URL from config, register event listeners for connect/reconnect/message/close events, and delegate to the WebSocketClient methods.

## Expected Scores (from Manual Olympics)

| Agent | Coverage | Accuracy | Notes |
|-------|----------|----------|-------|
| Maproom | 3/3 | 3/3 | Perfect 12/12 score in R11. Found WebSocketClient class, backoff strategy, cleanup in close(). Fast (75s), 28 tool calls. Comprehensive lifecycle analysis. |
| Explore | 3/3 | 2/3 | Scored 11/12 in R11. Found same core patterns but likely had a minor accuracy issue (e.g., imprecise characterization of backoff strategy or missing the onclose override in close()). |
