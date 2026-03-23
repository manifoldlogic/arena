# Ambiguous Premise Queries

**Category description:** These queries assert something about the codebase that may be false, partially true, or based on a misunderstanding. The agent must identify the incorrect or incomplete premise and provide an accurate answer rather than accepting the premise at face value. This tests whether agents blindly confirm leading questions or critically evaluate assertions against the actual code.

## fastapi-ambiguous-premise-1

**Codebase:** fastapi
**Category:** ambiguous-premise
**Difficulty:** medium
**Query:** FastAPI uses a custom event loop implementation for handling async requests. Where is this custom event loop defined and how does it differ from the standard asyncio loop?

## fastapi-ambiguous-premise-2

**Codebase:** fastapi
**Category:** ambiguous-premise
**Difficulty:** hard
**Query:** FastAPI implements its own HTTP routing engine from scratch rather than using Starlette's router. Where is this custom routing implementation and what improvements does it make over Starlette's approach?

## django-ambiguous-premise-1

**Codebase:** django
**Category:** ambiguous-premise
**Difficulty:** medium
**Query:** Django's ORM uses the Active Record pattern where model instances manage their own persistence. Where is the Active Record base class defined and how does it implement the `save()` and `delete()` operations?

## django-ambiguous-premise-2

**Codebase:** django
**Category:** ambiguous-premise
**Difficulty:** hard
**Query:** Django's template engine compiles templates to Python bytecode for performance. Where is the bytecode compilation step implemented and how does the template cache work?

## mattermost-ambiguous-premise-1

**Codebase:** mattermost-webapp
**Category:** ambiguous-premise
**Difficulty:** medium
**Query:** The mattermost-webapp uses MobX for state management alongside Redux. Where are the MobX stores defined and how do they interact with the Redux store?

## mattermost-ambiguous-premise-2

**Codebase:** mattermost-webapp
**Category:** ambiguous-premise
**Difficulty:** hard
**Query:** The mattermost-webapp implements server-side rendering (SSR) for the initial page load. Where is the SSR entry point and how does it hydrate the client-side React application?
