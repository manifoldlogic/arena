# Calibration Round 2 — mattermost-webapp (Hard)

This is a pre-scored calibration round. The judge must score the competitor output below and match the official scores within 1 point on each dimension before proceeding. This round deliberately includes incomplete recall — the competitor missed important locations.

---

**Query:** mattermost-flow-tracing-2 (hard)
> Trace the full login flow in mattermost-webapp. Start from the login page component, through form submission, API call, token storage, WebSocket connection establishment, and redirect to the main view.

**Competitor output (excerpt):**

> The login flow starts at `components/login/login.tsx`, which renders the login form with username and password inputs.
>
> 1. **Form submission**: When the user submits, the component calls the `login` action imported from `actions/views/login.ts`. This action takes credentials (loginId, password) and dispatches to `mattermost-redux`.
>
> 2. **API call**: The `login` action calls `Client4.login()` from `packages/mattermost-redux/src/client/client4.ts`. Client4 makes a POST request to `/api/v4/users/login`. On success, the server returns a user object and sets authentication cookies.
>
> 3. **Token storage**: The auth token is stored in-memory on the `Client4` instance (`Client4.token`). The CSRF token is extracted from the `MMCSRF` cookie by the browser. `Client4` reads this cookie and includes it in the `X-CSRF-Token` header on subsequent requests.
>
> 4. **Post-login loading**: After successful login, `loadMe()` from `mattermost-redux/actions/users` is called to fetch the current user's full profile, preferences, and team memberships.
>
> 5. **Redirect**: The component calls `redirectUserToDefaultTeam()` from `actions/global_actions.tsx`, which determines the user's default team and navigates to it using `react-router`.
>
> The login page also handles external auth methods (GitLab, Google, Office 365, SAML) via `ExternalLoginButton` components that redirect to the server's OAuth endpoints.

**Official scores:** Precision: 4, Recall: 3, Insight: 3

**Scoring rationale:**

- **Precision: 4** — The flow described is accurate: `components/login/login.tsx` -> `actions/views/login.ts` -> `Client4.login()` -> `/api/v4/users/login`. Token storage on `Client4.token` is correct. The CSRF cookie/header mechanism is correct. `loadMe()` and `redirectUserToDefaultTeam()` are real functions in the correct files. The external auth buttons are mentioned accurately. Minor imprecision: the component also handles GraphQL-based login via `loadMeREST` vs `loadMe` depending on `isGraphQLEnabled`, which the agent does not distinguish.

- **Recall: 3** — Covers the main flow from form through API to redirect. Missing critical pieces the query explicitly asked about: (a) **WebSocket connection establishment** — the query specifically asks about this, but the agent did not trace how `LoggedIn` component (`components/logged_in/logged_in.tsx`) initializes `WebSocketClient` via `WebSocketActions.initialize()` from `actions/websocket_actions.jsx`, which connects to `client/web_websocket_client.jsx`; (b) **The `LoggedIn` component** as the authenticated route guard that wraps the main app and triggers post-login initialization; (c) `LocalStorageStore` persistence of login state. The core login path is present but the WebSocket establishment (explicitly requested) is absent.

- **Insight: 3** — Explains the sequential flow and mentions the multi-auth-method pattern. Does not explain: the architectural split between the login page (unauthenticated route) and the `LoggedIn` wrapper (authenticated gate) — this is a key design pattern where route-level authorization is handled by component composition rather than middleware. Does not note the in-memory vs cookie token distinction and why the CSRF double-submit pattern is used. Traces the main flow but misses the design reasoning.
