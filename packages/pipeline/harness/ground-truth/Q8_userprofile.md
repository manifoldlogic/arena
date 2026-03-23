# Ground Truth: Q8 - What Components Render the UserProfile Component?

## Query
"What components render the UserProfile component?"

## Category
Relationship

## Ideal Answer Summary
The `UserProfile` component (`components/user_profile/user_profile.tsx`) is a class component that renders a user's display name with an optional `ProfilePopover` overlay trigger. It is wrapped by a Redux `connect()` HOC in `components/user_profile/index.ts` that injects `displayName`, `user`, `theme`, and `isShared` props. Eight components across the codebase directly render `<UserProfile>` (or its connected export under aliases `UserProfileComponent` or `UserProfileElement`) in their JSX: **PostUserProfile** (the post header in all post locations including search results), **RhsCard** (the right-hand side card view), **UserListRow** (user list modals), **CommentedOn** (the "commented on" header), **ChannelIntroMessage** (DM channel intro), **EditedPostItem** (post edit history), **PostMessagePreview** (permalink/preview embeds), and **AboutAreaGM** (channel info RHS for group messages). The `PostUserProfile` component is the most significant consumer, used by `PostComponent` across all post rendering locations (center channel, RHS, and search results).

## Coverage Items

### Required-Easy (Baseline -- basic search should find these)

1. **PostUserProfile** (`components/post/user_profile.tsx`): The primary consumer of `UserProfile`. It handles multiple post type scenarios (normal, compact, webhook, auto-responder, system messages) and renders `UserProfile` in several code branches. It is used by `PostComponent`, meaning every post rendered anywhere ultimately uses `UserProfile` through this component.

2. **RhsCard** (`components/rhs_card/rhs_card.tsx`): Renders `UserProfile` in the right-hand side card view, with separate handling for default posts and posts with overridden usernames. Both instances disable the popover and hide status.

3. **UserListRow** (`components/user_list_row/user_list_row.tsx`): Renders `UserProfile` in user list modals (channel members, team members, system console users) with the @username displayed.

4. **CommentedOn** (`components/post_view/commented_on/commented_on.tsx`): Renders `UserProfile` to display the parent post author's name in the "Commented on {name}'s message" header above reply posts. Notably imports the unwrapped component directly, bypassing the Redux-connected wrapper.

5. **ChannelIntroMessage** (`components/post_view/channel_intro_message/channel_intro_message.tsx`): Renders `UserProfile` in the DM channel intro area to display the conversation partner's name alongside their profile picture.

### Required-Hard (Differentiation -- precise details)

1. **PostUserProfile** (`components/post/user_profile.tsx`): The primary and most complex consumer. Imports `UserProfile` from `components/user_profile` (line 12) and renders `<UserProfile>` in 7 different code branches (lines 54, 66, 76, 88, 102, 124, 133) to handle normal posts, compact/mobile display, consecutive posts, webhook posts, auto-responder posts, bot system messages, and system messages. It is rendered by `PostComponent` (`components/post/post_component.tsx`, line 528) via `<PostUserProfile>`, which means every post rendered anywhere (center channel, RHS comments, RHS root, and search results) ultimately renders `UserProfile` through this component.

2. **RhsCard** (`components/rhs_card/rhs_card.tsx`): Imports `UserProfile` from `components/user_profile` (line 14) and renders `<UserProfile>` twice (lines 132, 140) - once for default posts and once for posts with overridden usernames (when `enablePostUsernameOverride` is true). Both instances pass `hideStatus={true}` and `disablePopover={true}`.

3. **UserListRow** (`components/user_list_row/user_list_row.tsx`): Imports `UserProfile` from `components/user_profile` (line 13) and renders `<UserProfile>` (line 132) with `hasMention={true}` and `displayUsername={true}` to show the user's @username in user list modals (e.g., channel members, team members, system console users).

4. **CommentedOn** (`components/post_view/commented_on/commented_on.tsx`): Imports `UserProfile` directly from `../../user_profile/user_profile` (line 15, bypassing the connected wrapper) and renders `<UserProfile>` (line 49) to display the parent post author's name in the "Commented on {name}'s message" header above reply posts.

5. **ChannelIntroMessage** (`components/post_view/channel_intro_message/channel_intro_message.tsx`): Imports `UserProfile` from `components/user_profile` (line 19) and renders `<UserProfile>` (line 175) in the DM channel intro area to display the conversation partner's name alongside their profile picture.

### Expected (Should Find - Comprehensive Answer)

1. **EditedPostItem** (`components/post_edit_history/edited_post_item/edited_post_item.tsx`): Imports the connected component as `UserProfileComponent` from `components/user_profile` (line 23) and renders `<UserProfileComponent>` (line 145) with `disablePopover={true}` in the post edit history view header, showing who authored each historical version of a post.

2. **PostMessagePreview** (`components/post_view/post_message_preview/post_message_preview.tsx`): Imports the connected component as `UserProfileComponent` from `components/user_profile` (line 10) and renders `<UserProfileComponent>` (line 173) with `disablePopover={true}` in permalink preview embeds, showing the original post author's name.

3. **AboutAreaGM** (`components/channel_info_rhs/about_area_gm.tsx`): Imports the connected component as `UserProfileElement` from `components/user_profile` (line 11) and renders `<UserProfileElement>` (line 99) in a `.map()` loop over GM (group message) users with `isRHS={true}`, displaying each group member's name in the channel info right-hand side panel.

### Bonus (Extra Credit - Expert Answer)

1. **PostComponent as indirect renderer**: `PostComponent` (`components/post/post_component.tsx`) does not directly render `<UserProfile>` but renders `<PostUserProfile>` (line 528), which is the component from `components/post/user_profile.tsx`. Since `PostComponent` is used for rendering posts in all locations - center channel (`Locations.CENTER`), RHS root (`Locations.RHS_ROOT`), RHS comment (`Locations.RHS_COMMENT`), and search results (`Locations.SEARCH`) - it serves as the indirect path through which `UserProfile` appears in search results. There is no separate `SearchResultsItem` component; the `SearchResults` component (`components/search_results/search_results.tsx`, line 289) renders `<PostComponent>` directly with `location={Locations.SEARCH}`.

2. **Connected wrapper pattern**: The `UserProfile` component at `components/user_profile/index.ts` uses `connect(makeMapStateToProps)(UserProfile)` (line 33) with a factory function `makeMapStateToProps` that creates a per-instance `getDisplayName` selector. This connected export is what most consumers import. The exception is `CommentedOn`, which imports the unwrapped class directly from `./user_profile` and passes `user`, `displayName`, and `userId` props manually.

3. **Test file**: `components/user_profile/user_profile.test.tsx` renders `<UserProfile>` in 5 test cases (lines 20, 30, 40, 46, 56) using shallow rendering to test the component's various prop combinations including `disablePopover`, `displayUsername`, and `isShared`.

## Accuracy Markers

### Must Be Correct

1. **UserProfile component location**: Must identify `components/user_profile/user_profile.tsx` as the component definition and `components/user_profile/index.ts` as the connected (Redux-wrapped) export.

2. **PostUserProfile is the most significant consumer**: Must correctly identify that `components/post/user_profile.tsx` is a wrapper component (not `UserProfile` itself) that handles multiple post type scenarios (webhooks, auto-responders, system messages, etc.) and renders the actual `<UserProfile>` component from `components/user_profile`.

3. **Enumeration completeness**: Must identify at least 5 of the 8 direct rendering components. The 8 components are: PostUserProfile, RhsCard, UserListRow, CommentedOn, ChannelIntroMessage, EditedPostItem, PostMessagePreview, AboutAreaGM.

### Common Mistakes

1. **Confusing `UserProfile` type with `UserProfile` component** (Type: factual_error): The type `UserProfile` from `@mattermost/types/users` is imported in 50+ files for TypeScript typing purposes. These are NOT renderers of the component. Only files that import from `components/user_profile` (or `components/user_profile/user_profile`) and use `<UserProfile` / `<UserProfileComponent` / `<UserProfileElement` in JSX are actual renderers.

2. **Claiming SearchResultsItem is a separate component** (Type: factual_error): There is no `SearchResultsItem` component in this codebase. Search results are rendered by the generic `PostComponent` with `location={Locations.SEARCH}`, which then renders `PostUserProfile`, which renders `UserProfile`. An agent might incorrectly name a "SearchResultsItem" component based on the `isSearchResultsItem` prop on `PostOptions` or from i18n string references.

3. **Counting PostComponent as a direct renderer** (Type: factual_error): `PostComponent` (`components/post/post_component.tsx`) does NOT directly render `<UserProfile>`. It renders `<PostUserProfile>`, which is the actual direct renderer. An agent might conflate the two.

4. **Missing aliased imports** (Type: factual_error): Three components import UserProfile under different names: `EditedPostItem` uses `UserProfileComponent`, `PostMessagePreview` uses `UserProfileComponent`, and `AboutAreaGM` uses `UserProfileElement`. A naive search for only `<UserProfile` in JSX would miss these if the agent doesn't also check import statements.

## Coverage Topics

1. PostUserProfile: The primary consumer of UserProfile, handling multiple post type scenarios (normal, compact, webhook, auto-responder, system messages) and rendering UserProfile in several code branches. Used by the main post component for all post locations.

2. RhsCard: Renders UserProfile in the right-hand side card view, with separate handling for default posts and posts with overridden usernames, with popover disabled.

3. UserListRow: Renders UserProfile in user list modals (channel members, team members, system console users) with the @username displayed.

4. CommentedOn: Renders UserProfile to display the parent post author's name in the "commented on" header above reply posts. Notably imports the unwrapped component directly, bypassing the Redux-connected wrapper.

5. ChannelIntroMessage: Renders UserProfile in the DM channel intro area to display the conversation partner's name alongside their profile picture.

## Expected Scores (from Manual Olympics)

| Agent | Coverage | Accuracy | Notes |
|-------|----------|----------|-------|
| Maproom | 2/3 | 3/3 | Scored 11/12 in R8. Found 6 of 7 renderers (missed the search results rendering path). Fast (48s), efficient (20 tool calls). |
| Explore | 3/3 | 3/3 | Scored 11/12 in R8. Found all 7 renderers including the search results path. Slower (70s), more tool calls (34). Slight efficiency penalty. |
