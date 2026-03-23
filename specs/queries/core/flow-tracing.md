# Flow Tracing Queries — "Trace the lifecycle of X"

## fastapi-flow-tracing-1

**Codebase:** fastapi
**Category:** flow-tracing
**Difficulty:** medium
**Query:** Trace the lifecycle of an HTTP request in FastAPI from when it arrives at the ASGI app to when a JSON response is sent. What classes and functions does it pass through?

## fastapi-flow-tracing-2

**Codebase:** fastapi
**Category:** flow-tracing
**Difficulty:** hard
**Query:** Trace how a WebSocket connection is established and managed in FastAPI. Follow the code path from the `@app.websocket` decorator through connection acceptance, message handling, and disconnection.

## django-flow-tracing-1

**Codebase:** django
**Category:** flow-tracing
**Difficulty:** medium
**Query:** Trace the lifecycle of a Django HTTP request from the WSGI handler through middleware processing and view dispatch to the response. What is the exact order of operations?

## django-flow-tracing-2

**Codebase:** django
**Category:** flow-tracing
**Difficulty:** hard
**Query:** Trace what happens when `manage.py migrate` is executed. Follow the code path from the management command through the migration loader, graph construction, executor, and individual operation application.

## mattermost-flow-tracing-1

**Codebase:** mattermost-webapp
**Category:** flow-tracing
**Difficulty:** medium
**Query:** Trace the lifecycle of a new post being created in the mattermost-webapp. Follow the flow from the user typing in the message input through Redux actions to the API call.

## mattermost-flow-tracing-2

**Codebase:** mattermost-webapp
**Category:** flow-tracing
**Difficulty:** hard
**Query:** Trace the full login flow in mattermost-webapp. Start from the login page component, through form submission, API call, token storage, WebSocket connection establishment, and redirect to the main view.
