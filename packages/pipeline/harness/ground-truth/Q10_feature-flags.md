# Ground Truth: Q10 - How Are Feature Flags Checked?

## Query
"How are feature flags checked?"

## Category
Pattern

## Ideal Answer Summary
Feature flags in the Mattermost webapp are checked primarily through the `getFeatureFlagValue` selector in `packages/mattermost-redux/src/selectors/entities/general.ts`, which reads `FeatureFlag{Key}` properties from the client config stored in the Redux state at `state.entities.general.config`. The `FeatureFlags` type is defined in `packages/types/src/config.ts` as `Record<string, string | boolean>`. Feature flags flow from the server's `AdminConfig.FeatureFlags` field through the `getClientConfig` action (which dispatches `CLIENT_CONFIG_RECEIVED`) into the Redux store, where they are flattened into the `ClientConfig` as `FeatureFlag*` prefixed keys. Consumer selectors in `preferences.ts`, `posts.ts`, `apps.ts`, and `work_template.ts` combine feature flag checks with other config/state to gate features.

## Coverage Items

### Required-Easy (Baseline -- basic search should find these)

1. **`getFeatureFlagValue` selector**: The `getFeatureFlagValue` selector in `mattermost-redux/selectors/entities/general.ts` is the primary mechanism for checking feature flags. It looks up feature flag values from the client config using a `FeatureFlag` prefix convention.

2. **`FeatureFlags` type definition**: The `FeatureFlags` type is defined in `packages/types/src/config.ts` as a record type mapping string keys to string or boolean values. It is used for the server-side admin config and referenced by the feature flag selector.

3. **Consumer pattern - selectors that use `getFeatureFlagValue`**: Multiple selector files use `getFeatureFlagValue` to gate features. The main consumers are in `preferences.ts` (for insights, GraphQL, drafts, onboarding features), `posts.ts` (for post priority), and `work_template.ts` (for work templates). The typical pattern is comparing the result to `'true'`.

4. **Feature flag values stored in `ClientConfig`**: The `ClientConfig` type includes explicit `FeatureFlag*` prefixed properties (such as `FeatureFlagAppsEnabled`, `FeatureFlagGraphQL`). These are the flattened representations of server-side feature flags as they appear in the client config response.

### Required-Hard (Differentiation -- precise details)

1. **`getFeatureFlagValue` selector**: Located in `packages/mattermost-redux/src/selectors/entities/general.ts` (line 20). This is the primary selector for checking feature flags. It takes a `GlobalState` and a `key` (typed as `keyof FeatureFlags`), then looks up `FeatureFlag${key}` from the config object: `getConfig(state)?.[`FeatureFlag${key}` as keyof Partial<ClientConfig>]`. Returns `string | undefined`.

2. **`FeatureFlags` type definition**: Located in `packages/types/src/config.ts` (line 849). Defined as `Record<string, string | boolean>`. This is the type used for the server-side `AdminConfig.FeatureFlags` field (line 901) and is referenced by the `getFeatureFlagValue` selector's `key` parameter.

3. **Consumer pattern - selectors that use `getFeatureFlagValue`**: Multiple selector files use `getFeatureFlagValue` to gate features:
   - `packages/mattermost-redux/src/selectors/entities/preferences.ts`: `insightsAreEnabled`, `isGraphQLEnabled`, `syncedDraftsAreAllowed`, `localDraftsAreEnabled`, `onboardingTourTipsEnabled`, `isReduceOnBoardingTaskList`, `autoShowLinkedBoardFFEnabled`, `getUseCaseOnboarding` - all call `getFeatureFlagValue(state, 'FlagName') === 'true'`
   - `packages/mattermost-redux/src/selectors/entities/posts.ts`: `isPostPriorityEnabled` checks `getFeatureFlagValue(state, 'PostPriority') === 'true'`
   - `selectors/work_template.ts`: `areWorkTemplatesEnabled` checks `getFeatureFlagValue(state, 'WorkTemplate')` and `getFeatureFlagValue(state, 'BoardsProduct')`

4. **Feature flag values stored in `ClientConfig`**: The `ClientConfig` type in `packages/types/src/config.ts` (lines 121-124) includes explicit `FeatureFlag*` prefixed properties (`FeatureFlagAppsEnabled`, `FeatureFlagBoardsProduct`, `FeatureFlagCallsEnabled`, `FeatureFlagGraphQL`). These are the flattened representations of server-side `FeatureFlags` as they appear in the client config endpoint response.

### Expected (Should Find - Comprehensive Answer)

1. **Config flow from server to Redux store**: The `getClientConfig` action in `packages/mattermost-redux/src/actions/general.ts` (line 52) fetches client config via `Client4.getClientConfigOld()` and dispatches `GeneralTypes.CLIENT_CONFIG_RECEIVED`. The reducer in `packages/mattermost-redux/src/reducers/entities/general.ts` (line 10-23) stores this in `state.entities.general.config`. The `getConfig` selector (line 13 of `general.ts` selectors) reads from `state.entities.general.config`, and `getFeatureFlagValue` builds on top of it.

2. **Alternative direct config access pattern (bypassing `getFeatureFlagValue`)**: Some code accesses feature flags directly from config without using the `getFeatureFlagValue` selector:
   - `packages/mattermost-redux/src/selectors/entities/apps.ts` (line 19): `config?.['FeatureFlagAppsEnabled' as keyof Partial<ClientConfig>] === 'true'` (the `appsFeatureFlagEnabled` selector)
   - `actions/views/root.ts` (line 26): `clientConfig.FeatureFlagGraphQL === 'true'`
   - `plugins/products.ts` (lines 32, 53): `config.FeatureFlagBoardsProduct === 'true'`

3. **Admin Console Feature Flags page**: `components/admin_console/feature_flags.tsx` renders all feature flags from `AdminConfig.FeatureFlags` in a table for troubleshooting. It is registered in `components/admin_console/admin_definition.jsx` (line 6894) under the route `experimental/feature_flags` and gated by the `SYSCONSOLE_READ_EXPERIMENTAL_FEATURE_FLAGS` permission.

4. **`AdminConfig.FeatureFlags` server-side type**: In `packages/types/src/config.ts` (line 901), the `AdminConfig` type includes a `FeatureFlags: FeatureFlags` field. This is the server-side configuration object where feature flags originate before being flattened into the `ClientConfig` as `FeatureFlag*` prefixed keys.

5. **Feature flag combined with config pattern**: Many consumer selectors combine a feature flag check with an additional config check, e.g., `insightsAreEnabled` in `preferences.ts` checks both `getFeatureFlagValue(state, 'InsightsEnabled') === 'true'` AND `getConfig(state).InsightsEnabled === 'true'`. Similarly, `isPostPriorityEnabled` checks both the `PostPriority` feature flag AND the `PostPriority` config value.

### Bonus (Extra Credit - Expert Answer)

1. **Server-side split key sync mechanism**: In `packages/types/src/config.ts`, the `ServiceSettings` type includes `SplitKey: string` (line 360) and `FeatureFlagSyncIntervalSeconds: number` (line 361), indicating that feature flags are synced from an external feature flag service (Split.io) on the server side at a configurable interval.

2. **E2E test feature flag helpers**: The codebase includes dedicated test utilities for feature flags:
   - Playwright: `e2e/playwright/support/flag.ts` exports `shouldHaveFeatureFlag(name, value)` which reads `config.FeatureFlags[name]` from the admin API
   - Cypress: `e2e/cypress/tests/support/api/system.js` (line 286) adds `cy.shouldHaveFeatureFlag(key, expectedValue)` which reads `config.FeatureFlags[key]`
   - Default test config in `e2e/playwright/support/server/default_config.ts` (line 670) defines default feature flag values for tests

3. **Permission-gated admin access**: Feature flag visibility in the admin console is controlled by dedicated permissions: `SYSCONSOLE_READ_EXPERIMENTAL_FEATURE_FLAGS` and `SYSCONSOLE_WRITE_EXPERIMENTAL_FEATURE_FLAGS` defined in `packages/mattermost-redux/src/constants/permissions.ts` (lines 216-217), with the resource key `FEATURE_FLAGS: 'experimental.feature_flags'` in `packages/mattermost-redux/src/constants/permissions_sysconsole.ts` (line 62).

## Accuracy Markers

### Must Be Correct

1. **`getFeatureFlagValue` location and signature**: Must be in `packages/mattermost-redux/src/selectors/entities/general.ts`. Must take `(state: GlobalState, key: keyof FeatureFlags)` and return `string | undefined`. Must construct the lookup key as `` `FeatureFlag${key}` ``.

2. **`FeatureFlags` type**: Must be defined in `packages/types/src/config.ts` as `Record<string, string | boolean>` (not a union type, interface, or enum).

3. **Config storage path**: Feature flags must be described as stored at `state.entities.general.config` in the Redux store, accessed via the `getConfig` selector.

### Common Mistakes

1. **Confusing `AdminConfig.FeatureFlags` with `ClientConfig`** (Type: factual_error): The `FeatureFlags` field on `AdminConfig` is a nested object of type `FeatureFlags` (i.e., `Record<string, string | boolean>`). In the `ClientConfig`, feature flags are flattened as individual `FeatureFlag*` string properties (e.g., `FeatureFlagAppsEnabled`). An agent might incorrectly describe the client-side representation as a nested `FeatureFlags` object rather than flattened prefixed keys.

2. **Claiming feature flags use a dedicated Redux slice** (Type: factual_error): Feature flags do NOT have their own separate Redux slice or reducer. They are stored as part of the general `config` object within `state.entities.general.config`. An agent might incorrectly suggest there is a dedicated feature flags reducer.

## Coverage Topics

1. getFeatureFlagValue selector: The primary selector for checking feature flags reads flag values from the client config in the Redux store using a FeatureFlag prefix naming convention.

2. FeatureFlags type definition: The FeatureFlags type is defined as a record type mapping string keys to string or boolean values, used for the server-side admin config and referenced by the feature flag selector.

3. Consumer pattern - selectors that use getFeatureFlagValue: Multiple selector files gate features by calling the feature flag selector and comparing the result to a truthy string value. Major consumers include selectors for insights, GraphQL, drafts, post priority, and work templates.

4. Feature flag values stored in ClientConfig: The ClientConfig type includes explicit FeatureFlag-prefixed properties that represent the flattened server-side feature flags as they appear in the client config API response.

## Expected Scores (from Manual Olympics)

| Agent | Coverage | Accuracy | Notes |
|-------|----------|----------|-------|
| Maproom | 3/3 | 3/3 | Perfect 12/12 score in R10. Found `getFeatureFlagValue` selector, `FeatureFlags` type, consumer patterns. Fast (76s), comprehensive, accurate, efficient (24 tool calls). |
| Explore | 3/3 | 2/3 | Scored 11/12 in R10. Found same core patterns. Minor accuracy issue likely from over-generalization or imprecise detail. |
