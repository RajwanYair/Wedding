# Why we built our own error monitor (instead of Sentry)

> Companion to [ADR-028](../adr/028-error-monitoring.md).
> Diátaxis quadrant: **explanation**.

## The decision in one sentence

We ship a 1 KB vendor-neutral envelope-and-transport instead of
linking a Sentry/Bugsnag/Datadog SDK because **adding any monitoring
SDK would violate ADR-001 (zero runtime deps)** and inflate our 45 KB
bundle by 30–60 %.

## What "monitoring" means here

Three distinct layers:

| Layer | Today | Plan |
| --- | --- | --- |
| **Capture** | `window.error` listener in `src/main.js` | Centralized in `error-monitor.js` |
| **Transport** | None — console only | `sendBeacon → /error-ingest` (Supabase Edge Function) |
| **UI / search** | None | Supabase table + simple query view |

ADR-028 only commits to capture and transport. We expressly defer
search / dashboarding because building that costs more than the value
of *seeing* errors arrive.

## Why not Sentry?

- **Bundle**: `@sentry/browser` minified ≈ 25 KB gzip. That is more
  than half our current total bundle.
- **Vendor lock**: their replay/SourceMap feature requires a paid plan.
- **Privacy**: replay captures DOM contents, including guest PII. We
  would need a strict scrubber on top — and we already mistrust the
  scrubber.
- **Runtime deps**: ADR-001 forbids new runtime deps without a
  superseding ADR. Sentry would be a 26th-largest dep.

## Why not just `window.onerror`?

We already have this; it goes nowhere. The point of ADR-028 is to add
**transport** — a stable wire format that can target any backend
(Supabase Edge Function today, vendor URL tomorrow) with minimal code
churn.

## Why an envelope?

Versioned envelopes (`{ v: 1, … }`) let us evolve schema without
breaking older client builds in the field. Service workers cache old
JS for days; without `v`, schema changes break replay/aggregation.

## What we explicitly do not collect

- Authorization headers
- Cookies
- Querystrings starting with `?token=`
- Stack frames longer than 4 KB
- The full user object — only an opaque `id`

The filter is in [src/services/error-monitor.js](../../src/services/error-monitor.js)
and tested in [tests/unit/error-monitor.test.mjs](../../tests/unit/error-monitor.test.mjs).

## When this might change

If we hit one of these triggers, revisit:

1. We need session replay to debug a UX-only bug class.
2. Bundle pressure relaxes (e.g., HTTP/3 + brotli reduces transport cost).
3. A vendor offers an SDK ≤ 5 KB gzip with an open transport spec.

Until then: own the transport, control the privacy budget.

## Related

- [ADR-001: Zero runtime deps](../adr/001-zero-runtime-deps.md)
- [ADR-026: Encrypt tokens at rest](../adr/026-encrypt-tokens-at-rest.md)
- [ADR-028: Error monitoring activation](../adr/028-error-monitoring.md)
