# Calibration Anchors — mattermost-webapp

Codebase-specific anchor examples for the mattermost-webapp codebase. Each anchor shows a concrete example of what a competitor response at a given score level looks like, referencing actual files and patterns in the mattermost-webapp repository.

---

## Precision

### Precision — Score 1

**Example output excerpt:**
> Redux actions in mattermost-webapp are defined in `src/redux/actions/` using the standard Redux Toolkit `createSlice` pattern. Each slice file exports action creators and a reducer. The store is configured in `src/redux/store.ts` using `configureStore` from Redux Toolkit.

**Why this scores 1:** Nearly everything is fabricated. The codebase does not use Redux Toolkit or `createSlice`. Actions are in `packages/mattermost-redux/src/actions/` and `actions/`, not `src/redux/actions/`. The store is configured in `stores/redux_store.jsx`, not `src/redux/store.ts`. The agent invented a code organization that does not exist.

### Precision — Score 2

**Example output excerpt:**
> Channel action types are defined in `packages/mattermost-redux/src/action_types/channels.ts` using `keyMirror`. They follow a pattern like `CHANNEL_REQUEST`, `CHANNEL_SUCCESS`, `CHANNEL_FAILURE`. The actions themselves are in `packages/mattermost-redux/src/actions/channels.ts` which makes API calls via the `Client4` class and dispatches these action types.

**Why this scores 2:** Correctly identifies the action types file and the `keyMirror` pattern. The example constants are real. But the description of actions is vague — "makes API calls via Client4" is correct but imprecise. Does not distinguish between the `mattermost-redux` action layer and the app-level `actions/channel_actions.ts`, which are different layers. The claim about request/success/failure is correct for some but the file has many more patterns (e.g., `DELETE_CHANNEL_SUCCESS`, `GET_ALL_CHANNELS_REQUEST`).

### Precision — Score 3

**Example output excerpt:**
> Channel action type constants are in `packages/mattermost-redux/src/action_types/channels.ts`, defined with `keyMirror` from `mattermost-redux/utils/key_mirror`. They follow an `ACTION_NOUN_VERB` pattern: `CHANNEL_REQUEST`/`SUCCESS`/`FAILURE`, `CREATE_CHANNEL_REQUEST`/`SUCCESS`/`FAILURE`, `DELETE_CHANNEL_SUCCESS`, `GET_CHANNELS_REQUEST`/`SUCCESS`/`FAILURE`, etc. The action type index at `action_types/index.ts` re-exports all type modules as `ChannelTypes`, `PostTypes`, etc.

**Why this scores 3:** All stated facts are correct. The `keyMirror` utility, the naming patterns, and the index re-export pattern are accurate. Minor gap: does not note the distinction between the naming convention for request lifecycle (`_REQUEST`/`_SUCCESS`/`_FAILURE`) vs. event-style constants (`RECEIVED_CHANNEL`, `LEAVE_CHANNEL`) which coexist in the same file.

### Precision — Score 4

**Example output excerpt:**
> Channel action types in `packages/mattermost-redux/src/action_types/channels.ts` use `keyMirror` to create string constants matching property names. Two naming conventions coexist:
> 1. Request lifecycle: `CREATE_CHANNEL_REQUEST` / `CREATE_CHANNEL_SUCCESS` / `CREATE_CHANNEL_FAILURE` — used by async action creators to track loading state
> 2. Event-style: `RECEIVED_CHANNEL`, `RECEIVED_MY_CHANNEL_MEMBER`, `LEAVE_CHANNEL`, `UPDATED_CHANNEL_HEADER` — used for WebSocket events and direct state mutations
>
> These are re-exported via `action_types/index.ts` as `ChannelTypes` and consumed by both `actions/channels.ts` (API-driven actions) and `actions/websocket_actions.jsx` (WebSocket event handlers).

**Why this scores 4:** Accurately identifies both naming conventions, the re-export pattern, and the two consumer types. One minor imprecision: the import in `websocket_actions.jsx` is `import { ChannelTypes } from 'mattermost-redux/action_types'` (the public package path), not the internal path. This is trivially inaccurate but does not mislead.

### Precision — Score 5

**Example output excerpt:**
> Channel action types are defined in `packages/mattermost-redux/src/action_types/channels.ts` via `keyMirror` (from `mattermost-redux/utils/key_mirror`), which creates an object where each value equals its key name as a string.
>
> Two naming patterns:
> 1. **Async lifecycle**: `{VERB}_{NOUN}_REQUEST/SUCCESS/FAILURE` (e.g., `CREATE_CHANNEL_REQUEST`, `GET_CHANNELS_SUCCESS`) — dispatched by thunk action creators in `packages/mattermost-redux/src/actions/channels.ts` around `Client4` API calls
> 2. **State mutation**: `RECEIVED_{NOUN}` / `{VERB}_{NOUN}` (e.g., `RECEIVED_CHANNEL`, `LEAVE_CHANNEL`, `DELETE_CHANNEL_SUCCESS`, `UPDATED_CHANNEL_HEADER`) — dispatched by WebSocket handlers in `actions/websocket_actions.jsx` via `import { ChannelTypes } from 'mattermost-redux/action_types'`
>
> The `action_types/index.ts` barrel file imports each module and re-exports as a named constant (`ChannelTypes`, `PostTypes`, `UserTypes`, etc.), providing the public API consumed throughout the app.
>
> The reducers that consume these types are in `packages/mattermost-redux/src/reducers/entities/channels.ts`, switching on these constants.

**Why this scores 5:** Every detail is verifiable: the `keyMirror` utility source, both naming patterns with correct examples, the exact import path used by consumers, the barrel file structure, and the reducer consumption path. No fabricated facts.

---

## Recall

### Recall — Score 1

**Example output excerpt:**
> WebSocket events are handled in `actions/websocket_actions.jsx`. The file imports from `mattermost-redux/action_types` and processes events like `posted` and `channel_created`.

**Why this scores 1:** The query asked to find all places where WebSocket event handlers are registered. The agent found only the main handler file and named only 2 events. The file handles dozens of events (post events, channel events, team events, user events, preference events, emoji events, plugin events, etc.). Also missed the plugin WebSocket event registration in `plugins/registry.js` via `registerPluginWebSocketEvent`.

### Recall — Score 2

**Example output excerpt:**
> WebSocket event handlers are registered in two main places:
> - `actions/websocket_actions.jsx`: The primary handler file. Handles `posted`, `post_edited`, `post_deleted`, `channel_created`, `channel_deleted`, `user_added`, `user_removed`, `typing`.
> - `client/web_websocket_client.jsx`: The WebSocket client that connects and dispatches events.

**Why this scores 2:** Found the two most obvious files. But the event list covers only ~8 of 40+ events handled. Missing entire event categories: team events, preference events, role events, emoji events, thread events, group events, plugin events, cloud events, sidebar category events. Also missed the plugin registry's ability to register custom WebSocket handlers.

### Recall — Score 3

**Example output excerpt:**
> WebSocket events are handled centrally in `actions/websocket_actions.jsx`. The file exports a `handleEvent` function that switches on event type. Key event categories:
> - **Post events**: `posted`, `post_edited`, `post_deleted`, `post_unread`
> - **Channel events**: `channel_created`, `channel_deleted`, `channel_updated`, `channel_member_updated`, `channel_converted`
> - **User events**: `user_added`, `user_removed`, `user_updated`, `user_role_updated`, `typing`, `status_change`
> - **Team events**: `added_to_team`, `leave_team`, `update_team`
>
> The WebSocket connection is managed by `client/web_websocket_client.jsx`. Plugins can register handlers via `plugins/registry.js` (`registerPluginWebSocketEvent`).

**Why this scores 3:** Found the main handler, the WebSocket client, and the plugin registry. Listed ~17 events across major categories. Missing: preference events, emoji events, role events, thread events, group events, cloud/hosted_customer events, apps events, sidebar category events. Substantially complete but gaps in secondary event types.

### Recall — Score 4

**Example output excerpt:**
> WebSocket handler registration is centralized in `actions/websocket_actions.jsx` which processes all standard events via a `handleEvent` dispatch function. Events include:
> - Post: `posted`, `post_edited`, `post_deleted`, `post_unread`, `ephemeral_message`
> - Channel: `channel_created`, `channel_deleted`, `channel_updated`, `channel_converted`, `channel_member_updated`, `direct_added`, `group_added`
> - User: `user_added`, `user_removed`, `user_updated`, `user_role_updated`, `memberrole_updated`, `status_change`, `typing`
> - Team: `added_to_team`, `leave_team`, `update_team`, `update_team_scheme`
> - Preferences: `preferences_changed`, `preferences_deleted`
> - Emoji: `emoji_added`
> - Roles: `role_updated`
> - Threads: `thread_updated`, `thread_follow_changed`, `thread_read_changed`
> - Plugins: `plugin_enabled`, `plugin_disabled`, `plugin_statuses_changed`
> - Sidebar: `sidebar_category_created`, `sidebar_category_updated`, `sidebar_category_deleted`, `sidebar_category_order_updated`
>
> Plugin-specific handlers: `plugins/registry.js` exports `registerPluginWebSocketEvent` / `unregisterPluginWebSocketEvent`.
>
> WebSocket client: `client/web_websocket_client.jsx` manages connection lifecycle.

**Why this scores 4:** Found nearly all event categories and the three key files. Minor omission: missing cloud/hosted_customer events (`subscription_changed`, etc.), group events, and apps framework events. These are secondary and do not materially change the answer.

### Recall — Score 5

**Example output excerpt:**
> WebSocket handler system spans three layers:
>
> 1. **Client layer**: `client/web_websocket_client.jsx` — manages WebSocket connection, reconnection, and raw message dispatch. Calls registered event handler callbacks.
>
> 2. **Core handler**: `actions/websocket_actions.jsx` — `handleEvent` function is the central dispatch. Handles all built-in event types organized by subsystem:
>    - Post: `posted`, `post_edited`, `post_deleted`, `post_unread`, `ephemeral_message`
>    - Channel: `channel_created`, `channel_deleted`, `channel_updated`, `channel_converted`, `channel_member_updated`, `direct_added`, `group_added`, `channel_scheme_updated`
>    - User: `user_added`, `user_removed`, `user_updated`, `user_role_updated`, `memberrole_updated`, `status_change`, `typing`, `hello`
>    - Team: `added_to_team`, `leave_team`, `update_team`, `update_team_scheme`, `delete_team`
>    - Preferences: `preferences_changed`, `preferences_deleted`
>    - Emoji: `emoji_added`
>    - Roles: `role_updated`
>    - Config: `config_changed`, `license_changed`
>    - Threads: `thread_updated`, `thread_follow_changed`, `thread_read_changed`
>    - Plugins: `plugin_enabled`, `plugin_disabled`, `plugin_statuses_changed`
>    - Sidebar categories: `sidebar_category_created`, `sidebar_category_updated`, `sidebar_category_deleted`, `sidebar_category_order_updated`
>    - Groups: `received_group`, `received_group_associated_to_team`, `received_group_not_associated_to_team`, `received_group_associated_to_channel`, `received_group_not_associated_to_channel`
>    - Cloud/billing: `subscription_changed`
>    - Apps: `apps_framework_refresh_bindings`
>    - Integration: `integration_updated`, `integration_deleted`
>
> 3. **Plugin extension layer**: `plugins/registry.js` — `registerPluginWebSocketEvent(eventName, handler)` / `unregisterPluginWebSocketEvent(eventName)` allow plugins to register custom handlers. Also: `registerPluginReconnectHandler` / `unregisterPluginReconnectHandler` for reconnection events.

**Why this scores 5:** Covers all three layers comprehensively. Lists event types across all categories including less obvious ones (groups, cloud, apps, integration). Identifies the plugin reconnect handler registration which is a secondary but real capability.

---

## Insight

### Insight — Score 1

**Example output excerpt:**
> The mattermost-webapp uses Redux for state management. Actions are in `packages/mattermost-redux/src/actions/` and `actions/`. Reducers are in `packages/mattermost-redux/src/reducers/`. Components connect to the store using `connect()` from `react-redux`.

**Why this scores 1:** Pure structural listing. No explanation of the two-layer architecture, the container/component pattern, the thunk middleware, the WebSocket integration, or how data flows through the system. Just states where things are without explaining relationships.

### Insight — Score 2

**Example output excerpt:**
> Mattermost-webapp uses a two-layer action system. The `packages/mattermost-redux` package provides reusable actions and reducers for the Mattermost data model — channels, posts, users, teams, etc. The `actions/` directory at the app root contains app-specific actions that orchestrate redux actions with UI concerns like navigation and notifications. Components use `connect()` to bind state and dispatch to props.

**Why this scores 2:** Identifies the two-layer structure (mattermost-redux vs app-level actions) which is an important relationship. But does not explain how they interact, what the thunk middleware does, how WebSocket events feed into the same Redux flow, or the container/component file organization pattern.

### Insight — Score 3

**Example output excerpt:**
> The mattermost-webapp follows a container/component pattern. Each component directory typically contains:
> - `index.ts`: the container that uses `connect()` to map state/dispatch to props
> - `component_name.tsx`: the presentational component
>
> The `packages/mattermost-redux` package is a standalone Redux module with its own `Client4` API client, actions (thunks that call API + dispatch), and reducers. App-level actions in `actions/` compose mattermost-redux actions with UI logic (e.g., `actions/global_actions.tsx` handles navigation after login).
>
> WebSocket events in `actions/websocket_actions.jsx` dispatch the same action types as API calls, so the reducers do not need to distinguish between data arriving from API responses vs real-time events.

**Why this scores 3:** Explains the container/component pattern, the mattermost-redux layer separation, and the key insight that WebSocket events reuse the same action types as API calls. Misses the `batchActions` optimization pattern (from `redux-batched-actions`), the reducer registry for dynamic plugin reducers, and the store persistence mechanism.

### Insight — Score 4

**Example output excerpt:**
> The data architecture has three key design patterns:
>
> 1. **Shared data layer (`packages/mattermost-redux`)**: Encapsulates the complete Mattermost data model. `Client4` (in `client/`) handles all API communication. Actions are thunks: `(dispatch, getState) => Promise<ActionResult>`. The `ActionResult` type standardizes success/error returns. Reducers are organized under `reducers/entities/` (channels, posts, users) and `reducers/requests/` (loading state tracking).
>
> 2. **App-level orchestration (`actions/`)**: Compose mattermost-redux actions with UI concerns. Example: `actions/global_actions.tsx` calls `redirectUserToDefaultTeam()` which reads Redux state, calls mattermost-redux team selectors, and uses `react-router` to navigate. `actions/websocket_actions.jsx` is the bridge between real-time events and Redux — it dispatches `mattermost-redux` action types directly (e.g., `dispatch({type: ChannelTypes.RECEIVED_CHANNEL, data: msg.data})`) so reducers handle both API and WebSocket data uniformly.
>
> 3. **Container/component binding**: Index files (`index.ts`) use `connect(mapStateToProps, mapDispatchToProps)` to bind the store. Selectors in `packages/mattermost-redux/src/selectors/entities/` use `reselect` for memoized derived state. Some newer components use `useSelector`/`useDispatch` hooks instead.

**Why this scores 4:** Traces the full data flow across three layers with concrete file references. Identifies the `ActionResult` pattern, the uniform API/WebSocket data handling, and the selector memoization. Misses the `batchActions` optimization in WebSocket handlers (which is a performance-critical pattern for avoiding multiple re-renders) and the reducer registry plugin system.

### Insight — Score 5

**Example output excerpt:**
> The mattermost-webapp data architecture reflects a key trade-off: `mattermost-redux` was designed as a shareable package (originally also used by mobile) which explains its separation from app-level code.
>
> 1. **Dual entry points for state mutations**: API responses and WebSocket events both dispatch the same action types (e.g., `ChannelTypes.RECEIVED_CHANNEL`). This is a deliberate design — `websocket_actions.jsx` imports from `mattermost-redux/action_types` and dispatches raw actions, while API-driven actions in `mattermost-redux/actions/channels.ts` wrap the same types in thunks. The reducers are source-agnostic.
>
> 2. **Batch dispatch optimization**: `websocket_actions.jsx` uses `batchActions()` from `redux-batched-actions` when a single WebSocket event requires multiple state updates (e.g., a new post triggers both `PostTypes.RECEIVED_POST` and `ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER` updates). Without batching, each dispatch would trigger a separate React re-render cycle.
>
> 3. **Dynamic reducer registration**: `packages/mattermost-redux/src/store/reducer_registry.ts` exposes `reducerRegistry` which plugins use to inject custom reducers at runtime (called from `plugins/registry.js`). This is how plugin state is integrated without modifying the core reducer tree.
>
> 4. **Selector architecture and the `getState` dependency**: Selectors in `mattermost-redux/selectors/entities/` use `reselect` for memoization, but many app-level actions call `getState()` directly in thunks and pass it to selectors — creating an implicit coupling where action logic depends on the global state shape. This is a known pattern trade-off: it enables rich orchestration (e.g., `websocket_actions.jsx` checking `isCollapsedThreadsEnabled` before deciding how to handle thread events) at the cost of tight coupling.
>
> 5. **Store persistence**: `stores/redux_store.jsx` configures the store. `stores/local_storage_store.ts` provides a separate persistence layer that syncs specific Redux state to localStorage (e.g., draft posts, recent emojis). This is distinct from the reducer state — it is a side-channel persistence mechanism.

**Why this scores 5:** Explains the historical motivation (shared mobile package), identifies the non-obvious batch dispatch optimization and its performance rationale, surfaces the dynamic reducer registry for plugins, and notes the dual persistence mechanism. Each insight explains WHY the code is structured this way, not just what it does.
