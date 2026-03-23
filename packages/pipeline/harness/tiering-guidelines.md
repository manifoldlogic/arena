# Tiering Guidelines: Required-Easy vs Required-Hard

## Purpose

This document defines the heuristics for splitting "Required (Must Find)" coverage items into two tiers:

- **Required-Easy (Baseline)**: Did the agent find this concept/area at all?
- **Required-Hard (Differentiation)**: Did the agent provide precise, verifiable details?

The goal is to improve scoring fidelity. Under the old single-tier system, agents that correctly identified the right concepts but lacked exact line numbers scored the same as agents that missed the concepts entirely. The two-tier split separates "awareness" from "precision."

## Core Heuristic

Ask this question for each Required item:

> **"Could a correct answer mention this concept without citing specific line numbers, exact function signatures, or precise code references?"**

- If **yes** --> the concept-level description becomes **Required-Easy**, and the precise details become **Required-Hard**.
- If the item is inherently concept-level already (no precise details to strip) --> it stays as **Required-Easy** only.

## Classification Rules

### Required-Easy items MUST:
1. Describe the concept, mechanism, or pattern being asked about
2. Name the relevant file(s) or package(s) (file names are acceptable, exact paths optional)
3. Use plain-language descriptions of what the code does
4. **NOT** contain line numbers (e.g., "line 42", "lines 483-499")
5. **NOT** contain exact function signatures with parameter types
6. **NOT** contain quoted code snippets or string literals from the source
7. **NOT** reference specific variable values (e.g., "version `2.4.2`", "key `'2_KtH_W5'`")

### Required-Hard items MUST:
1. Retain all precise details from the original Required item
2. Include specific line numbers where applicable
3. Include exact function signatures, parameter lists, and return types
4. Include quoted code snippets, string literals, and specific values
5. Reference exact file paths (not just file names)
6. Preserve cross-references to type definitions, constants, and related files

## Decision Framework

| Detail Type | Required-Easy | Required-Hard |
|-------------|:---:|:---:|
| File/module name (e.g., "webpack.config.js") | Yes | Yes |
| Full file path (e.g., "packages/mattermost-redux/src/actions/errors.ts") | Optional | Yes |
| Concept description (e.g., "uses DefinePlugin for env injection") | Yes | Yes |
| Line numbers (e.g., "line 42", "lines 483-499") | No | Yes |
| Exact function signature (e.g., "`logError(error: ServerError, displayable = false)`") | No | Yes |
| Quoted code (e.g., "`new webpack.DefinePlugin({'process.env': env})`") | No | Yes |
| Specific constant values (e.g., "`'pk_test_ttEpW6dCHksKyfAFzh6MvgBj'`") | No | Yes |
| API endpoint paths (e.g., "POST `/api/v4/users`") | Mention exists | Exact path |
| Redux action type names (e.g., "`CLIENT_CONFIG_RECEIVED`") | Mention category | Exact name |
| Package versions (e.g., "`redux-thunk` version `2.4.2`") | No | Yes |
| Count of items (e.g., "75 event types") | Approximate OK | Exact count |

## Splitting Strategy

For each original Required item:

1. **Write the Easy version first**: Strip all line numbers, exact signatures, quoted code, and specific values. Keep the concept, the file/module name, and a plain description of what happens.
2. **Copy the original as the Hard version**: The Hard version is essentially the original Required item text, preserving all precise details.
3. **Verify completeness**: Every piece of information in the original must appear in either Easy or Hard (nothing lost).
4. **Verify separation**: The Easy version must be scorable by concept-matching alone -- a grader should be able to mark it correct if the agent mentions the right concept in the right context, even without exact details.

## Numbering Convention

Required-Easy and Required-Hard items are numbered independently (both start at 1). Each Easy item corresponds to a Hard item with the same number and topic name, but this is a content relationship, not a strict pairing requirement. Some original Required items may produce only an Easy item (if they were already concept-level) or only a Hard item (if they are inherently detail-dependent).

In practice, most original Required items will produce both an Easy and a Hard variant, since the original items in these ground truth files are consistently detail-rich.

## Concrete Examples

*Examples below are drawn from the actual ground truth files (Q4, Q7, Q9) after the initial split was applied.*

### Example 1: Q4 -- Webpack DefinePlugin for process.env injection

**Original Required item:**
> In `webpack.config.js` (lines 483-499), an `env` object is constructed and injected via `new webpack.DefinePlugin({'process.env': env})`. In development mode (`DEV`), this includes `PUBLIC_PATH`, `RUDDER_KEY`, and `RUDDER_DATAPLANE_URL`. In production mode, it includes `NODE_ENV` (set to `'production'`), `RUDDER_KEY`, and `RUDDER_DATAPLANE_URL`. The `RUDDER_KEY` and `RUDDER_DATAPLANE_URL` values are read from the real `process.env` at build time and JSON-stringified.

**Required-Easy:**
> Webpack `DefinePlugin` is used in `webpack.config.js` to inject a `process.env` object into the bundle at build time. The injected variables differ between development and production modes, and include keys like `PUBLIC_PATH`, `NODE_ENV`, `RUDDER_KEY`, and `RUDDER_DATAPLANE_URL`.

**Required-Hard:**
> *(Identical to the original -- preserves lines 483-499, the exact `new webpack.DefinePlugin({'process.env': env})` call, the specific dev/prod variable lists, and the JSON-stringify detail.)*

**Why this split works:** An agent that says "Webpack DefinePlugin injects process.env variables at build time" clearly found the right concept. An agent that also cites lines 483-499 and names the exact variables demonstrates deeper precision.

### Example 2: Q7 -- redux-thunk as the sole Redux middleware

**Original Required item:**
> In `packages/mattermost-redux/src/store/configureStore.ts` (line 49), the only middleware applied is `thunk` from `redux-thunk`: `const middleware = applyMiddleware(thunk);`. This is passed to `legacy_createStore` via `composeEnhancers(middleware)` (line 51). There are no other Redux middleware in the `applyMiddleware` call. The `redux-thunk` package version is `2.4.2` (per `package.json` line 92).

**Required-Easy:**
> `redux-thunk` is the only Redux middleware in the application. It is applied via `applyMiddleware` in the store configuration within `configureStore.ts`. No other middleware is passed to `applyMiddleware`.

**Required-Hard:**
> *(Identical to the original -- preserves line 49, the exact code `const middleware = applyMiddleware(thunk);`, line 51 reference, package version 2.4.2, etc.)*

**Why this split works:** The key insight is that redux-thunk is the *only* middleware. An agent gets Easy credit for stating this fact. Hard credit requires citing the exact file location, line numbers, and code.

### Example 3: Q9 -- No Logger class exists

**Original Required item:**
> The codebase has no `Logger` class, no `import Logger`, and no file named `logger.ts` or `Logger.ts`. The ideal response must acknowledge this fact and pivot to describe the actual logging mechanisms.

**Required-Easy:**
> There is no `Logger` class in the Mattermost webapp codebase. The agent must recognize this absence and describe the actual logging mechanisms instead.

**Required-Hard:**
> *(Identical to the original -- preserves the specific assertions about no `import Logger` and no `logger.ts`/`Logger.ts` files.)*

**Why this split works:** This is a "trap" question. The Easy version tests whether the agent correctly identifies that no Logger class exists. The Hard version tests whether it can make the specific negative assertions (no import, no file by that name).

### Example 4: Q9 -- logError Redux action

**Original Required item:**
> Located in `packages/mattermost-redux/src/actions/errors.ts` (line 37). Signature: `logError(error: ServerError, displayable = false, consoleError = false): ActionFunc<boolean>`. This is the primary error logging action used throughout the app. It: (a) skips session-expired errors entirely, (b) serializes the error with `serializeError`, (c) conditionally sends the error to the server via `Client4.logClientError` with `LogLevel.Debug` -- only if the error is NOT a `TypeError: Failed to fetch` and does NOT have a `server_error_id`, (d) dispatches `ErrorTypes.LOG_ERROR` to the Redux store with a `displayable` flag. Imported by 29 files across the codebase.

**Required-Easy:**
> The `logError` Redux action in `mattermost-redux/actions/errors.ts` is the primary error logging mechanism. It serializes errors, conditionally sends them to the server via `Client4.logClientError`, and dispatches them to the Redux store. It is widely imported across the codebase.

**Required-Hard:**
> *(Identical to the original -- preserves line 37, exact signature with types, the specific skip/filter conditions, the 29-file import count, etc.)*

**Why this split works:** An agent that identifies `logError` as the primary logging action and knows it lives in `errors.ts` clearly found the right mechanism. Precise details like line numbers, exact signature, and the specific filtering conditions differentiate a thorough search.
