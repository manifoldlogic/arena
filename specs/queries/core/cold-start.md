# Cold Start Queries

**Category description:** These queries ask for high-level architectural orientation without providing any specific file names, function names, or module hints. They simulate a developer encountering the codebase for the first time and needing to build a mental model. The agent must navigate the codebase with zero initial context to identify the key architectural components and their relationships.

## fastapi-cold-start-1

**Codebase:** fastapi
**Category:** cold-start
**Difficulty:** easy
**Query:** I just cloned the FastAPI repository. What are the main architectural components and how is the source code organized? Give me a map of the key modules and what each one is responsible for.

## fastapi-cold-start-2

**Codebase:** fastapi
**Category:** cold-start
**Difficulty:** medium
**Query:** I need to understand how this Python web framework processes an incoming API call. Without any prior knowledge of the codebase, walk me through the key abstractions — from receiving the request to returning the response — identifying the relevant source modules.

## django-cold-start-1

**Codebase:** django
**Category:** cold-start
**Difficulty:** easy
**Query:** I just cloned the Django repository. Give me a high-level architectural overview: what are the main packages, how are they organized, and what role does each play in the framework?

## django-cold-start-2

**Codebase:** django
**Category:** cold-start
**Difficulty:** medium
**Query:** I need to add a new feature to this web framework that touches the database, the HTTP layer, and the admin interface. Without knowing any file names, explain the main subsystems I would need to understand and how they connect to each other.

## mattermost-cold-start-1

**Codebase:** mattermost-webapp
**Category:** cold-start
**Difficulty:** easy
**Query:** I just joined a team working on this React application. Give me a high-level architectural overview: how is the code organized, what are the main directories, and what patterns does the project follow?

## mattermost-cold-start-2

**Codebase:** mattermost-webapp
**Category:** cold-start
**Difficulty:** medium
**Query:** I need to understand the data flow in this application — from user interaction to server communication and back to the UI update. Without knowing any specific file names, explain the key architectural layers and how data moves between them.
