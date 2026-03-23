# Ground Truth: Q5 - Find Where HTTP Requests Are Made to External Services

## Query
"Find where HTTP requests are made to external services"

## Category
Conceptual

## Ideal Answer Summary
The Mattermost webapp makes HTTP requests to several external (non-Mattermost-server) services. **RudderStack** is used for analytics/telemetry: the `RudderTelemetryHandler` class in `packages/mattermost-redux/src/client/rudder.ts` wraps the `rudder-sdk-js` library, calling `rudderAnalytics.track()` and `rudderAnalytics.page()` to send events to a RudderStack data plane URL. RudderStack is initialized in `components/root/root.tsx` via `rudderAnalytics.load(rudderKey, rudderUrl)` when telemetry is enabled (`DiagnosticsEnabled === 'true'`), with the key/URL sourced from `TELEMETRY_RUDDER_KEY`/`TELEMETRY_RUDDER_DATAPLANE_URL` constants or environment variables. **Stripe** is used for payment processing: `loadStripe(STRIPE_PUBLIC_KEY)` from `@stripe/stripe-js/pure` loads the Stripe.js SDK (making external requests to `js.stripe.com`), used in `components/common/hooks/useLoadStripe.ts`, `components/purchase_modal/purchase_modal.tsx`, and `components/admin_console/billing/payment_info_edit.tsx`. The Stripe `confirmCardSetup` API is called in `actions/cloud.tsx` and `actions/hosted_customer.tsx` to process payments. **Gfycat** provides GIF search: the `gfycat-sdk` library is wrapped in `packages/mattermost-redux/src/utils/gfycat_sdk.ts` and used by actions in `packages/mattermost-redux/src/actions/gifs.ts` (e.g., `searchGfycat`, `searchCategory`, `requestCategoriesList`) to call the Gfycat API, authenticated with `GfycatAPIKey`/`GfycatAPISecret` from the server config. **Marketplace** plugin/app listings are fetched via the Mattermost server which proxies to the external Marketplace API at `https://api.integrations.mattermost.com` (configured by `PluginSettings.MarketplaceURL`); the webapp calls `Client4.getMarketplacePlugins()` and related methods in `actions/marketplace.ts`. All regular Mattermost API calls go through `Client4.doFetch()` in `packages/client/src/client4.ts` using the native `fetch()` API, with `cleanUrlForLogging()` in `packages/client/src/errors.ts` sanitizing URLs for Sentry error grouping. Telemetry events are dispatched via `Client4.trackEvent()` (line 4191) which delegates to the `TelemetryHandler` interface defined in `packages/client/src/telemetry.ts`.

## Coverage Items

### Required-Easy (Baseline -- basic search should find these)

1. **RudderStack analytics/telemetry**: The `RudderTelemetryHandler` class in `mattermost-redux/client/rudder.ts` wraps the `rudder-sdk-js` library to send analytics events (track and page calls) to a RudderStack data plane. It is initialized in `components/root/root.tsx` when telemetry is enabled, using keys from constants or environment variables.

2. **Stripe payment processing**: The Stripe.js SDK is loaded via `loadStripe` from `@stripe/stripe-js/pure`, making external HTTP requests to Stripe's servers. Stripe is used in payment-related components and actions for card setup and payment processing. The public key is defined in `components/payment_form/stripe.ts`.

3. **Gfycat GIF provider API**: The `gfycat-sdk` library is wrapped in `mattermost-redux/utils/gfycat_sdk.ts` and used by GIF search actions in `mattermost-redux/actions/gifs.ts` to call external Gfycat API endpoints for searching GIFs, categories, and trending content. API credentials come from server config.

4. **Marketplace API (via server proxy)**: The webapp fetches plugin and app listings from the Marketplace through the Mattermost server, which proxies requests to an external Marketplace API. Client4 methods like `getMarketplacePlugins` and related functions are dispatched from `actions/marketplace.ts`. The `EnableRemoteMarketplace` setting controls this behavior.

### Required-Hard (Differentiation -- precise details)

1. **RudderStack analytics/telemetry**: The `RudderTelemetryHandler` class in `packages/mattermost-redux/src/client/rudder.ts` implements the `TelemetryHandler` interface from `packages/client/src/telemetry.ts`. It wraps the `rudder-sdk-js` library, calling `rudderAnalytics.track('event', properties, options)` (line 35) and `rudderAnalytics.page(category, name, ...)` (line 39). Initialization occurs in `components/root/root.tsx` in the `onConfigLoaded` method: `rudderAnalytics.load(rudderKey, rudderUrl, rudderCfg)` (line 252), `rudderAnalytics.identify(telemetryId, ...)` (line 254), and `rudderAnalytics.page('ApplicationLoaded', ...)` (line 268). The key and URL come from `Constants.TELEMETRY_RUDDER_KEY` / `Constants.TELEMETRY_RUDDER_DATAPLANE_URL` in `utils/constants.tsx` (lines 1955-1956), falling back to `process.env.RUDDER_KEY` / `process.env.RUDDER_DATAPLANE_URL` (injected via `webpack.config.js` lines 486-494). Telemetry is gated on `config.DiagnosticsEnabled === 'true'`.

2. **Stripe payment processing**: The Stripe.js SDK is loaded via `loadStripe(STRIPE_PUBLIC_KEY)` from `@stripe/stripe-js/pure`, making external HTTP requests to Stripe's servers (`js.stripe.com`, `api.stripe.com`). The `STRIPE_PUBLIC_KEY` (`'pk_test_ttEpW6dCHksKyfAFzh6MvgBj'`) and `STRIPE_CSS_SRC` (Google Fonts URL) are defined in `components/payment_form/stripe.ts` (lines 27-28). Stripe is loaded in three places: `components/common/hooks/useLoadStripe.ts` (the `useLoadStripe` hook, line 20), `components/purchase_modal/purchase_modal.tsx` (line 962), and `components/admin_console/billing/payment_info_edit.tsx` (line 84). The `confirmCardSetup` Stripe API is called in `actions/cloud.tsx` (`completeStripeAddPaymentMethod`, line 37) and `actions/hosted_customer.tsx` (`confirmSelfHostedSignup`, line 49) to process card payments.

3. **Gfycat GIF provider API**: The `gfycat-sdk` library is initialized in `packages/mattermost-redux/src/utils/gfycat_sdk.ts` with a `client_id` and `client_secret` (default key `'2_KtH_W5'`, line 6). GIF search actions in `packages/mattermost-redux/src/actions/gifs.ts` call external Gfycat API endpoints via the SDK: `searchGfycat` (line 147) calls `sdk.search()`, `searchCategory` (line 186) calls `sdk.getTrendingCategories()`, `requestCategoriesList` (line 345) calls `sdk.getCategories()`, and `searchById` (line 272) calls `sdk.searchById()`. API credentials (`GfycatAPIKey`/`GfycatAPISecret`) are read from `state.entities.general.config` and can be configured in the Admin Console under `ServiceSettings` (type definitions at `packages/types/src/config.ts` lines 125-126 and 325-326).

4. **Marketplace API (via server proxy)**: The webapp fetches plugin and app listings from the Marketplace, which the Mattermost server proxies to an external API (default URL `https://api.integrations.mattermost.com`, configured by `PluginSettings.MarketplaceURL` in `packages/types/src/config.ts` line 820). The webapp calls `Client4.getMarketplacePlugins(filter)` (line 3494), `Client4.getRemoteMarketplacePlugins(filter)` (line 3487), `Client4.installMarketplacePlugin(id)` (line 3501), and `Client4.getMarketplaceApps(filter)` (line 3510) in `packages/client/src/client4.ts`. These are dispatched from `actions/marketplace.ts` via `fetchListing` (line 44), `fetchRemoteListing` (line 25), and `installPlugin` (line 103). The `EnableRemoteMarketplace` setting controls whether the server forwards requests to the external marketplace.

### Expected (Should Find - Comprehensive Answer)

1. **Client4 `doFetch` and `fetch()` usage**: All Mattermost server API calls go through `Client4.doFetchWithResponse()` in `packages/client/src/client4.ts` (line 4141), which calls `fetch(url, this.getOptions(options))` (line 4142). This is the single HTTP transport layer for all server API communication. The `cleanUrlForLogging` function in `packages/client/src/errors.ts` (line 6) sanitizes API URLs by filtering path segments through a whitelist, specifically designed for Sentry error grouping (comment on line 5: "prevent properly grouping the messages in Sentry").

2. **`TelemetryHandler` interface and `Client4.trackEvent()` dispatch**: The `TelemetryHandler` interface in `packages/client/src/telemetry.ts` defines `trackEvent(userId, userRoles, category, event, props?)` and `pageVisited(userId, userRoles, category, name)`. `Client4.trackEvent()` (line 4191) and `Client4.pageVisited()` (line 4197) delegate to this handler. The `RudderTelemetryHandler` is set as the handler in `components/root/root.tsx` line 284 via `Client4.setTelemetryHandler(new RudderTelemetryHandler())`. The helper functions `trackEvent` and `pageVisited` in `actions/telemetry_actions.jsx` (lines 33, 50) wrap `Client4.trackEvent`/`Client4.pageVisited` and are used throughout the app to send telemetry to RudderStack.

3. **Sentry error tracking (server-side, referenced in client)**: While Sentry initialization happens server-side, the client code is aware of it: `cleanUrlForLogging` in `packages/client/src/errors.ts` sanitizes URLs explicitly for Sentry grouping. The `ClientError` class (line 4296 in `client4.ts`) uses `cleanUrlForLogging(baseUrl, data.url)` in its constructor, ensuring errors sent to Sentry have consistent URL patterns. The `EnableSentry` config boolean is in `packages/types/src/config.ts` (line 431) under `LogSettings`.

4. **Stripe CSS font loading from Google**: The `STRIPE_CSS_SRC` constant in `components/payment_form/stripe.ts` (line 27) is set to `'https://fonts.googleapis.com/css?family=Open+Sans:400,400i,600,600i&display=swap'`. This external Google Fonts URL is passed to Stripe Elements via the `fonts` option in `components/self_hosted_purchase_modal/stripe_provider.tsx` (line 16), making an HTTP request to Google's CDN for web fonts during payment form rendering.

5. **Push notification server URLs**: Constants `MHPNS` (`'https://push.mattermost.com'`) and `MTPNS` (`'https://push-test.mattermost.com'`) are defined in `utils/constants.tsx` (lines 1917-1918). These represent external Mattermost-hosted push notification services (HPNS = Hosted Push Notification Service). While push notification delivery is server-side, the webapp references these URLs in the admin console push notification configuration UI.

### Bonus (Extra Credit - Expert Answer)

1. **`ExternalLink` component with UTM tracking**: The `ExternalLink` component in `components/external_link/index.tsx` automatically appends UTM parameters (`utm_source`, `utm_medium`, `utm_content`, `uid`, `sid`) to any `href` containing `mattermost.com` (line 37). It also calls `trackEvent('link_out', 'click_external_link', queryParams)` on click (line 59), triggering a RudderStack telemetry event whenever a user clicks an external link. This means external link navigation is both tracked and instrumented.

2. **Customer Web Server (CWS) URL**: The `CWSURL` property in `ClientConfig` (`packages/types/src/config.ts` line 35) and `CloudSettings` (line 845) points to `https://customers.mattermost.com` (seen in `e2e/playwright/support/server/default_config.ts` line 667). This is the Mattermost Customer Web Server used for cloud subscription management, self-hosted signup (`utils/constants.tsx` line 1068: `SELF_HOSTED_SIGNUP: 'https://customers.mattermost.com/signup'`), and commercial support (`components/commercial_support_modal/commercial_support_modal.tsx` line 67).

3. **Webpack environment variable injection for telemetry**: The `webpack.config.js` (lines 486-494) injects `RUDDER_KEY` and `RUDDER_DATAPLANE_URL` as `process.env` variables via `webpack.DefinePlugin` for both DEV and production builds. This allows the RudderStack data plane URL to be configured at build time, which determines the external endpoint that receives all telemetry data.

## Accuracy Markers

### Must Be Correct

1. **RudderStack initialization location and mechanism**: Must identify `components/root/root.tsx` as the initialization point and `packages/mattermost-redux/src/client/rudder.ts` as the `RudderTelemetryHandler` implementation. Must mention `rudder-sdk-js` library and `rudderAnalytics.load()`, `rudderAnalytics.track()`, `rudderAnalytics.page()` calls. Must note that telemetry is conditional on `DiagnosticsEnabled`/`telemetryEnabled`.

2. **Gfycat SDK wrapper location**: Must identify `packages/mattermost-redux/src/utils/gfycat_sdk.ts` as the SDK wrapper and `packages/mattermost-redux/src/actions/gifs.ts` as the actions file containing `searchGfycat`, `searchCategory`, etc. Must note the `gfycat-sdk` npm package is used (not a custom HTTP client).

3. **Stripe loading mechanism**: Must identify `loadStripe` from `@stripe/stripe-js/pure` as the mechanism for loading Stripe's external JS SDK, and must reference `STRIPE_PUBLIC_KEY` from `components/payment_form/stripe.ts`. Must distinguish between Stripe JS SDK calls (external to Stripe servers) and Mattermost server API calls that proxy payment operations.

### Common Mistakes

1. **Confusing server-proxied requests with direct external requests** (Type: factual_error): The Marketplace API calls (`Client4.getMarketplacePlugins()`) go through the Mattermost server, which then proxies to the external Marketplace API. An agent might incorrectly describe these as direct external HTTP requests from the browser, when they are actually server-mediated. Similarly, Sentry error reporting is server-side - the client only sanitizes URLs for Sentry grouping.

2. **Claiming the webapp makes direct HTTP calls to Gfycat API endpoints** (Type: factual_error): The webapp uses the `gfycat-sdk` npm package which internally handles HTTP communication with the Gfycat API. An agent might incorrectly describe custom `fetch()` or `XMLHttpRequest` calls to Gfycat URLs, when in reality the SDK abstracts this away. The key entry points are the SDK methods (`search`, `getTrendingCategories`, `getCategories`, `searchById`), not raw HTTP calls.

## Coverage Topics

1. RudderStack analytics/telemetry: A telemetry handler class wraps the RudderStack SDK to send analytics track and page events to an external data plane, initialized in the root component when telemetry is enabled.

2. Stripe payment processing: The Stripe.js SDK is loaded to make external HTTP requests to Stripe's servers for payment form rendering and card setup, used across payment-related components and actions.

3. Gfycat GIF provider API: A third-party GIF SDK is wrapped and used by GIF search actions to call external Gfycat API endpoints for searching, browsing categories, and fetching trending content.

4. Marketplace API via server proxy: The webapp fetches plugin and app listings from an external Marketplace API through the Mattermost server, which proxies the requests. Client4 methods and marketplace actions handle the communication.

## Expected Scores (from Manual Olympics)

| Agent | Coverage | Accuracy | Notes |
|-------|----------|----------|-------|
| Maproom | 3/3 | 3/3 | Scored 10/12 in R5 (2 Speed, 3 Coverage, 3 Accuracy, 2 Efficiency). Found key external services (RudderStack, Sentry, Stripe, GIF providers, marketplace). Faster and more efficient than Explore. |
| Explore | 3/3 | 3/3 | Scored 8/12 in R5 (1 Speed, 3 Coverage, 3 Accuracy, 1 Efficiency). Found same key external services. Slower and less efficient but thorough coverage. |
