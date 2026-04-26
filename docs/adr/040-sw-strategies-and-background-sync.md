# ADR-040: Service Worker strategy rewrite + Background Sync

- **Status**: Accepted (planning) — 2026-04-26
- **Phase**: B4 (v13)
- **Owner**: Platform
- **Related**: [ROADMAP §6 B4](../../ROADMAP.md), [docs/operations/deploy-runbook.md](../operations/deploy-runbook.md)

## Context

`public/sw.js` is a single 200-line file that:

- Pre-caches a manifest produced at build time (`generate-precache.mjs`).
- Falls back to `offline.html` on navigation failure.
- Does not implement runtime cache strategies — every non-precached
  fetch goes to network, every time.
- Has no offline write queue. RSVPs submitted offline silently drop
  on next page load.

The build script and current SW are sufficient for "shell offline"
but do not satisfy ROADMAP §6 B4 ("Offline write queue survives
crash; syncs on reconnect").

## Decision

Rewrite `sw.js` around **explicit per-route strategies** plus
**Background Sync** for offline writes. Keep the file hand-rolled
(no Workbox runtime) to stay inside ADR-001's bundle budget; we only
consume Workbox-style *patterns*, not the library.

### Strategy table (final state, end of B4)

| Route pattern                        | Strategy                            | TTL     | Reason                                              |
| ------------------------------------ | ----------------------------------- | ------- | --------------------------------------------------- |
| `/` (navigation)                     | Network-first, fallback to precache | —       | Always serve fresh shell when online.               |
| Vite-emitted hashed assets           | Cache-first                         | 1 year  | Immutable by content hash.                          |
| `/manifest.json`, `/sw.js`           | Stale-while-revalidate              | —       | Pick up new deploys quickly.                        |
| `/icons/**`, `/fonts/**`             | Cache-first                         | 90 days | Stable assets.                                      |
| `https://*.supabase.co/rest/**` GET  | Stale-while-revalidate              | 5 min   | Reads can stale; revalidation hides venue Wi-Fi.    |
| `https://*.supabase.co/**` POST/PUT/DELETE | Background-Sync queue          | —       | Writes survive offline.                             |
| Everything else                      | Network-only                        | —       | No surprises.                                       |

### Background Sync queue

- Backed by IDB store `wedding_v1_outbox` (separate from app data).
- Each entry: `{ id, url, method, headers, body, createdAt, attempts }`.
- On `sync` event: replay in FIFO order; on success delete the entry,
  on `4xx` move to `dead-letter` for manual inspection, on `5xx`/network
  retry with exponential backoff (max 6 attempts).
- Deduplication by user-defined `Idempotency-Key` header — the app
  generates one per write.

## Phasing

| Phase | Goal                                                          | Gate                                                              |
| ----- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| SW0   | Replace `sw.js` with strategy-router skeleton; legacy precache logic preserved. | All existing offline tests still pass; no behavioural change.    |
| SW1   | Activate runtime strategies for assets + Supabase reads.      | Lighthouse offline audit ≥ 95.                                    |
| SW2   | Land outbox + Background Sync (writes only).                  | Playwright E2E `offline-rsvp.spec.mjs` green.                     |
| SW3   | Dead-letter UI in Settings → Sync Queue.                      | Manual replay/cancel works; tests cover recovery path.            |

## Consequences

### Positive

- RSVPs submitted offline (e.g., from a venue Wi-Fi blackspot)
  arrive on reconnect.
- p95 navigation TTFB drops on flaky networks (asset cache-first).
- Single file, ~400 lines max — auditable; no Workbox runtime cost.

### Negative

- Hand-rolled queue is ~150 LOC and needs regression tests on every
  release. Mitigated by E2E spec gating.
- Background Sync API is unsupported on Safari/iOS. Fallback: queue
  in IDB and replay on `online` event.

## Audit & enforcement

- `tests/integration/sw-strategies.test.mjs` — asserts route → strategy
  mapping table.
- `tests/e2e/offline-rsvp.spec.mjs` — Playwright simulating offline →
  reconnect → outbox drained.
- `npm run audit:sw-strategies` — advisory grep that flags `fetch`
  handlers without an explicit strategy.

## Rollback

`sw.js` is versioned by `CACHE_NAME = "wedding-v<semver>"`. A bad
deploy is recoverable by bumping the next release: clients pick up
the new SW within minutes. No data is at risk; the outbox persists in
IDB until drained.

## See also

- [docs/explanation/sw-rewrite-strategy.md](../explanation/sw-rewrite-strategy.md)
- [docs/reference/sw-cache-strategies.md](../reference/sw-cache-strategies.md)
- [scripts/generate-precache.mjs](../../scripts/generate-precache.mjs)
- [public/sw.js](../../public/sw.js)
