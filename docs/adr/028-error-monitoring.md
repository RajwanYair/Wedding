# ADR-028: Error monitoring activation (Sentry-compatible, vendor-neutral)

> Status: **Accepted** · Phase: A2 · Targets: v11.12 → v12.1
> Owner: Platform · Supersedes: nothing

## Context

The app currently captures runtime errors in two places:

- [src/main.js](../../src/main.js) `window.addEventListener("error", …)` — toast + console
- [src/services/health.js](../../src/services/health.js) — feeds `STORAGE_KEYS.SYNC_ERRORS`

Neither is shipped off-device. We have **no observability** in production beyond user reports.
Adding a vendor SDK (Sentry, Bugsnag, Datadog RUM) would violate ADR-001 (zero runtime deps).

## Decision

Adopt a **vendor-neutral error transport** layered behind an envelope:

```js
// src/services/error-monitor.js (new)
export function reportError(err, ctx) { /* envelope v1 */ }
export function setUser(user) { /* opaque id only */ }
```

- Envelope v1: `{ v: 1, ts, msg, stack, ctx, ua, url, sessionId }`.
- Transport: `navigator.sendBeacon(url, JSON.stringify(envelope))` with `keepalive: true` fetch fallback.
- Backend: Supabase Edge Function `/error-ingest` (rate-limited, anon-write only).
- **No vendor SDK** — keeps bundle ≤ 1 KB and ADR-001 intact.
- Strict PII filter: stack frames stripped of querystrings; user object is opaque ID.

## Phases

| Phase | Gate | Scope |
| --- | --- | --- |
| **M0** _(now, v11.11)_ | merged | This ADR + `audit:router` baseline. No transport yet. |
| **M1** _(v11.12)_ | accepted | Land `src/services/error-monitor.js` (no-op transport, console only) + tests + ADR-029 a11y plan. |
| **M2** _(v11.13)_ | flag-gated | Edge Function `/error-ingest` deployed. `BACKEND_ERROR_TRANSPORT=supabase` opt-in. |
| **M3** _(v12.0)_ | default-on | Replace `health.js` `error` listener with `reportError()`; transport always on. |
| **M4** _(v12.1)_ | optional | Add structured perf events (LCP/CLS/INP) via the same transport. |

## Consequences

- **+** Catches errors from real browsers without a SaaS bill.
- **+** Vendor-neutral: swap `BACKEND_ERROR_TRANSPORT` to vendor URL later.
- **−** No symbolication out-of-the-box; need source-map upload in CI (deferred to M3).
- **−** Edge Function consumes Supabase quota; rate-limit critical.

## Privacy

- Drop `Authorization` headers, cookies, querystrings starting with `?token=`.
- Truncate stacks to 4 KB.
- Aggregate by message hash; raw payloads expire after 30 days.

## Related

- [ADR-001: Zero runtime deps](001-zero-runtime-deps.md)
- [ADR-026: Encrypt tokens at rest](026-encrypt-tokens-at-rest.md)
- [ADR-027: Supabase as single backend](027-supabase-single-backend.md)
