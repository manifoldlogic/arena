# Calibration Anchors — FastAPI

Codebase-specific anchor examples for the FastAPI codebase. Each anchor shows a concrete example of what a competitor response at a given score level looks like, referencing actual files and patterns in the FastAPI repository.

---

## Precision

### Precision — Score 1

**Example output excerpt:**
> The request validation in FastAPI is handled by `fastapi/validators.py` which defines a `RequestValidator` class. When validation fails, it raises a `ValueError` that gets caught by the ASGI middleware and returns a 400 response.

**Why this scores 1:** Nearly every factual claim is wrong. There is no `fastapi/validators.py` file; there is no `RequestValidator` class. Validation errors return 422 (not 400). The actual path is through Pydantic validation raising `RequestValidationError` in `fastapi/exceptions.py`, handled by `request_validation_exception_handler` in `fastapi/exception_handlers.py`. The response is made by Starlette, not "ASGI middleware."

### Precision — Score 2

**Example output excerpt:**
> FastAPI uses Pydantic for validation. When a request fails validation, the `RequestValidationError` exception is raised in `fastapi/exceptions.py`. This gets handled somewhere in the routing layer and returns a JSON error response. FastAPI also has a `WebSocketException` class in the same file for WebSocket errors.

**Why this scores 2:** The agent correctly identifies `RequestValidationError` in `fastapi/exceptions.py` and the Pydantic connection. But it vaguely says "somewhere in the routing layer" instead of identifying `request_validation_exception_handler` in `fastapi/exception_handlers.py`. The claim about `WebSocketException` is imprecise: the file actually defines `WebSocketRequestValidationError`, not `WebSocketException` (that is in Starlette). Mix of correct and incorrect details.

### Precision — Score 3

**Example output excerpt:**
> When validation fails, FastAPI raises `RequestValidationError` (defined in `fastapi/exceptions.py`). The default handler is `request_validation_exception_handler` in `fastapi/exception_handlers.py`, which returns a 422 JSON response with the error details via `jsonable_encoder(exc.errors())`. The `FastAPI` application class in `fastapi/applications.py` registers this handler by default.

**Why this scores 3:** All major claims are correct and reference real files and functions. Minor imprecision: the agent does not mention that `FastAPI` inherits from `Starlette` and that the exception handler registration happens through Starlette's exception middleware mechanism — a small gap but not an error.

### Precision — Score 4

**Example output excerpt:**
> Validation errors produce `RequestValidationError` (subclass of Pydantic's `ValidationError`, defined in `fastapi/exceptions.py`). The default handler `request_validation_exception_handler` in `fastapi/exception_handlers.py` calls `jsonable_encoder(exc.errors())` and returns a `JSONResponse` with status 422. The `FastAPI` class in `fastapi/applications.py` registers this handler during `__init__` via exception handler mapping. For WebSocket validation errors, `WebSocketRequestValidationError` is handled separately by `websocket_request_validation_exception_handler`, which closes the connection with code `WS_1008_POLICY_VIOLATION`.

**Why this scores 4:** All cited locations and behaviors are correct. The WebSocket detail is accurate (WS_1008_POLICY_VIOLATION is indeed used). One trivial imprecision: `RequestValidationError` is not technically a subclass of Pydantic's `ValidationError` — it inherits from plain `Exception` and wraps validation errors. This is a very minor factual slip.

### Precision — Score 5

**Example output excerpt:**
> Validation errors raise `RequestValidationError` (defined in `fastapi/exceptions.py`, inherits from `Exception`, stores errors in `self.errors`). The default handler is `request_validation_exception_handler` in `fastapi/exception_handlers.py`: it calls `jsonable_encoder(exc.errors())` and wraps the result in `JSONResponse(status_code=422, content={"detail": ...})`. The `FastAPI.__init__` in `fastapi/applications.py` adds this to the exception handlers dict, which is processed by Starlette's `ExceptionMiddleware`. For WebSocket requests, `WebSocketRequestValidationError` triggers `websocket_request_validation_exception_handler`, which calls `websocket.close(code=WS_1008_POLICY_VIOLATION, reason=jsonable_encoder(exc.errors()))`. Custom handlers can override these by passing `exception_handlers` to the `FastAPI()` constructor.

**Why this scores 5:** Every fact is verifiable: the inheritance chain, the response format, the Starlette `ExceptionMiddleware` integration, the WebSocket close code, and the override mechanism. Zero noise, zero errors.

---

## Recall

### Recall — Score 1

**Example output excerpt:**
> FastAPI handles security through the `fastapi/security/oauth2.py` file, which defines `OAuth2PasswordRequestForm`.

**Why this scores 1:** The query asked to find all security scheme classes. The agent found only one class in one file, missing `APIKeyQuery`/`APIKeyCookie`/`APIKeyHeader` in `security/api_key.py`, `HTTPBasic`/`HTTPBearer`/`HTTPDigest` in `security/http.py`, `OAuth2`/`OAuth2PasswordBearer`/`OAuth2AuthorizationCodeBearer` in `security/oauth2.py`, and `OpenIdConnect` in `security/open_id_connect_url.py`. Found roughly 1 of 10+ classes.

### Recall — Score 2

**Example output excerpt:**
> FastAPI defines these security scheme classes:
> - `OAuth2PasswordBearer` and `OAuth2PasswordRequestForm` in `fastapi/security/oauth2.py`
> - `HTTPBasic` and `HTTPBearer` in `fastapi/security/http.py`

**Why this scores 2:** Found 4 of 10+ classes across 2 of 4 files. Missed the entire `api_key.py` module (3 classes: `APIKeyQuery`, `APIKeyCookie`, `APIKeyHeader`), `HTTPDigest` in `http.py`, `OAuth2AuthorizationCodeBearer` and the base `OAuth2` class in `oauth2.py`, and `OpenIdConnect` in `open_id_connect_url.py`. Important gaps that change the picture of FastAPI's security support.

### Recall — Score 3

**Example output excerpt:**
> Security scheme classes in FastAPI:
> - `fastapi/security/oauth2.py`: `OAuth2`, `OAuth2PasswordBearer`, `OAuth2AuthorizationCodeBearer`, `OAuth2PasswordRequestForm`, `OAuth2PasswordRequestFormStrict`
> - `fastapi/security/http.py`: `HTTPBasic`, `HTTPBearer`, `HTTPDigest`
> - `fastapi/security/api_key.py`: `APIKeyQuery`, `APIKeyCookie`, `APIKeyHeader`

**Why this scores 3:** Found the majority — all classes in `oauth2.py`, `http.py`, and `api_key.py`. Missing `OpenIdConnect` from `security/open_id_connect_url.py` and the `SecurityBase` base class in `security/base.py`. The core answer is substantially complete but two secondary locations are absent.

### Recall — Score 4

**Example output excerpt:**
> Security scheme classes:
> - `fastapi/security/oauth2.py`: `OAuth2`, `OAuth2PasswordBearer`, `OAuth2AuthorizationCodeBearer`, `OAuth2PasswordRequestForm`, `OAuth2PasswordRequestFormStrict`
> - `fastapi/security/http.py`: `HTTPBasic`, `HTTPBearer`, `HTTPDigest`, `HTTPBasicCredentials`, `HTTPAuthorizationCredentials`
> - `fastapi/security/api_key.py`: `APIKeyBase`, `APIKeyQuery`, `APIKeyCookie`, `APIKeyHeader`
> - `fastapi/security/open_id_connect_url.py`: `OpenIdConnect`
> - `fastapi/security/base.py`: `SecurityBase`

**Why this scores 4:** Found all files and nearly all classes. The only minor omission is `security/utils.py` which defines `get_authorization_scheme_param` — a utility function used by the security classes rather than a security scheme class itself, so this omission does not materially change the answer.

### Recall — Score 5

**Example output excerpt:**
> Complete security module contents:
> - `fastapi/security/base.py`: `SecurityBase` (abstract base for all security schemes)
> - `fastapi/security/api_key.py`: `APIKeyBase`, `APIKeyQuery`, `APIKeyCookie`, `APIKeyHeader` (API key in query/cookie/header)
> - `fastapi/security/http.py`: `HTTPBasicCredentials`, `HTTPAuthorizationCredentials`, `HTTPBase`, `HTTPBasic`, `HTTPBearer`, `HTTPDigest`
> - `fastapi/security/oauth2.py`: `OAuth2`, `OAuth2PasswordBearer`, `OAuth2AuthorizationCodeBearer`, `OAuth2PasswordRequestForm`, `OAuth2PasswordRequestFormStrict`
> - `fastapi/security/open_id_connect_url.py`: `OpenIdConnect`
> - `fastapi/security/utils.py`: `get_authorization_scheme_param` (helper used by HTTP/OAuth2 schemes)
> - `fastapi/security/__init__.py`: re-exports all public classes

**Why this scores 5:** Every file in the `security/` module is listed with its classes. Nothing material is missing — the agent even includes the utility function and the `__init__.py` re-exports.

---

## Insight

### Insight — Score 1

**Example output excerpt:**
> Security classes are in:
> - `fastapi/security/oauth2.py`
> - `fastapi/security/http.py`
> - `fastapi/security/api_key.py`
> - `fastapi/security/open_id_connect_url.py`

**Why this scores 1:** Pure file listing with no explanation of what the classes do, how they relate, or how they are used. No mention of the inheritance pattern, the dependency injection integration, or the OpenAPI metadata generation.

### Insight — Score 2

**Example output excerpt:**
> FastAPI has several security schemes. `HTTPBasic` handles basic auth, `HTTPBearer` handles bearer tokens, `OAuth2PasswordBearer` handles OAuth2 password flow, and `APIKeyQuery` handles API keys in query parameters. Each class is a callable that can be used as a dependency.

**Why this scores 2:** Describes what each class does individually but draws no connections between them. Does not explain the `SecurityBase` inheritance pattern, the `__call__` protocol that makes them work with `Depends()`, or how they generate OpenAPI security scheme metadata.

### Insight — Score 3

**Example output excerpt:**
> All security classes inherit from `SecurityBase` in `fastapi/security/base.py`, which provides a `model` attribute for OpenAPI schema generation. Each security class implements `__call__` so it can be used with FastAPI's `Depends()` — when a request arrives, the dependency injection system calls the security class to extract credentials. For example, `HTTPBearer.__call__` reads the `Authorization` header and returns `HTTPAuthorizationCredentials`.

**Why this scores 3:** Identifies the main architectural pattern (SecurityBase + `__call__` + Depends) and gives a concrete example. Misses the connection to OpenAPI metadata generation (how `model` attributes are collected by `get_openapi()` to produce the security section of the spec) and does not note the `auto_error` pattern shared across classes.

### Insight — Score 4

**Example output excerpt:**
> FastAPI's security module follows a consistent pattern: all scheme classes inherit from `SecurityBase` (in `base.py`), which stores a `model` attribute — a Pydantic model matching the OpenAPI security scheme spec. This model is collected during OpenAPI generation (`fastapi/openapi/utils.py`) to produce the spec's `securitySchemes` section.
>
> Each class implements `async def __call__(self, request: Request)` making it usable with `Depends()`. The dependency injection system in `fastapi/dependencies/utils.py` calls it at request time, extracting credentials from headers, cookies, or query params. All classes share an `auto_error` flag — when `True`, they raise `HTTPException(401)` on missing credentials; when `False`, they return `None`, letting the endpoint handle it.
>
> The API key classes (`APIKeyQuery`, `APIKeyCookie`, `APIKeyHeader`) differ from HTTP/OAuth2 classes in where they look for the credential, but share the same base pattern.

**Why this scores 4:** Traces the full pattern: inheritance, OpenAPI integration, dependency injection flow, and the `auto_error` convention. Identifies the architectural reasoning. Misses the subtlety that `OAuth2PasswordRequestForm` is not a security scheme but a form data dependency (often confused with the security classes), which would be a non-obvious insight.

### Insight — Score 5

**Example output excerpt:**
> FastAPI's security module implements a dual-purpose pattern: each class simultaneously serves as (1) a dependency injection callable that extracts credentials at request time, and (2) a declarative OpenAPI metadata provider via its `model` attribute.
>
> The hierarchy is: `SecurityBase` (stores `model` for OpenAPI) -> specific scheme classes. Each implements `async __call__(self, request)` for use with `Depends()`. The `auto_error` pattern across all classes creates a consistent optional-auth API: `auto_error=True` raises 401, `False` returns `None`.
>
> Important distinction often missed: `OAuth2PasswordRequestForm` and `OAuth2PasswordRequestFormStrict` are NOT security schemes — they are form-data dependencies for the token endpoint. They do not inherit from `SecurityBase` and have no `model` attribute. They exist in `security/oauth2.py` for organizational convenience but serve a different purpose.
>
> The OpenAPI integration works because `fastapi/openapi/utils.py` walks the dependency tree of each route, finds any dependency whose class has a `model` attribute (via `SecurityBase`), and collects those into the spec's `securitySchemes`. This means simply using `Depends(HTTPBearer())` on a route automatically documents it as requiring bearer auth in the generated spec — no manual configuration needed.

**Why this scores 5:** Surfaces non-obvious insights: the dual-purpose pattern, the OAuth2PasswordRequestForm distinction, and the automatic OpenAPI integration mechanism. Explains not just what happens but why the code is structured this way.
