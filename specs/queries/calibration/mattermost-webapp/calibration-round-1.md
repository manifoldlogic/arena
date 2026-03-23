# Calibration Round 1 — mattermost-webapp (Easy)

This is a pre-scored calibration round. The judge must score the competitor output below and match the official scores within 1 point on each dimension before proceeding to score actual competition rounds.

---

**Query:** mattermost-pattern-discovery-1 (easy)
> What pattern does mattermost-webapp use for connecting React components to the Redux store? Describe the container/component pattern used throughout the codebase.

**Competitor output (excerpt):**

> Mattermost-webapp uses the classic container/component pattern with React-Redux's `connect()` function.
>
> Each component typically lives in a directory with this structure:
> ```
> components/some_feature/
>   index.ts          # Container — connect() binding
>   some_feature.tsx  # Presentational component
> ```
>
> The `index.ts` file imports `connect` from `react-redux`, defines `mapStateToProps` to read from the Redux store (using selectors from `packages/mattermost-redux/src/selectors/`), and `mapDispatchToProps` to bind action creators. It then exports `connect(mapState, mapDispatch)(SomeFeature)`.
>
> For example, in the channel header component, `components/channel_header/index.ts` maps channel data from the store and binds actions like `updateChannelHeader`.
>
> The presentational component receives all data as props and is not aware of Redux. This makes components testable — tests can render the component directly with mock props.
>
> Some newer components use the `useSelector` and `useDispatch` hooks from `react-redux` instead of the `connect()` pattern, particularly components written more recently like the login page (`components/login/login.tsx`).

**Official scores:** Precision: 4, Recall: 4, Insight: 3

**Scoring rationale:**

- **Precision: 4** — All facts are correct: the directory structure convention, the `index.ts` container / `component.tsx` split, the `mapStateToProps` / `mapDispatchToProps` pattern, selectors from `mattermost-redux`, and the hooks migration in newer components. The login component example is accurate — it does use `useSelector`/`useDispatch`. One trivial imprecision: the channel header example is slightly generic (not verified that `updateChannelHeader` is the exact action bound there), but the pattern description is accurate.

- **Recall: 4** — Covers the container/component pattern, the `connect()` approach, the selector layer, the hooks alternative, and provides concrete examples. Minor missing piece: does not mention that some components use a `makeMapStateToProps` factory pattern for per-instance memoization with `reselect` (used when a component appears in a list and each instance needs different memoized selectors). This is a secondary pattern that does not materially change the answer.

- **Insight: 3** — Explains the main pattern and its benefit (testability via prop isolation). Mentions the hooks migration trend. Does not explain: why the codebase has both patterns (historical — `connect()` was standard before hooks), how the two-package structure (`mattermost-redux` + app) influences the pattern (selectors live in the shared package, containers in the app), or the `makeMapStateToProps` factory for list-item memoization. Main connections explained but secondary architectural reasons missed.
