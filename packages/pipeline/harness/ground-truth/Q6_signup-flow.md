# Ground Truth: Q6 - What Happens When a User Signs Up?

## Query
"What happens when a user signs up? Trace the full flow."

## Category
Architecture

## Ideal Answer Summary
When a user signs up in the Mattermost webapp, the flow begins at the `/signup_user_complete` route defined in `components/root/root.tsx` (line 568), which renders the `Signup` component from `components/signup/signup.tsx` inside an `HFRoute` (Header/Footer Route wrapper). If the server has `NoAccounts` (first-ever user), `root.tsx` automatically redirects from `/` to `/signup_user_complete` (line 291). The `Signup` component is a functional React component that renders an email/username/password form and optional external login buttons (GitLab, Google, Office 365, OpenID, LDAP, SAML). On form submission, the `handleSubmit` function (line 513) first validates the user input via `isUserValid()` (line 458), which checks email format using `isEmail()` from `mattermost-redux/utils/helpers.ts`, username format using `isValidUsername()` from `utils/utils.tsx`, and password strength using `isValidPassword()` with server-configured password requirements. After validation, it dispatches the `createUser` Redux action from `packages/mattermost-redux/src/actions/users.ts` (line 51), which calls `Client4.createUser()` in `packages/client/src/client4.ts` (line 568), sending a POST to `/api/v4/users` with optional `t` (token), `iid` (invite ID), and `r` (redirect) query parameters. On success, the created user profile is stored in Redux via `RECEIVED_PROFILES`. The component then calls `handleSignupSuccess` (line 403), which dispatches `loginById` from `actions/views/login.ts` (line 48) to automatically log the user in via `Client4.loginById()`. If login returns a `not_verified` error, the user is redirected to `/should_verify_email`. Otherwise, `loadMe()` or `loadMeREST()` is dispatched to hydrate the Redux store, and the user is redirected to either a `redirect_to` URL, `/` (for use-case onboarding), or their default team via `redirectUserToDefaultTeam()`.

## Coverage Items

### Required-Easy (Baseline -- basic search should find these)

1. **Signup route and component mounting**: The signup route `/signup_user_complete` is defined in `root.tsx` and renders the `Signup` component from `components/signup/signup.tsx`. The component is wrapped in an `HFRoute` (Header/Footer Route) and is lazy-loaded.

2. **Form submission and validation (`handleSubmit` and `isUserValid`)**: The `handleSubmit` function in the Signup component calls `isUserValid()` before creating the user. Validation includes email format checking, username validation (length, characters, reserved names), and password strength validation against server-configured requirements.

3. **Redux `createUser` action and Client4 API call**: The `createUser` Redux action in `mattermost-redux/actions/users.ts` calls `Client4.createUser()`, which sends a POST to the users API endpoint. It supports optional parameters for email invite tokens and team invite IDs. On success, the user profile is stored in Redux.

4. **Post-signup success flow (`handleSignupSuccess`)**: After user creation, the Signup component auto-logs the user in via `loginById`, then hydrates the Redux store with `loadMe`. If email verification is required, the user is redirected to a verification page. Otherwise, the user is redirected to their default team or an onboarding flow.

### Required-Hard (Differentiation -- precise details)

1. **Signup route and component mounting**: The route `/signup_user_complete` is defined in `components/root/root.tsx` (line 568) as an `HFRoute` that renders the `Signup` component from `components/signup/signup.tsx`. The `HFRoute` wrapper (from `components/header_footer_route/header_footer_route.tsx`) wraps the signup component with a header, footer, and announcement bar. The `Signup` component is lazy-loaded via `React.lazy(() => import('components/signup/signup'))` at line 65 of `root.tsx`.

2. **Form submission and validation (`handleSubmit` and `isUserValid`)**: The `handleSubmit` function in `components/signup/signup.tsx` (line 513) calls `isUserValid()` (line 458) before creating the user. Validation includes: (a) email validation via `isEmail()` from `mattermost-redux/utils/helpers.ts` (line 103), which checks the regex `/^[^ ,@]+@[^ ,@]+$/`; (b) username validation via `isValidUsername()` from `utils/utils.tsx` (line 937), which checks length (3-22 chars), valid characters (`/^[a-z0-9.\-_]+$/`), lowercase first character, and reserved names; (c) password validation via `isValidPassword()` from `utils/utils.tsx` (line 1367), which checks against server-configured requirements (minimum length, lowercase, uppercase, number, symbol) obtained from `getPasswordConfig()` (line 1357).

3. **Redux `createUser` action and Client4 API call**: The `createUser` action in `packages/mattermost-redux/src/actions/users.ts` (line 51) takes `(user, token, inviteId, redirect)` parameters and calls `Client4.createUser()` in `packages/client/src/client4.ts` (line 568). The `Client4.createUser()` method sends a POST request to `${this.getUsersRoute()}` (i.e., `/api/v4/users`) with the user object as the body and optional query parameters `t` (email invite token), `iid` (team invite ID), and `r` (redirect URL). On success, it dispatches `UserTypes.RECEIVED_PROFILES` with the created user profile. On error, it calls `forceLogoutIfNecessary()` and dispatches `logError()`.

4. **Post-signup success flow (`handleSignupSuccess`)**: The `handleSignupSuccess` function in `components/signup/signup.tsx` (line 403) handles the post-creation flow: (a) tracks the `signup_user_02_complete` telemetry event; (b) dispatches `loginById(data.id, user.password)` from `actions/views/login.ts` (line 48) to auto-login the user, which calls `Client4.loginById()` (POST to `/api/v4/users/login`) and dispatches `LOGIN_SUCCESS` and `RECEIVED_ME`; (c) if login returns `api.user.login.not_verified.app_error`, redirects to `/should_verify_email?email=...`; (d) on successful login, dispatches `loadMe()` (GraphQL) or `loadMeREST()` to hydrate the full user state; (e) redirects to `redirect_to` param, `/` (for use-case onboarding), or calls `redirectUserToDefaultTeam()` from `actions/global_actions.tsx` (line 349).

### Expected (Should Find - Comprehensive Answer)

1. **External/OAuth signup options**: The `getExternalSignupOptions()` function in `components/signup/signup.tsx` (line 144) builds an array of `ExternalLoginButtonType` objects based on server config flags. Supported providers are: GitLab (`EnableSignUpWithGitLab`, URL: `/oauth/gitlab/signup`), Google (`EnableSignUpWithGoogle`, requires license), Office 365 (`EnableSignUpWithOffice365`, requires license), OpenID (`EnableSignUpWithOpenId`, requires license), LDAP (`EnableLdap`, redirects to `/login?extra=create_ldap`), and SAML (`EnableSaml`, redirects to `/login/sso/saml?action=signup`). Each is rendered as an `ExternalLoginButton` component from `components/external_login_button/external_login_button.tsx`, which is a simple anchor link.

2. **Email verification flow**: When email verification is required, `loginById` returns the error `api.user.login.not_verified.app_error`, and `handleSignupSuccess` redirects to `/should_verify_email?email=...`. The `ShouldVerifyEmail` component at `components/should_verify_email/should_verify_email.tsx` displays a "You're almost done!" message and a "Resend Email" button that dispatches `sendVerificationEmail(email)` from `packages/mattermost-redux/src/actions/users.ts` (line 1133). When the user clicks the verification link in their email, they hit the `/do_verify_email` route, handled by `DoVerifyEmail` at `components/do_verify_email/do_verify_email.tsx`, which dispatches `verifyUserEmail(token)` (line 1124 of users.ts) and then redirects to `/login?extra=SIGNIN_VERIFIED` (if not logged in) or calls `redirectUserToDefaultTeam()` (if logged in).

3. **Invite-based and token-based signup**: The `Signup` component reads `t` (token), `id` (inviteId), and `d` (data) from URL query parameters (lines 71-75). If `inviteId` is present, `getInviteInfo(inviteId)` (line 250) dispatches `getTeamInviteInfo()` to fetch and display the team name. If the user is already logged in with a token/inviteId, `handleAddUserToTeamFromInvite()` (line 240) dispatches `addUserToTeamFromInvite(token, inviteId)` from `actions/team_actions.ts` (line 31), which calls `TeamActions.addUserToTeamFromInvite()` from `packages/mattermost-redux/src/actions/teams.ts` (line 462) using `Client4.addToTeamFromInvite()`, then redirects to `/{team.name}/channels/town-square`.

4. **Access control for signup**: The `Signup` component checks `noOpenServer` (line 123): if there is no invite token, no invite ID, `EnableOpenServer` is `false`, and `NoAccounts` is `false`, the signup form is not rendered. Instead, a "This server doesn't allow open signups" message is shown (line 564). Additionally, if `usedBefore` is truthy (the invite token was already used, tracked via `getGlobalItem` in localStorage), the "This invite link is invalid" message is displayed.

5. **First admin auto-redirect to signup**: In `components/root/root.tsx`, the `componentDidMount` (line 291) and `componentDidUpdate` (line 338) methods check if the current path is `/` and `noAccounts` is true (from `config.NoAccounts`), and if so, automatically redirect to `/signup_user_complete`. This ensures the first user to visit a fresh Mattermost installation is immediately taken to the signup page.

### Bonus (Extra Credit - Expert Answer)

1. **First admin onboarding flow (`preparing-workspace`)**: After signup and login, if the user is the first system admin and use-case onboarding is enabled, `root.tsx`'s `redirectToOnboardingOrDefaultTeam()` method (line 353) checks `isCurrentUserSystemAdmin`, `getUseCaseOnboarding`, and `getFirstAdminSetupComplete`. If the admin has not completed setup, they are redirected to `/preparing-workspace` (line 387), which renders the `PreparingWorkspace` component (lazy-loaded from `components/preparing_workspace`). Non-admin users are sent directly to `redirectUserToDefaultTeam()`.

2. **`redirectUserToDefaultTeam` implementation**: The `redirectUserToDefaultTeam()` function in `actions/global_actions.tsx` (line 349) loads the user if needed (via `loadMe()` or `loadMeREST()`), then checks for a previously visited team from `LocalStorageStore.getPreviousTeamId(user.id)`. If the user has no teams, they are redirected to `/select_team`. Otherwise, they are redirected to their last visited team and channel.

3. **Telemetry tracking throughout signup**: The signup flow tracks multiple telemetry events: `signup_user_01_welcome` on component mount (line 284), `click_create_account` on form submission (line 515), `signup_user_02_complete` on successful creation (line 404), and optionally `signup_from_reminder_{interval}` if the user came from a reminder link (line 407). The `should_verify_email` event is tracked when the verification page is shown, and `do_verify_email` when the verification link is clicked.

## Accuracy Markers

### Must Be Correct

1. **Route path**: The signup route must be identified as `/signup_user_complete` (NOT `/signup` or `/register`). It must be in `components/root/root.tsx`.

2. **Signup component location**: Must be `components/signup/signup.tsx`. It is a functional component (React hooks-based), NOT a class component.

3. **API endpoint**: The user creation API call must be identified as `Client4.createUser()` which POSTs to `/api/v4/users` (the users route). Must NOT be described as a GraphQL mutation or any other endpoint.

4. **Post-creation auto-login**: After `createUser` succeeds, the user is automatically logged in via `loginById()` (NOT `login()` by username/password). This is in `actions/views/login.ts`, NOT in `mattermost-redux/actions/users.ts`.

5. **Validation functions location**: `isUserValid()` is local to the `Signup` component. It calls `isEmail()` from `mattermost-redux/utils/helpers.ts`, `isValidUsername()` from `utils/utils.tsx`, and `isValidPassword()` from `utils/utils.tsx`.

### Common Mistakes

1. **Confusing signup with login flow** (Type: factual_error): The signup component dispatches `createUser` first, then `loginById`. An agent might describe only the login flow or confuse the order of operations. The correct sequence is: validate -> createUser -> loginById -> loadMe -> redirect.

2. **Missing the email verification branch** (Type: factual_error): After `loginById`, if the server requires email verification, the login returns a `not_verified` error and the user is redirected to `/should_verify_email`. An agent might describe only the happy path and miss this important branch.

3. **Describing OAuth signup as part of the form submit flow** (Type: factual_error): OAuth/LDAP/SAML signups do NOT go through `handleSubmit`. They are simple anchor links (`<a href="...">`) that navigate to server-side OAuth endpoints (e.g., `/oauth/gitlab/signup`). An agent might incorrectly describe them as being handled by the same Redux action flow.

4. **Wrong route path** (Type: factual_error): The route is `/signup_user_complete`, not `/signup`. An agent searching for just "signup" in routes might miss this or invent a different path.

## Coverage Topics

1. Signup route and component mounting: The signup page is served at a specific route in the root component, rendering a dedicated Signup component inside a header/footer wrapper that is lazy-loaded.

2. Form submission and validation: The signup form's submit handler performs client-side validation including email format checking, username validation (length, characters, reserved names), and password strength validation against server-configured requirements.

3. Redux createUser action and Client4 API call: A Redux action dispatches a user creation request through Client4 to the server's users API endpoint, supporting optional invite tokens and team invite IDs, and stores the resulting profile in Redux on success.

4. Post-signup success flow: After successful user creation, the component auto-logs the user in, hydrates the Redux store with user data, and redirects to either a verification page (if email verification is required), an onboarding flow, or the user's default team.

## Expected Scores (from Manual Olympics)

| Agent | Coverage | Accuracy | Notes |
|-------|----------|----------|-------|
| Explore | 3/3 | 3/3 | Scored 11/12 in R6 (3 Speed, 3 Coverage, 3 Accuracy, 2 Efficiency). Strong at flow tracing. Found full sequential flow from route to form to API to redirect. |
| Maproom | 3/3 | 3/3 | Scored 10/12 in R6 (2 Speed, 3 Coverage, 3 Accuracy, 2 Efficiency). Same complete flow traced but slower on this architecture query. |
