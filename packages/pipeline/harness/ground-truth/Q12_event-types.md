# Ground Truth: Q12 - Event Types Emitted in the Codebase

## Query
"Find all event types/names that are emitted in this codebase"

## Category
Symbol-level (massive enumeration)

## Ideal Answer Summary
The Mattermost webapp emits events across five major categories: (1) **WebSocket events** -- 75 event types defined in `utils/constants.tsx` as `SocketEvents` and 52 in `packages/mattermost-redux/src/constants/websocket.ts` as `WebsocketEvents`, covering real-time server push events like `posted`, `channel_deleted`, `typing`, and `status_change`; (2) **Redux action types** -- 500 action types across 28 files in `packages/mattermost-redux/src/action_types/` (e.g., `PostTypes`, `ChannelTypes`, `UserTypes`) plus ~99 webapp-specific action types in `utils/constants.tsx` as `ActionTypes`; (3) **Telemetry/analytics events** -- ~269 unique `trackEvent(category, event)` calls sent via RudderStack through `Client4.trackEvent()`, spanning categories like `api` (113 events), `ui` (47), `insights` (26), `cloud_admin` (19), plus `pageVisited()` calls for page view tracking; (4) **Custom DOM events** -- accessibility events (`A11yCustomEventTypes`: `a11yactivate`, `a11ydeactivate`, `a11yupdate`, `a11yfocus`), drag-and-drop events (`dragster:enter`, `dragster:leave`, `dragster:over`, `dragster:drop`), and an `AppEvents.FOCUS_EDIT_TEXTBOX` custom event; (5) **Plugin WebSocket events** -- plugins register custom event handlers via `PluginRegistry.registerWebSocketEventHandler()`, which uses the `custom_<pluginid>_` prefix convention for plugin-specific WebSocket events.

## Coverage Items

### Required-Easy (Baseline -- basic search should find these)

1. **WebSocket/Socket events (`SocketEvents` constant)**: The `SocketEvents` constant in `utils/constants.tsx` defines WebSocket event type constants for real-time server-push events (e.g., posted, channel deleted, typing, status change). These events are handled in the `handleEvent()` switch statement in `actions/websocket_actions.jsx`.

2. **Redux action types (`mattermost-redux` action types)**: Redux action type constants are defined across multiple files in `packages/mattermost-redux/src/action_types/`, covering channels, users, posts, teams, admin, and other domains. They are exported as grouped constants (e.g., `ChannelTypes`, `PostTypes`, `UserTypes`) and use `keyMirror()` for string-keyed constants.

3. **Telemetry/analytics events (`trackEvent` calls)**: The codebase uses `trackEvent(category, event)` calls across many files to send analytics events. The `trackEvent` function in `actions/telemetry_actions.jsx` delegates to `Client4.trackEvent()`, which sends events to RudderStack via the `RudderTelemetryHandler`. Major categories include `api`, `ui`, `insights`, `cloud_admin`, `signup`, and `settings`.

4. **Webapp-specific action types (`ActionTypes` in constants.tsx)**: The `ActionTypes` object in `utils/constants.tsx` contains webapp-specific Redux action type constants for UI state management (RHS state, modals, sidebar, navigation, plugin UI components). These are distinct from the `mattermost-redux` action types.

### Required-Hard (Differentiation -- precise details)

1. **WebSocket/Socket events (`SocketEvents` constant)**: Defined in `utils/constants.tsx` (lines 571-647) as the `SocketEvents` object with 75 named event type constants. These are real-time server-push events received via WebSocket connection. Examples include `POSTED` (`'posted'`), `POST_EDITED` (`'post_edited'`), `CHANNEL_DELETED` (`'channel_deleted'`), `TYPING` (`'typing'`), `STATUS_CHANGED` (`'status_change'`), `REACTION_ADDED` (`'reaction_added'`), `THREAD_UPDATED` (`'thread_updated'`), `DRAFT_CREATED` (`'draft_created'`). All 75 events are handled in the `handleEvent()` switch statement in `actions/websocket_actions.jsx` (lines 324-598).

2. **Redux action types (`mattermost-redux` action types)**: Defined across 28 files in `packages/mattermost-redux/src/action_types/`, totaling 500 action type constants. Exported via `packages/mattermost-redux/src/action_types/index.ts` as named exports (`ChannelTypes`, `PostTypes`, `UserTypes`, `TeamTypes`, `AdminTypes`, `GeneralTypes`, etc.). The largest files are `channels.ts` (68 types), `users.ts` (58 types), `admin.ts` (47 types), `teams.ts` (44 types), and `posts.ts` (43 types). Each file uses `keyMirror()` to create string-keyed constants (e.g., `PostTypes.CREATE_POST_REQUEST`, `ChannelTypes.RECEIVED_CHANNEL`).

3. **Telemetry/analytics events (`trackEvent` calls)**: The codebase contains 269 unique `trackEvent(category, event)` call signatures across 165 files. The `trackEvent` function is defined in `actions/telemetry_actions.jsx` (line 33), which delegates to `Client4.trackEvent()` in `packages/client/src/client4.ts` (line 4191), which calls `this.telemetryHandler.trackEvent()`. The telemetry handler implementation is `RudderTelemetryHandler` in `packages/mattermost-redux/src/client/rudder.ts`, which sends events to RudderStack (analytics platform). The top telemetry categories by event count are: `api` (113 events like `api_users_login`, `api_posts_create`), `ui` (47 events like `ui_sidebar_channel_menu_leave`), `insights` (26 events), `cloud_admin` (19 events), `signup` (14 events), `settings` (12 events), `admin` (11 events), `action` (10 events like `action_channels_join`).

4. **Webapp-specific action types (`ActionTypes` in constants.tsx)**: Defined in `utils/constants.tsx` (lines 205-337) as the `ActionTypes` object created with `keyMirror()`, containing 99 webapp-specific Redux action type constants for UI state management. Examples include `SET_PRODUCT_SWITCHER_OPEN`, `UPDATE_RHS_STATE`, `TOGGLE_LHS`, `MODAL_OPEN`, `MODAL_CLOSE`, `BROWSER_CHANGE_FOCUS`, `RECEIVED_PLUGIN_COMPONENT`, `SIDEBAR_DRAGGING_SET_STATE`. These are distinct from the `mattermost-redux` action types and handle webapp-only concerns (RHS state, modals, sidebar, navigation, plugin UI components).

### Expected (Should Find - Comprehensive Answer)

1. **`WebsocketEvents` constant in mattermost-redux**: A second, partially overlapping WebSocket event constant object defined in `packages/mattermost-redux/src/constants/websocket.ts` (lines 4-57) with 52 entries. This is the mattermost-redux internal version, exported as the default export and re-exported from `packages/mattermost-redux/src/constants/index.ts`. It overlaps significantly with `SocketEvents` from `utils/constants.tsx` but has fewer entries (52 vs 75) -- the webapp's `SocketEvents` includes additional events like `GROUP_ADDED`, `NEW_USER`, `JOIN_TEAM`, `DELETE_TEAM`, `PLUGIN_ENABLED`, `PLUGIN_DISABLED`, sidebar category events, cloud events, draft events, and app framework events not present in the redux version.

2. **Custom DOM events -- accessibility (`A11yCustomEventTypes`)**: Defined in `utils/constants.tsx` (lines 551-556) with 4 custom event types: `ACTIVATE` (`'a11yactivate'`), `DEACTIVATE` (`'a11ydeactivate'`), `UPDATE` (`'a11yupdate'`), `FOCUS` (`'a11yfocus'`). These are dispatched as `CustomEvent` objects via `document.dispatchEvent()` throughout the codebase (11 dispatch sites across components like `profile_popover.tsx`, `custom_status_modal.tsx`, `suggestion_box.jsx`, `at_mention_group.tsx`). They are consumed by the `a11y_controller.ts` accessibility manager in `utils/a11y_controller.ts`.

3. **`pageVisited` telemetry events**: In addition to `trackEvent`, the codebase uses `pageVisited(category, name)` for page-view analytics. Defined in `actions/telemetry_actions.jsx` (line 50), delegating to `Client4.pageVisited()` in `packages/client/src/client4.ts` (line 4197), which calls `rudderAnalytics.page()`. Used across ~12 call sites for tracking admin console page views (`cloud_admin` category), purchase flows, and onboarding (`first_admin_setup`).

4. **Custom EventEmitter events**: The codebase includes a custom `EventEmitter` class at `packages/mattermost-redux/src/utils/event_emitter.ts` that provides `emit(label)`, `on(label)`, and `off(label)` methods. It is used in `actions/views/channel.ts` (line 496) to emit `EventTypes.POST_LIST_SCROLL_TO_BOTTOM` and in `packages/mattermost-redux/src/actions/teams.ts` (line 263) to emit `'leave_team'`. These are in-app events (not browser DOM events) for decoupled component communication.

5. **Plugin WebSocket event handler registration**: Plugins register handlers for WebSocket events via `PluginRegistry.registerWebSocketEventHandler(event, handler)` defined in `plugins/registry.ts` (lines 691-699). This calls `registerPluginWebSocketEvent(pluginId, event, handler)` in `actions/websocket_actions.jsx` (line 281), which stores handlers in a `pluginEventHandlers` map. Plugin-specific events follow the `custom_<pluginid>_` naming convention (documented in the registry comment at line 694). After the main `handleEvent` switch statement processes standard events, all registered plugin handlers are invoked (lines 590-598).

### Bonus (Extra Credit - Expert Answer)

1. **Custom drag-and-drop events (`dragster` utility)**: The `utils/dragster.ts` utility (lines 1-97) creates and dispatches custom DOM events for drag-and-drop: `dragster:enter`, `dragster:leave`, `dragster:over`, and `dragster:drop`. These are `CustomEvent` objects dispatched via `node.dispatchEvent()` with the original DOM drag event wrapped in the `detail` property. This normalizes browser drag events to handle the nested dragenter/dragleave problem.

2. **`AppEvents` custom events**: Defined in `utils/constants.tsx` (line 567-569) with a single event: `FOCUS_EDIT_TEXTBOX` (`'focus_edit_textbox'`). This is a named application-level event constant used for dispatching focus actions to edit textbox components.

3. **Apps Framework custom WebSocket events**: Three special WebSocket events in `SocketEvents` use the `custom_com.mattermost.apps_` prefix: `APPS_FRAMEWORK_REFRESH_BINDINGS` (`'custom_com.mattermost.apps_refresh_bindings'`), `APPS_FRAMEWORK_PLUGIN_ENABLED` (`'custom_com.mattermost.apps_plugin_enabled'`), `APPS_FRAMEWORK_PLUGIN_DISABLED` (`'custom_com.mattermost.apps_plugin_disabled'`). These demonstrate the plugin event naming convention (`custom_<pluginid>_<event>`) used by the built-in Apps framework plugin.

## Accuracy Markers

### Must Be Correct

1. **WebSocket event counts and locations**: The webapp defines WebSocket events in TWO places: `SocketEvents` in `utils/constants.tsx` (75 entries) and `WebsocketEvents` in `packages/mattermost-redux/src/constants/websocket.ts` (52 entries). The `SocketEvents` version is the more complete one used by the webapp's `handleEvent()` in `actions/websocket_actions.jsx`. An accurate answer must identify at least one of these locations with an approximately correct count.

2. **Redux action type count and location**: There are exactly 500 action type constants across 28 files in `packages/mattermost-redux/src/action_types/`, plus 99 webapp-specific action types in `utils/constants.tsx` `ActionTypes`. The total is approximately 600. An accurate answer must identify the `packages/mattermost-redux/src/action_types/` directory as the primary location and provide a count in the 400-600 range.

3. **Telemetry mechanism**: Telemetry events are sent via `trackEvent(category, event, props)` in `actions/telemetry_actions.jsx`, which calls `Client4.trackEvent()`, which delegates to a `TelemetryHandler` implementation (`RudderTelemetryHandler` using RudderStack/Rudder SDK). An accurate answer must identify `trackEvent` as the primary telemetry function and note it uses an analytics platform (RudderStack/Segment/Rudder).

### Common Mistakes

1. **Conflating `SocketEvents` and `WebsocketEvents`** (Type: terminological_imprecision): The webapp has TWO WebSocket event constant objects that are similar but not identical. `SocketEvents` (in `utils/constants.tsx`, 75 entries) is the webapp's version with more events. `WebsocketEvents` (in `packages/mattermost-redux/src/constants/websocket.ts`, 52 entries) is the mattermost-redux version. An agent might report only one, or report the count from one while citing the file of the other.

2. **Underreporting event categories** (Type: factual_error): Some agents may focus only on WebSocket events and Redux actions while missing telemetry events (269 unique calls), custom DOM events (a11y events, dragster events), or the EventEmitter-based events. A complete answer should identify at least 4 distinct event emission mechanisms.

3. **Claiming ~57 WebSocket events when there are 75 (SocketEvents) or 52 (WebsocketEvents)** (Type: factual_error): The maproom-agent-spec.md hint of "57 WebSocket events" likely refers to an earlier codebase version or only the `WebsocketEvents` constant (52 entries, close to 57 with slight variation). The current `SocketEvents` has 75 entries. An agent reporting exactly 57 is likely parroting cached data rather than counting.

4. **Missing the webapp's own `ActionTypes`** (Type: factual_error): The 99 action types in `utils/constants.tsx` `ActionTypes` (for UI state like RHS, modals, sidebar) are separate from the 500 action types in `mattermost-redux`. An agent might count only the mattermost-redux actions and miss the webapp-specific ones.

## Coverage Topics

1. WebSocket/Socket events (SocketEvents constant): A constants object defines WebSocket event type constants for real-time server-push events (posted, channel deleted, typing, status change, etc.), handled in a central event dispatch switch statement.

2. Redux action types (mattermost-redux action types): Redux action type constants are defined across many files in the mattermost-redux action types directory, covering channels, users, posts, teams, admin, and other domains, exported as grouped constants using keyMirror.

3. Telemetry/analytics events (trackEvent calls): The codebase uses trackEvent calls across many files to send analytics events via a telemetry handler that delegates to RudderStack. Major categories include api, ui, insights, cloud admin, signup, and settings.

4. Webapp-specific action types (ActionTypes in constants): A separate set of webapp-specific Redux action type constants handles UI state management concerns like RHS state, modals, sidebar, navigation, and plugin UI components, distinct from the mattermost-redux action types.

## Expected Scores (from Manual Olympics)

| Agent | Coverage | Accuracy | Notes |
|-------|----------|----------|-------|
| Maproom | 3/3 | 2/3 | Scored 9/12 in R12. Identified major categories (WebSocket ~57, Redux 500+, telemetry 200+). Good categorization but count accuracy issues. Used 49 tool calls. |
| Explore | 3/3 | 2/3 | Scored 10/12 in R12. Found major categories. Slightly better accuracy or coverage detail but used more calls (83). |
