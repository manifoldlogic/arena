# Ground Truth: Q4 - How Are Environment Variables Loaded and Validated?

## Query
"How are environment variables loaded and validated?"

## Category
Conceptual

## Ideal Answer Summary
Environment variables in the Mattermost webapp operate at two distinct levels: build-time injection via Webpack and runtime configuration via the server API. At build time, `webpack.config.js` uses three `webpack.DefinePlugin` instances to inject global constants: `COMMIT_HASH` (from `git rev-parse HEAD`), `REMOTE_CONTAINERS` (module federation remotes), and a `process.env` object containing `PUBLIC_PATH`, `NODE_ENV`, `RUDDER_KEY`, and `RUDDER_DATAPLANE_URL`. The `webpack.ProvidePlugin` polyfills `process` with `process/browser` so that `process.env` references work in browser code. Webpack also reads build-configuration env vars like `MM_SERVICESETTINGS_SITEURL`, `MM_BOARDS_DEV_SERVER_URL`, `MM_DONT_INCLUDE_PRODUCTS`, `MM_LIVE_RELOAD`, and `PRODUCTION_PERF_DEBUG` to control dev server proxy targets, module federation, live reload, and React profiler support. At runtime, the server's client config is fetched via `Client4.getClientConfigOld()` (hitting `/api/v4/config/client?format=old`) in `packages/mattermost-redux/src/actions/general.ts`, dispatched as `CLIENT_CONFIG_RECEIVED`, and stored at `state.entities.general.config`. The `root.tsx` entry point uses `process.env.PUBLIC_PATH` (injected by DefinePlugin in dev) with a fallback to `window.publicPath` (set by the server in production via `root.html`) to configure `__webpack_public_path__`. There is no dotenv usage in the webapp itself; dotenv is only used in the E2E test frameworks (Playwright and Cypress).

## Coverage Items

### Required-Easy (Baseline -- basic search should find these)

1. **Webpack `DefinePlugin` for `process.env` injection**: Webpack `DefinePlugin` is used in `webpack.config.js` to inject a `process.env` object into the bundle at build time. The injected variables differ between development and production modes, and include keys like `PUBLIC_PATH`, `NODE_ENV`, `RUDDER_KEY`, and `RUDDER_DATAPLANE_URL`.

2. **Webpack `DefinePlugin` for `COMMIT_HASH` and `REMOTE_CONTAINERS`**: Webpack `DefinePlugin` in `webpack.config.js` also injects `COMMIT_HASH` (from a git command) and `REMOTE_CONTAINERS` (for module federation) as global constants. Both have TypeScript declarations in the `types/` directory.

3. **Runtime config via `getClientConfig` action**: The `getClientConfig` action in `mattermost-redux/actions/general.ts` fetches server configuration via a Client4 API call to the config endpoint, dispatches it to the Redux store, and stores it at `state.entities.general.config`. A `getConfig` selector provides access to this config.

4. **`root.tsx` entry point `PUBLIC_PATH` / `window.publicPath` bridge**: The `root.tsx` entry point bridges build-time and runtime configuration by using `process.env.PUBLIC_PATH` (from DefinePlugin in dev) with a fallback to `window.publicPath` (set by the server in production) to configure webpack's public path. `window.basename` is derived from `window.publicPath`.

### Required-Hard (Differentiation -- precise details)

1. **Webpack `DefinePlugin` for `process.env` injection**: In `webpack.config.js` (lines 483-499), an `env` object is constructed and injected via `new webpack.DefinePlugin({'process.env': env})`. In development mode (`DEV`), this includes `PUBLIC_PATH`, `RUDDER_KEY`, and `RUDDER_DATAPLANE_URL`. In production mode, it includes `NODE_ENV` (set to `'production'`), `RUDDER_KEY`, and `RUDDER_DATAPLANE_URL`. The `RUDDER_KEY` and `RUDDER_DATAPLANE_URL` values are read from the real `process.env` at build time and JSON-stringified.

2. **Webpack `DefinePlugin` for `COMMIT_HASH` and `REMOTE_CONTAINERS`**: In `webpack.config.js` (line 175-177), `COMMIT_HASH` is defined as `JSON.stringify(childProcess.execSync('git rev-parse HEAD || echo dev').toString())`. In the `initializeModuleFederation` function (line 468-470), `REMOTE_CONTAINERS` is defined as `JSON.stringify(remotes)`. Both are declared as global constants in `types/global.d.ts` (line 4: `declare const COMMIT_HASH: string`) and `types/products.d.ts` (line 4: `declare const REMOTE_CONTAINERS: Record<string, string>`).

3. **Runtime config via `getClientConfig` action**: In `packages/mattermost-redux/src/actions/general.ts` (line 52-68), the `getClientConfig` function fetches server configuration via `Client4.getClientConfigOld()` (which calls `GET /api/v4/config/client?format=old` as defined in `packages/client/src/client4.ts` line 2488), then dispatches `GeneralTypes.CLIENT_CONFIG_RECEIVED`. The reducer in `packages/mattermost-redux/src/reducers/entities/general.ts` (lines 10-23) stores this in `state.entities.general.config`. The `getConfig` selector in `packages/mattermost-redux/src/selectors/entities/general.ts` (line 13) reads `state.entities.general.config`.

4. **`root.tsx` entry point `PUBLIC_PATH` / `window.publicPath` bridge**: In `root.tsx` (lines 8-15), the entry point sets `window.publicPath = process.env.PUBLIC_PATH || window.publicPath || '/static/'` and then `__webpack_public_path__ = window.publicPath`. In development, `process.env.PUBLIC_PATH` is injected by DefinePlugin. In production, `window.publicPath` is set by the Mattermost server when serving `root.html` (the server rewrites the HTML to inject the configured `SiteURL` subpath). `window.basename` is derived from `window.publicPath`.

### Expected (Should Find - Comprehensive Answer)

1. **Webpack build-configuration env vars consumed at build time**: `webpack.config.js` reads several env vars that control the build itself (not injected into the bundle): `MM_SERVICESETTINGS_SITEURL` (line 47, 511: sets `publicPath` in dev and dev-server proxy target), `MM_BOARDS_DEV_SERVER_URL` (line 37: boards dev server URL, defaults to `http://localhost:9006`), `MM_DONT_INCLUDE_PRODUCTS` (line 372: skips module federation product registration), `MM_LIVE_RELOAD` (line 488: enables `LiveReloadPlugin` in dev), `PRODUCTION_PERF_DEBUG` (line 558: enables React profiler in production builds), and `npm_lifecycle_event` / `VSCODE_CWD` (lines 27, 33: determine build target mode).

2. **`webpack.ProvidePlugin` for `process` polyfill**: In `webpack.config.js` (lines 172-174), `new webpack.ProvidePlugin({process: 'process/browser'})` makes a browser-compatible `process` global available throughout the bundle. This is necessary because the webapp targets browsers (`target: 'web'` on line 170) where `process` does not natively exist. Without this polyfill, `process.env` references in the source code would fail at runtime.

3. **`process.env.NODE_ENV` consumption in application code**: `process.env.NODE_ENV` (injected by DefinePlugin as `'production'` in production builds, left as-is in dev via the `process/browser` polyfill) is used in: `packages/mattermost-redux/src/store/helpers.ts` (line 24: skips `deepFreezeAndThrowOnMutation` in production) and `stores/redux_store.jsx` (line 12: exposes `window.store` in non-production or on community.mattermost.com).

4. **`RUDDER_KEY` / `RUDDER_DATAPLANE_URL` telemetry env vars**: These env vars are read from the build environment in `webpack.config.js` (lines 486-487, 493-494) and injected via DefinePlugin into `process.env`. They are consumed in `components/root/root.tsx` (lines 239-240) in the `onConfigLoaded` method as a fallback when the hardcoded `TELEMETRY_RUDDER_KEY` and `TELEMETRY_RUDDER_DATAPLANE_URL` constants start with `'placeholder'`.

5. **`loadConfigAndMe` orchestration**: In `actions/views/root.ts` (lines 19-41), the `loadConfigAndMe` function calls `dispatch(getClientConfig())` and `dispatch(getLicenseConfig())` in parallel via `Promise.all`, then uses the returned `clientConfig.FeatureFlagGraphQL` to decide whether to call `loadMe` (GraphQL) or `loadMeREST`. This is the primary entry point where runtime config is fetched on app initialization.

### Bonus (Extra Credit - Expert Answer)

1. **ESLint `no-process-env` enforcement**: The codebase enforces a `no-process-env` ESLint rule (from the `eslint-plugin-mattermost` plugin's `react` preset) that prevents direct `process.env` access in application code. This rule is disabled only in overrides for `scripts/**` files (`.eslintrc.json` line 166) and `e2e/**` files (line 177). Application code that accesses `process.env` must use `// eslint-disable-line no-process-env` comments (seen in `root.tsx` line 8, `components/root/root.tsx` lines 239-240, `stores/redux_store.jsx` line 11, `packages/mattermost-redux/src/store/helpers.ts` line 23).

2. **E2E test environment variable loading with dotenv**: The Playwright test framework uses `dotenv` in `e2e/playwright/test.config.ts` (lines 5-6: `import * as dotenv from 'dotenv'; dotenv.config()`) to load a `.env` file, then defines a centralized `TestConfig` object (lines 38-59) reading `PW_BASE_URL`, `PW_ADMIN_USERNAME`, `PW_ADMIN_PASSWORD`, `PW_ADMIN_EMAIL`, `PW_HEADLESS`, `PW_WORKERS`, `CI`, and others with `parseBool` and `parseNumber` helper functions for type-safe defaults. Cypress uses `dotenv` in `e2e/cypress/run_test_cycle.js` (line 41) and reads `BRANCH`, `BROWSER`, `BUILD_ID`, `CI_BASE_URL`, `HEADLESS`, `REPO` from `process.env`.

3. **Makefile `NODE_OPTIONS` and CI env vars**: The `Makefile` (line 5) exports `NODE_OPTIONS=--max-old-space-size=4096` to increase Node.js memory limits for the webpack build. It also uses the `CI` env var (line 16: `CI ?= false`) to switch between `npm install` and `npm ci --include=dev` for dependency installation (lines 46-52).

## Accuracy Markers

### Must Be Correct

1. **Webpack `DefinePlugin` is the primary build-time injection mechanism**: The `process.env` object available in browser code is NOT the real Node.js `process.env`. It is a static object created by `webpack.DefinePlugin({'process.env': env})` in `webpack.config.js` (line 497-499). The `ProvidePlugin` on line 172 provides the `process` polyfill from `process/browser`, and the `DefinePlugin` replaces `process.env` property accesses with their stringified values at compile time.

2. **Runtime config comes from the server API, NOT from environment variables**: The webapp does NOT use `.env` files or `process.env` at runtime in the browser. Runtime configuration is fetched from the Mattermost server via `Client4.getClientConfigOld()` (which calls `GET /api/v4/config/client?format=old`) and stored in the Redux store at `state.entities.general.config`. The server reads its own environment variables (like `MM_SERVICESETTINGS_SITEURL`) and exposes the resulting configuration through this API.

3. **`window.publicPath` is the production runtime bridge for `SiteURL` subpath**: In production, `process.env.PUBLIC_PATH` is undefined (it is only injected by DefinePlugin in DEV mode). The fallback `window.publicPath` in `root.tsx` (line 8) is set by the Mattermost server which modifies `root.html` to inject the correct static path based on the configured `SiteURL`.

### Common Mistakes

1. **Claiming dotenv is used in the webapp build or runtime** (Type: factual_error): dotenv is NOT used anywhere in the main webapp build or application code. It is only used in the E2E test frameworks (`e2e/playwright/test.config.ts` and `e2e/cypress/run_test_cycle.js`). An agent might incorrectly claim that the webapp uses dotenv for loading environment variables during development.

2. **Confusing build-time env vars with runtime env vars** (Type: factual_error): The env vars read in `webpack.config.js` (like `MM_SERVICESETTINGS_SITEURL`, `RUDDER_KEY`) are consumed at build time during the webpack compilation. They are NOT available to the running application via `process.env` unless explicitly injected through `DefinePlugin`. An agent might incorrectly describe `MM_SERVICESETTINGS_SITEURL` as being available in the browser at runtime.

## Coverage Topics

1. Webpack DefinePlugin for process.env injection: Webpack uses DefinePlugin to inject a static `process.env` object into the browser bundle at build time, with different variables for development and production modes including telemetry keys and public path.

2. Webpack DefinePlugin for COMMIT_HASH and REMOTE_CONTAINERS: Webpack also injects `COMMIT_HASH` (from git) and `REMOTE_CONTAINERS` (for module federation) as global constants, with corresponding TypeScript declarations.

3. Runtime config via getClientConfig action: Server configuration is fetched at runtime via a Redux action that calls the Client4 config API endpoint, dispatches the result to the Redux store, and makes it available through a selector.

4. Root entry point PUBLIC_PATH / window.publicPath bridge: The application entry point bridges build-time and runtime configuration by using a DefinePlugin-injected value in development with a fallback to a server-provided window global in production for configuring the static asset path.

## Expected Scores (from Manual Olympics)

| Agent | Coverage | Accuracy | Notes |
|-------|----------|----------|-------|
| Explore | 3/3 | 3/3 | Scored 11/12 in R4 (3 Speed, 3 Coverage, 3 Accuracy, 2 Efficiency). Found core env var patterns including DefinePlugin, runtime config, and build-time env vars. |
| Maproom | 2/3 | 3/3 | Scored 9/12 in R4 (2 Speed, 2 Coverage, 3 Accuracy, 2 Efficiency). Found core mechanisms but missed some webpack pipeline details or build-time env var specifics. |
