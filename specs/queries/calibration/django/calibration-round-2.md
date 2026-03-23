# Calibration Round 2 — Django (Hard)

This is a pre-scored calibration round. The judge must score the competitor output below and match the official scores within 1 point on each dimension before proceeding. This round deliberately includes incomplete recall — the competitor missed important locations.

---

**Query:** django-enumeration-3 (hard)
> Find all signals defined across the entire Django codebase — in `core/signals.py`, `db/models/signals.py`, `contrib/auth/signals.py`, `tasks/signals.py`, and anywhere else. List each signal name, where it is defined, and when it fires.

**Competitor output (excerpt):**

> Here are the signals I found across Django:
>
> **`django/core/signals.py`:**
> - `request_started` — fires when an HTTP request begins processing (sent by `BaseHandler`)
> - `request_finished` — fires when an HTTP response is complete
> - `got_request_exception` — fires when an unhandled exception occurs during request processing
> - `setting_changed` — fires when a setting is modified (used heavily in tests via `@override_settings`)
>
> **`django/db/models/signals.py`:**
> - `class_prepared` — fires when a model class is fully prepared by the metaclass
> - `pre_init` — fires before `Model.__init__` runs
> - `post_init` — fires after `Model.__init__` completes
> - `pre_save` — fires before `Model.save()` writes to the database
> - `post_save` — fires after `Model.save()` completes
> - `pre_delete` — fires before `Model.delete()` removes the record
> - `post_delete` — fires after `Model.delete()` completes
> - `m2m_changed` — fires when a many-to-many relationship is modified
>
> **`django/contrib/auth/signals.py`:**
> - `user_logged_in` — fires when a user successfully authenticates
> - `user_logged_out` — fires when a user logs out
> - `user_login_failed` — fires on a failed authentication attempt
>
> All these are instances of `Signal` from `django/dispatch/dispatcher.py`, except the model signals which use the `ModelSignal` subclass for lazy sender resolution.

**Official scores:** Precision: 4, Recall: 3, Insight: 2

**Scoring rationale:**

- **Precision: 4** — All stated signals, their locations, and their firing conditions are correct. The distinction between `Signal` and `ModelSignal` is accurate. Minor imprecision: the agent says `setting_changed` is "used heavily in tests via `@override_settings`" which is true but incomplete — it is also used by Django internally (e.g., `StaticFilesStorage` listens to it). No factual errors, one slightly incomplete characterization.

- **Recall: 3** — Found signals in 3 of the hinted locations and those are correct. But the query explicitly asks to find signals "anywhere else" beyond the hinted files. Missing: (a) `django/contrib/contenttypes/fields.py` has signals usage that may define local signal behavior; (b) `django/test/signals.py` defines `template_rendered` signal; (c) `django/db/backends/signals.py` defines `connection_created`; (d) the query hints at `tasks/signals.py` which does not exist, but the agent did not note its absence (an absence-proof gap). Found the primary locations but missed secondary ones that the query explicitly asked about.

- **Insight: 2** — Lists each signal with when it fires and notes the `Signal` vs `ModelSignal` distinction. But draws no connections: does not explain the dispatch mechanism (`send()` vs `send_robust()` and why different callers use different methods), does not explain the weak-reference design and its implications, does not trace which Django subsystems actually send these signals (e.g., `request_started` sent in `django/core/handlers/base.py`, model signals sent from `django/db/models/base.py`). Descriptions are per-signal without architectural connections.
