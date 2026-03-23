# Calibration Round 1 — FastAPI (Easy)

This is a pre-scored calibration round. The judge must score the competitor output below and match the official scores within 1 point on each dimension before proceeding to score actual competition rounds.

---

**Query:** fastapi-conceptual-1 (easy)
> How does FastAPI handle request validation errors? What response format does it return when validation fails?

**Competitor output (excerpt):**

> FastAPI uses Pydantic for request validation. When a request has invalid data, a `RequestValidationError` is raised. This exception is defined in `fastapi/exceptions.py`.
>
> The default handler is `request_validation_exception_handler` in `fastapi/exception_handlers.py`. It returns a JSON response with status code 422 and a body like:
> ```json
> {"detail": [{"loc": ["query", "item_id"], "msg": "value is not a valid integer", "type": "type_error.integer"}]}
> ```
>
> The handler calls `jsonable_encoder(exc.errors())` to serialize the Pydantic validation errors, then wraps them in a `JSONResponse`.
>
> You can override this behavior by passing a custom exception handler to the `FastAPI()` constructor:
> ```python
> app = FastAPI(exception_handlers={RequestValidationError: my_handler})
> ```

**Official scores:** Precision: 4, Recall: 3, Insight: 3

**Scoring rationale:**

- **Precision: 4** — All cited facts are correct: `RequestValidationError` in `fastapi/exceptions.py`, the handler in `exception_handlers.py`, the 422 status, the `jsonable_encoder` call, and the override mechanism. One minor imprecision: the error format example uses Pydantic v1 style (`type_error.integer`) while the current codebase uses Pydantic v2 format. Nearly all correct, trivial imprecision.

- **Recall: 3** — Covers the main path (exception class, handler, response format, override). Missing: the `WebSocketRequestValidationError` parallel path and its handler `websocket_request_validation_exception_handler` which closes WebSocket with `WS_1008_POLICY_VIOLATION`. Also does not mention that `FastAPI` inherits from `Starlette` and the exception handling flows through Starlette's `ExceptionMiddleware`. The core answer is complete but 1-2 secondary locations are missing.

- **Insight: 3** — Explains the main flow (Pydantic raises -> handler catches -> JSON response) and shows how to override. Does not draw connections to the Starlette exception middleware architecture, does not explain why 422 was chosen over 400 (HTTP spec for "Unprocessable Entity"), and does not note that `jsonable_encoder` handles nested Pydantic models in the error output. Some connections explained but secondary relationships missed.
