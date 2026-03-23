# Relationship Queries — "What calls/renders/imports X?"

## fastapi-relationship-1

**Codebase:** fastapi
**Category:** relationship
**Difficulty:** easy
**Query:** What modules import from `fastapi.exceptions`? Which specific exception classes are imported by each consumer?

## fastapi-relationship-2

**Codebase:** fastapi
**Category:** relationship
**Difficulty:** medium
**Query:** What is the relationship between `FastAPI`, `APIRouter`, and `APIRoute`? Which class instantiates or delegates to which, and how do routes get registered on the application?

## fastapi-relationship-3

**Codebase:** fastapi
**Category:** relationship
**Difficulty:** hard
**Query:** Trace all the callers of `solve_dependencies` in the FastAPI codebase. What invokes it, what does it return, and how does its output flow into request handling?

## django-relationship-1

**Codebase:** django
**Category:** relationship
**Difficulty:** easy
**Query:** What imports and uses `django.core.signing`? Which Django subsystems depend on the signing module?

## django-relationship-2

**Codebase:** django
**Category:** relationship
**Difficulty:** medium
**Query:** What is the relationship between Django's `Form`, `ModelForm`, and `BaseForm` classes? How does `ModelForm` connect the form system to the ORM?

## django-relationship-3

**Codebase:** django
**Category:** relationship
**Difficulty:** hard
**Query:** What components import from or interact with `django.db.migrations.executor`? Trace how the migration executor is used by management commands and the test framework.

## mattermost-relationship-1

**Codebase:** mattermost-webapp
**Category:** relationship
**Difficulty:** easy
**Query:** What components render the `FormattedMessage` component? Find the most common parent components that use it.

## mattermost-relationship-2

**Codebase:** mattermost-webapp
**Category:** relationship
**Difficulty:** medium
**Query:** What components and selectors depend on the `custom_status` selector module? Trace how custom status data flows from the Redux store to UI components.

## mattermost-relationship-3

**Codebase:** mattermost-webapp
**Category:** relationship
**Difficulty:** hard
**Query:** What is the full dependency chain of the plugin registry system? What imports `registry.ts`, what does the registry import, and how do plugins get registered and invoked?
