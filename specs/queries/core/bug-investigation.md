# Bug Investigation Queries — "Where might X go wrong?"

## fastapi-bug-investigation-1

**Codebase:** fastapi
**Category:** bug-investigation
**Difficulty:** medium
**Query:** Where could dependency injection fail silently in FastAPI? Look for places where dependency resolution errors might be swallowed or where a dependency's cleanup code (in `yield` dependencies) might not execute.

## fastapi-bug-investigation-2

**Codebase:** fastapi
**Category:** bug-investigation
**Difficulty:** hard
**Query:** What happens in FastAPI when a response validation error occurs? Trace where `ResponseValidationError` is raised and whether there are any code paths where it could result in an unhandled 500 error instead of a structured error response.

## django-bug-investigation-1

**Codebase:** django
**Category:** bug-investigation
**Difficulty:** medium
**Query:** Where are SQL queries constructed in Django's ORM that could be vulnerable to injection if used incorrectly? Find places where raw SQL or string formatting is used in the query construction pipeline.

## django-bug-investigation-2

**Codebase:** django
**Category:** bug-investigation
**Difficulty:** hard
**Query:** What race conditions could occur in Django's migration executor when running migrations concurrently? Examine how the migration recorder tracks applied migrations and whether there are atomicity gaps.

## mattermost-bug-investigation-1

**Codebase:** mattermost-webapp
**Category:** bug-investigation
**Difficulty:** medium
**Query:** Find places in the mattermost-webapp where WebSocket reconnection could cause state inconsistencies. What happens to pending messages or channel state when the WebSocket connection drops and reconnects?

## mattermost-bug-investigation-2

**Codebase:** mattermost-webapp
**Category:** bug-investigation
**Difficulty:** hard
**Query:** Where could the mattermost-webapp's Redux state get corrupted due to missing error handling in action creators? Find async action creators that dispatch success actions but don't properly handle or dispatch failure states.
