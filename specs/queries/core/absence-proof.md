# Absence Proof Queries — "Does the codebase have X?"

Queries in this category ask about features that may or may not exist. The agent must correctly identify whether the feature is present (and where) or absent (and confirm it is not there). Each codebase has at least one "present" and one "absent" query.

## fastapi-absence-proof-1

**Codebase:** fastapi
**Category:** absence-proof
**Difficulty:** easy
**Query:** Does FastAPI have built-in rate limiting support? If so, where is it implemented? If not, confirm that no rate limiting logic exists anywhere in the codebase.

## fastapi-absence-proof-2

**Codebase:** fastapi
**Category:** absence-proof
**Difficulty:** medium
**Query:** Does FastAPI have built-in support for WebSocket connections? If so, describe the WebSocket handling infrastructure and where it is implemented.

## fastapi-absence-proof-3

**Codebase:** fastapi
**Category:** absence-proof
**Difficulty:** hard
**Query:** Does FastAPI implement its own CORS middleware, or does it re-export Starlette's? Trace the actual implementation to determine whether FastAPI adds any CORS logic beyond what Starlette provides.

## django-absence-proof-1

**Codebase:** django
**Category:** absence-proof
**Difficulty:** easy
**Query:** Does Django have built-in support for GraphQL? Search the entire codebase for any GraphQL-related code, schemas, or views.

## django-absence-proof-2

**Codebase:** django
**Category:** absence-proof
**Difficulty:** medium
**Query:** Does Django have a built-in task queue system (similar to Celery)? Search the codebase for any task scheduling, background job, or async task infrastructure.

## django-absence-proof-3

**Codebase:** django
**Category:** absence-proof
**Difficulty:** hard
**Query:** Does Django have built-in Content Security Policy (CSP) middleware? If so, where is it implemented and what directives does it support?

## mattermost-absence-proof-1

**Codebase:** mattermost-webapp
**Category:** absence-proof
**Difficulty:** easy
**Query:** Does the mattermost-webapp have a dark mode or theme switching feature? If so, where is theme configuration managed?

## mattermost-absence-proof-2

**Codebase:** mattermost-webapp
**Category:** absence-proof
**Difficulty:** medium
**Query:** Does mattermost-webapp implement virtual scrolling or windowed rendering for long message lists? Search for virtualization libraries or custom implementations.

## mattermost-absence-proof-3

**Codebase:** mattermost-webapp
**Category:** absence-proof
**Difficulty:** hard
**Query:** Does mattermost-webapp have a custom status feature with TTL (time-to-live) expiry? If so, trace where the TTL is set, stored, and where expiration is handled on the client side.
