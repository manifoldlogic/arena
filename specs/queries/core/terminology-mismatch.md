# Terminology Mismatch Queries

**Category description:** These queries deliberately use terminology that a developer would naturally use but that does NOT appear in the codebase source code. This tests whether a search tool can bridge the gap between the user's mental model and the actual codebase terminology. Each query includes metadata identifying the FTS-unfriendly term and the actual codebase term it maps to.

## fastapi-terminology-mismatch-1

**Codebase:** fastapi
**Category:** terminology-mismatch
**Difficulty:** medium
**FTS-unfriendly term:** controller
**Actual codebase term:** route / path operation function
**Query:** Where are the controllers defined in FastAPI? How does the framework map URL paths to controller methods?

## fastapi-terminology-mismatch-2

**Codebase:** fastapi
**Category:** terminology-mismatch
**Difficulty:** hard
**FTS-unfriendly term:** request pipeline / interceptor
**Actual codebase term:** middleware
**Query:** How does FastAPI's request pipeline work? Where are interceptors configured to process requests before they reach the endpoint handler?

## django-terminology-mismatch-1

**Codebase:** django
**Category:** terminology-mismatch
**Difficulty:** medium
**FTS-unfriendly term:** data access object (DAO)
**Actual codebase term:** Manager / QuerySet
**Query:** Where are the data access objects (DAOs) defined in Django? How does the framework abstract database access behind a DAO layer?

## django-terminology-mismatch-2

**Codebase:** django
**Category:** terminology-mismatch
**Difficulty:** hard
**FTS-unfriendly term:** schema migration
**Actual codebase term:** migration (django.db.migrations)
**Query:** How does Django handle schema migrations? Where is the schema migration engine implemented and what strategies does it use to detect schema drift?

## django-terminology-mismatch-3

**Codebase:** django
**Category:** terminology-mismatch
**Difficulty:** medium
**FTS-unfriendly term:** blueprint
**Actual codebase term:** URLconf / urls.py patterns
**Query:** How are blueprints used to organize routes in Django? Where are blueprints registered with the main application?

## mattermost-terminology-mismatch-1

**Codebase:** mattermost-webapp
**Category:** terminology-mismatch
**Difficulty:** medium
**FTS-unfriendly term:** view model / ViewModel
**Actual codebase term:** selector (reselect) / mapStateToProps
**Query:** Where are the view models defined in mattermost-webapp? How does the application separate presentation logic from business data using the ViewModel pattern?

## mattermost-terminology-mismatch-2

**Codebase:** mattermost-webapp
**Category:** terminology-mismatch
**Difficulty:** hard
**FTS-unfriendly term:** state management library / store enhancer
**Actual codebase term:** Redux store / configureStore
**Query:** What state management library does mattermost-webapp use and where are the store enhancers configured? How does the state management layer handle persistence and rehydration?

## mattermost-terminology-mismatch-3

**Codebase:** mattermost-webapp
**Category:** terminology-mismatch
**Difficulty:** medium
**FTS-unfriendly term:** virtual DOM reconciliation
**Actual codebase term:** React rendering / component lifecycle
**Query:** Where does the mattermost-webapp optimize virtual DOM reconciliation? Find the components or utilities that implement custom reconciliation strategies to improve rendering performance.
