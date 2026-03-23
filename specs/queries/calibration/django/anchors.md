# Calibration Anchors — Django

Codebase-specific anchor examples for the Django codebase. Each anchor shows a concrete example of what a competitor response at a given score level looks like, referencing actual files and patterns in the Django repository.

---

## Precision

### Precision — Score 1

**Example output excerpt:**
> Django's middleware classes are defined in `django/middleware/base.py` which contains a `BaseMiddleware` class that all middleware inherits from. The middleware pipeline is configured in `MIDDLEWARE_CLASSES` setting and processed by the `MiddlewareHandler` in `django/core/middleware.py`.

**Why this scores 1:** Nearly everything is fabricated. There is no `django/middleware/base.py`, no `BaseMiddleware` class, and no `django/core/middleware.py`. The setting is `MIDDLEWARE` (not `MIDDLEWARE_CLASSES`, which was deprecated years ago). Middleware processing happens in `django/core/handlers/base.py` via `BaseHandler._get_response`. The agent invented file paths and class names.

### Precision — Score 2

**Example output excerpt:**
> Django's CSRF protection is in `django/middleware/csrf.py`. The `CsrfViewMiddleware` checks incoming POST requests for a CSRF token. It compares the token from the form data against a cookie value. If they do not match, it returns a 403 response. The middleware can be disabled per-view with `@csrf_exempt`.

**Why this scores 2:** Correctly identifies `CsrfViewMiddleware` in `django/middleware/csrf.py` and the general mechanism. But the description oversimplifies significantly: it is not just POST requests (it is all unsafe methods). The token comparison is not a simple equality check — Django uses a masked token with `_unmask_cipher_token()` and `_does_token_match()`. Missing the referer check for HTTPS requests, the `CSRF_TRUSTED_ORIGINS` setting, and the session-based fallback. Mix of correct high-level facts with inaccurate details.

### Precision — Score 3

**Example output excerpt:**
> `CsrfViewMiddleware` in `django/middleware/csrf.py` processes requests in two phases. In `process_request`, it reads the CSRF cookie. In `process_view`, it checks unsafe HTTP methods (POST, PUT, PATCH, DELETE) for a valid token — either from the `csrfmiddlewaretoken` form field or the `X-CSRFToken` header. The token is validated against the cookie using a masking/unmasking scheme with `_unmask_cipher_token()`. Failed validation returns a 403 via `_reject()`.

**Why this scores 3:** Most claims are correct and reference real methods. Minor gap: does not mention the HTTPS referer check (a significant security step), and slightly misattributes — the middleware uses `process_view` not `process_request` for the cookie read in newer Django versions. But the core mechanism is accurately described.

### Precision — Score 4

**Example output excerpt:**
> `CsrfViewMiddleware` in `django/middleware/csrf.py` works as follows:
> 1. `process_request`: reads CSRF secret from the `csrftoken` cookie (or session if `CSRF_USE_SESSIONS` is set via key `_csrftoken`).
> 2. `process_view`: for unsafe methods, validates the token from `csrfmiddlewaretoken` POST field or `X-CSRFToken` / `X-CSRFTOKEN` header. Uses `_check_token()` which calls `_unmask_cipher_token()` and compares via `_does_token_match()`.
> 3. For HTTPS requests, performs Referer header validation against `CSRF_TRUSTED_ORIGINS` and the request's host.
> 4. On failure, calls `_reject()` which delegates to `CSRF_FAILURE_VIEW` (resolved via `_get_failure_view()`).
> Constants: `CSRF_SECRET_LENGTH = 32`, `CSRF_TOKEN_LENGTH = 64`, allowed chars are `ascii_letters + digits`.

**Why this scores 4:** Nearly all details are correct, including the session fallback, the header names, the constant values, and the referer check. One trivial imprecision: the method that reads the cookie is actually in `process_view` in some code paths, and the exact attribute names on the request object could be more precise. But nothing materially wrong.

### Precision — Score 5

**Example output excerpt:**
> `CsrfViewMiddleware` in `django/middleware/csrf.py`:
> 1. `process_request`: Calls `_get_secret(request)` to read the CSRF secret — from the `csrftoken` cookie by default, or from `request.session[CSRF_SESSION_KEY]` (`"_csrftoken"`) if `settings.CSRF_USE_SESSIONS` is True.
> 2. `process_view`: Skips if view has `csrf_exempt` attribute. For unsafe methods (not GET, HEAD, OPTIONS, TRACE): (a) HTTPS requests: validates `Referer` header against `settings.CSRF_TRUSTED_ORIGINS` and the server's own origin via `_check_referer()`; (b) retrieves the request token from POST field `csrfmiddlewaretoken` or headers `HTTP_X_CSRFTOKEN`/`HTTP_X_CSRFTOKEN`; (c) calls `_check_token(request)` which uses `_unmask_cipher_token()` to extract the secret and `_does_token_match()` for constant-time comparison.
> 3. `process_response`: Ensures the CSRF cookie is set/rotated via `_set_csrf_cookie()` if `csrf_cookie_needs_reset` is flagged.
> 4. On failure: `_reject(request, reason)` logs via `logger.warning` and delegates to `_get_failure_view()` which resolves `settings.CSRF_FAILURE_VIEW`.
> Key constants: `CSRF_SECRET_LENGTH = 32`, `CSRF_TOKEN_LENGTH = 2 * CSRF_SECRET_LENGTH = 64`, `CSRF_ALLOWED_CHARS = ascii_letters + digits`.

**Why this scores 5:** Every detail is verifiable against the source: method names, settings keys, the session key constant, the referer check logic, the `process_response` cookie rotation, the constant-time comparison, and the failure view delegation. Zero fabrication.

---

## Recall

### Recall — Score 1

**Example output excerpt:**
> Django's built-in middleware is in `django/middleware/csrf.py` (CSRF protection) and `django/middleware/common.py` (common request/response processing).

**Why this scores 1:** Found only 2 of 10 middleware files. Missed: `cache.py` (cache middleware), `clickjacking.py` (X-Frame-Options), `csp.py` (Content-Security-Policy), `gzip.py` (GZip compression), `http.py` (conditional GET), `locale.py` (locale detection), `security.py` (security headers like HSTS). The query asked to enumerate all built-in middleware.

### Recall — Score 2

**Example output excerpt:**
> Built-in Django middleware in `django/middleware/`:
> - `csrf.py`: `CsrfViewMiddleware`
> - `common.py`: `CommonMiddleware`, `BrokenLinkEmailsMiddleware`
> - `security.py`: `SecurityMiddleware`
> - `clickjacking.py`: `XFrameOptionsMiddleware`

**Why this scores 2:** Found 4 of 10 files. Missing `cache.py` (2 classes), `csp.py`, `gzip.py`, `http.py`, `locale.py`. The missing files contain important middleware that a complete answer requires.

### Recall — Score 3

**Example output excerpt:**
> Built-in middleware in `django/middleware/`:
> - `cache.py`: `UpdateCacheMiddleware`, `FetchFromCacheMiddleware`
> - `clickjacking.py`: `XFrameOptionsMiddleware`
> - `common.py`: `CommonMiddleware`, `BrokenLinkEmailsMiddleware`
> - `csrf.py`: `CsrfViewMiddleware`
> - `gzip.py`: `GZipMiddleware`
> - `http.py`: `ConditionalGetMiddleware`
> - `security.py`: `SecurityMiddleware`

**Why this scores 3:** Found 7 of 10 files and the main classes. Missing `csp.py` (`ContentSecurityPolicyMiddleware`), `locale.py` (`LocaleMiddleware`), and the `__init__.py` which may contain additional middleware or re-exports. The core answer is substantially complete.

### Recall — Score 4

**Example output excerpt:**
> Built-in middleware in `django/middleware/`:
> - `cache.py`: `UpdateCacheMiddleware`, `FetchFromCacheMiddleware`, `CacheMiddleware`
> - `clickjacking.py`: `XFrameOptionsMiddleware`
> - `common.py`: `CommonMiddleware`, `BrokenLinkEmailsMiddleware`
> - `csrf.py`: `CsrfViewMiddleware`
> - `csp.py`: content security policy middleware
> - `gzip.py`: `GZipMiddleware`
> - `http.py`: `ConditionalGetMiddleware`
> - `locale.py`: `LocaleMiddleware`
> - `security.py`: `SecurityMiddleware`

**Why this scores 4:** Found all 9 middleware files. The only minor gap is not listing the specific class name from `csp.py` and missing that `cache.py` defines `CacheMiddleware` as a convenience combining `UpdateCacheMiddleware` and `FetchFromCacheMiddleware`. These omissions do not materially change the answer.

### Recall — Score 5

**Example output excerpt:**
> Complete list of Django built-in middleware in `django/middleware/`:
> - `cache.py`: `UpdateCacheMiddleware`, `FetchFromCacheMiddleware`, `CacheMiddleware` (convenience class combining both)
> - `clickjacking.py`: `XFrameOptionsMiddleware`
> - `common.py`: `CommonMiddleware`, `BrokenLinkEmailsMiddleware`
> - `csrf.py`: `CsrfViewMiddleware`
> - `csp.py`: `ContentSecurityPolicyMiddleware`
> - `gzip.py`: `GZipMiddleware`
> - `http.py`: `ConditionalGetMiddleware`
> - `locale.py`: `LocaleMiddleware`
> - `security.py`: `SecurityMiddleware`
>
> Additionally, `django/contrib/` contains middleware in other packages:
> - `contrib/sessions/middleware.py`: `SessionMiddleware`
> - `contrib/auth/middleware.py`: `AuthenticationMiddleware`, `RemoteUserMiddleware`, `PersistentRemoteUserMiddleware`
> - `contrib/messages/middleware.py`: `MessageMiddleware`
> - `contrib/flatpages/middleware.py`: `FlatpageFallbackMiddleware`

**Why this scores 5:** Found all middleware in the main `middleware/` directory AND the `contrib/` middleware classes that are commonly used. Complete coverage of the answer space, including the `CacheMiddleware` convenience class detail.

---

## Insight

### Insight — Score 1

**Example output excerpt:**
> Django signals:
> - `django/core/signals.py`: `request_started`, `request_finished`, `got_request_exception`, `setting_changed`
> - `django/db/models/signals.py`: `class_prepared`, `pre_init`, `post_init`, `pre_save`, `post_save`, `pre_delete`, `post_delete`, `m2m_changed`

**Why this scores 1:** Pure listing of signal names grouped by file. No explanation of what they do, when they fire, how the dispatch mechanism works, or how they connect to the rest of the framework.

### Insight — Score 2

**Example output excerpt:**
> Django defines signals in several locations. The core signals in `django/core/signals.py` fire during request processing — `request_started` fires when a request begins, `request_finished` when it ends, and `got_request_exception` when an unhandled exception occurs. The model signals in `django/db/models/signals.py` fire during ORM operations like saving and deleting. The auth signal `user_logged_in` fires when a user logs in.

**Why this scores 2:** Basic description of each signal group but no connections. Does not explain HOW signals are dispatched (`Signal.send()` vs `Signal.send_robust()`), how receivers are connected (`Signal.connect()` or the `@receiver` decorator), or the relationship between the `Signal` class in `django/dispatch/dispatcher.py` and the signal instances.

### Insight — Score 3

**Example output excerpt:**
> Django's signal system is built on `Signal` in `django/dispatch/dispatcher.py`. Signal instances are defined across the codebase and fire at specific lifecycle points. Receivers connect via `signal.connect(receiver, sender)` or the `@receiver` decorator. When fired with `signal.send(sender, **kwargs)`, all connected receivers are called synchronously.
>
> Model signals (`pre_save`, `post_save`, etc.) use a subclass `ModelSignal` that supports lazy sender specification by string (e.g., `"app_label.ModelName"`), resolved via the app registry. This is important because models may not be imported yet when signals are connected at module level.

**Why this scores 3:** Identifies the main mechanism (Signal class, connect/send, receiver decorator) and highlights the ModelSignal lazy sender pattern. Misses the distinction between `send()` and `send_robust()` (error handling), the `dispatch_uid` deduplication feature, and does not trace where in Django's own code these signals are actually sent from (e.g., `request_started` is sent in `BaseHandler.get_response`).

### Insight — Score 4

**Example output excerpt:**
> Django's signal system centers on `Signal` in `django/dispatch/dispatcher.py`. The key design decisions:
>
> 1. **Weak references by default**: `Signal.connect()` stores receivers as weak refs (via `weakref.ref`), preventing signals from keeping dead objects alive. This is why a common pattern is storing receivers at module level — local function receivers would be garbage collected.
>
> 2. **`send()` vs `send_robust()`**: `send()` propagates exceptions (used in production code paths like middleware), while `send_robust()` catches and returns them as part of the results (used in management commands and test cleanup where you want all receivers to run).
>
> 3. **`ModelSignal` lazy resolution**: `django/db/models/signals.py` defines `ModelSignal(Signal)` which accepts string senders like `"auth.User"`, resolved lazily through the app registry. This avoids circular imports in signal wiring.
>
> 4. **Where signals fire**: `request_started`/`request_finished` are sent in `django/core/handlers/base.py` (`BaseHandler.get_response`). Model signals fire from `django/db/models/base.py` (`Model.save_base()`, `Model.delete()`). Auth signals fire from `django/contrib/auth/__init__.py`.

**Why this scores 4:** Identifies architectural design decisions (weak references, send vs send_robust, lazy resolution) and traces where signals actually fire. Misses async signal support (`Signal.asend()` / `Signal.asend_robust()` for async receivers) which is a newer but significant addition.

### Insight — Score 5

**Example output excerpt:**
> Django's signal system (`django/dispatch/dispatcher.py`) implements a publish-subscribe pattern with several non-obvious design choices:
>
> 1. **Weak references with a cache invalidation side-channel**: Receivers are stored as weak refs. The `_live_receivers()` method filters dead refs and atomically updates `self.receivers`. A `sender_receivers_cache` dict provides O(1) lookup by sender, cleared on connect/disconnect. The sentinel `NO_RECEIVERS` is cached when no receivers exist, allowing a fast-path skip in hot paths like `Model.save_base()`.
>
> 2. **Sync/async duality**: `send()` calls sync receivers directly. `asend()` handles mixed sync/async receivers — it runs sync receivers via `sync_to_async()` and async receivers natively. This is wired through `_restore_context()` which preserves `contextvars` across the sync-async boundary.
>
> 3. **`ModelSignal` lazy sender**: Uses `partial` to defer `connect()` calls until the sender model's `class_prepared` signal fires. This creates a bootstrapping dependency — `class_prepared` must fire before any model signals can resolve string senders.
>
> 4. **The `dispatch_uid` deduplication trap**: If provided, `dispatch_uid` replaces the receiver identity for uniqueness checking. This prevents double-connection but also means two different receivers with the same `dispatch_uid` will silently shadow each other — a subtle bug source.
>
> 5. **Production signal paths**: `request_started`/`request_finished` bracket `BaseHandler.get_response()` in `django/core/handlers/base.py`. Notably, `request_finished` fires via `send_robust()` to ensure all cleanup receivers run even if one fails. Model signals in `Model.save_base()` use `send()`, meaning a failing `pre_save` receiver aborts the save.

**Why this scores 5:** Surfaces non-obvious details: the caching mechanism with `NO_RECEIVERS`, the sync/async duality via `_restore_context`, the `class_prepared` bootstrapping dependency, and the `dispatch_uid` shadowing gotcha. Explains trade-offs the original authors made and identifies a subtle bug source.
