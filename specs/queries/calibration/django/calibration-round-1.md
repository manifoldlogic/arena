# Calibration Round 1 — Django (Easy)

This is a pre-scored calibration round. The judge must score the competitor output below and match the official scores within 1 point on each dimension before proceeding to score actual competition rounds.

---

**Query:** django-conceptual-1 (easy)
> How does Django's CSRF protection middleware work? What steps does it take to validate a request?

**Competitor output (excerpt):**

> Django's CSRF protection is implemented in `CsrfViewMiddleware` in `django/middleware/csrf.py`.
>
> The middleware works in three phases:
>
> 1. **process_request**: Reads the CSRF secret from the `csrftoken` cookie.
>
> 2. **process_view**: For unsafe HTTP methods (POST, PUT, PATCH, DELETE), it:
>    - Checks for the CSRF token in the POST data field `csrfmiddlewaretoken` or the `X-CSRFToken` header
>    - Compares the token against the cookie value using a masking scheme: `_unmask_cipher_token()` extracts the secret, then `_does_token_match()` compares
>    - If validation fails, calls `_reject()` which returns a 403 Forbidden response
>
> 3. **process_response**: Sets/refreshes the CSRF cookie if needed.
>
> Views can opt out with the `@csrf_exempt` decorator. The `@ensure_csrf_cookie` decorator forces the cookie to be set even on GET requests.
>
> The token uses a masking scheme where the displayed token is `salt + encrypted_secret` (64 characters total), and the actual secret is 32 characters from `CSRF_ALLOWED_CHARS` (letters and digits).

**Official scores:** Precision: 4, Recall: 3, Insight: 3

**Scoring rationale:**

- **Precision: 4** — Core facts are accurate: the three middleware methods, unsafe method check, the `csrfmiddlewaretoken` POST field, the `X-CSRFToken` header, `_unmask_cipher_token()`, `_does_token_match()`, `_reject()`, the token length constants (32/64), and the decorators. Minor imprecision: the description of the masking as "salt + encrypted_secret" is a simplification — the actual masking uses XOR cipher with a random mask, not traditional encryption. But no outright errors.

- **Recall: 3** — Covers the main validation flow, the cookie/header token sources, the masking mechanism, and the decorators. Missing: (a) the HTTPS-specific `Referer` header check against `CSRF_TRUSTED_ORIGINS`; (b) the `CSRF_USE_SESSIONS` alternative where the token is stored in the session instead of a cookie (via `CSRF_SESSION_KEY = "_csrftoken"`); (c) the failure view delegation through `settings.CSRF_FAILURE_VIEW`. The core mechanism is described but 2 secondary features are absent.

- **Insight: 3** — Explains the three-phase middleware pattern and the masking/unmasking concept. Does not connect to broader patterns: why masking is used (to prevent BREACH attack leaking the token via compression side-channels), how the `process_request`/`process_view` split is a Django middleware pattern shared by other middleware, or how `CSRF_TRUSTED_ORIGINS` enables cross-origin CSRF token validation for multi-domain deployments. Main flow explained, secondary architectural connections missed.
