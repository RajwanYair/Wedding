# ADR-016 — Web Vitals Monitoring Policy

> **Status:** Accepted · **Date:** 2026-04-29 · **Owners:** Release-Engineer agent + Monitoring service · **Supersedes:** none · **Related:** ADR-013 (opt-in monitoring + supply-chain)

## Context

ADR-013 wired an opt-in error pipeline (`services/monitoring.js` → optional `@sentry/browser`)
with PII scrubbing and a small breadcrumb buffer. v11.6.0 added `initWebVitals()` which
observes **LCP**, **INP** (via the `event` PerformanceObserver, `durationThreshold: 16`)
and **CLS** in the browser, buffers the latest values, and flushes a single `web-vitals`
breadcrumb (plus an optional `_transport.captureMessage`) on `visibilitychange` /
`pagehide`.

We need a written policy so future contributors do not (a) bloat the bundle by importing a
third-party `web-vitals` library, (b) ship telemetry that defeats our offline-first stance,
or (c) let metrics regress silently.

## Decision

1. **No third-party `web-vitals` runtime dependency.** We use only platform
   `PerformanceObserver` APIs. `services/monitoring.js` remains the single seam.
2. **Sample once per session, flush once on hide.** A single `web-vitals` event per page
   visit is sufficient for trend analysis and keeps the offline write queue small.
3. **No PII in vitals payloads.** The breadcrumb shape is `{ category: "web-vitals",
   data: { lcp, inp, cls, ts } }`. URL is captured at the top level by the transport
   adapter (already scrubbed of query strings holding tokens).
4. **Hard budget (informational, enforced via Lighthouse CI):** `LCP ≤ 2.5 s`, `INP ≤
   200 ms`, `CLS ≤ 0.1` on a Moto-G4-class profile. Breaches show up in the LH-CI report;
   we do **not** add a separate runtime gate.
5. **Opt-in remains the default.** Vitals only flush to a transport when
   `_transport.captureMessage` is wired by `initMonitoring()` (Sentry / Glitchtip), which
   itself requires `VITE_SENTRY_DSN`. Without a DSN, vitals stay in the local breadcrumb
   buffer and are dropped on unload.
6. **Tests guard the public shape.** `tests/unit/services/monitoring.test.mjs` asserts
   that `initWebVitals()` is a no-op when `PerformanceObserver` is missing and that the
   flush payload includes the three metric keys.

## Consequences

- We never ship the `web-vitals` npm package; bundle stays under the 60 KB gzip gate.
- A migration to true RUM (e.g. Glitchtip Performance, Plausible Vitals) only needs a new
  transport adapter — not a rewrite of measurement.
- If `PerformanceObserver` types regress in the browser, our ESLint globals
  (`PerformanceObserver`, `PerformanceEventTiming`) keep the implementation typed.

## Alternatives Considered

- **Adopt `web-vitals` (Google library):** richer (FID, TTFB, FCP) but adds ~3 KB gzip
  and a runtime dep. Rejected — we already cover the three metrics that drive Core Web
  Vitals reporting.
- **Always-on transport (no opt-in):** would leak pageviews; rejected for privacy.
- **Per-event flush:** noisy and bandwidth-heavy on flaky 3G; rejected.
