# Explanation: Service Worker rewrite strategy

> Diátaxis: explanation. Decision: [ADR-040](../adr/040-sw-strategies-and-background-sync.md).
> Reference table: [docs/reference/sw-cache-strategies.md](../reference/sw-cache-strategies.md).

## The mental model

A service worker is a programmable HTTP proxy that lives between the
app and the network. Two questions decide its design:

1. **Where does this response come from?** (cache, network, both)
2. **What happens when the network isn't there?** (fallback, queue, fail)

Every other choice — TTLs, cache names, dead-letter UI — falls out
of those two answers.

## Where we started

The pre-v13 worker pre-cached the build manifest and fell back to
`offline.html` on navigation. Everything else hit the network. That
shipped a *shell*-offline experience: the page opened on bad Wi-Fi,
but every API call still failed. Users would tap "Save", see a
spinner, and lose the input on the next refresh.

That's not "offline-first". That's "offline-pretend".

## Where we're going

ADR-040 picks four strategies — `cache-first`, `network-first`,
`stale-while-revalidate`, `bg-sync-queue` — and assigns one to every
route the app produces. The fifth strategy, `network-only`, is the
explicit "we don't cache this" signal so reviewers can see that a
route was considered, not forgotten.

### Why a strategy table, not heuristics

A heuristic ("cache assets, network everything else") is the kind of
rule that fails to a 2 AM bug at a venue. A *table* is something we
can:

- Diff in code review.
- Test against (one Vitest case per row).
- Print on a runbook for incident response.

The table lives in code (`sw.js`), not in a config file, because
strategy selection requires conditional logic ('navigate' vs
'method=GET'). The Vitest spec asserts every row is reachable.

## Why hand-rolled, not Workbox

Workbox is excellent. It is also ~30 KB gzip of runtime that we'd
ship to every user. Our worker is ~5 KB hand-rolled, with five
clearly-named strategy functions and one IDB outbox. ADR-001
(zero-runtime-deps) demands we keep it that way.

What we did borrow from Workbox: the *vocabulary*
(`cache-first`, `stale-while-revalidate`, …). New contributors
recognise the names; the implementation is ours.

## Why Background Sync (and the Safari fallback)

Background Sync lets the browser drain our outbox **after the user
has closed the tab**, including on a delay until the device has
connectivity. It's the only feature that turns "offline writes" from
a UX trick into a guarantee.

Safari does not implement Background Sync today. Our fallback there:

- Persist to the IDB outbox identically.
- Replay on the `online` event whenever the page is open.
- If the user never reopens the page, the entries persist
  indefinitely. They are never silently dropped.

A "Sync queue: 3 pending" badge in Settings ensures the user notices.

## Idempotency and the dead-letter

Every queued write carries an `Idempotency-Key` header generated
client-side at `enqueueWrite()` time. The Supabase edge functions
treat duplicates as no-ops. This means we can retry safely on any
transient failure without risking double-charged guests.

When a write fails with a permanent error (`4xx` other than `408`,
`429`), we move it to the **dead-letter** store. A Settings → Sync
Queue surface shows the failed entries with their last error and
offers Retry / Discard. We never auto-discard; data loss is always a
deliberate user choice.

## Update strategy

`CACHE_NAME = "wedding-v<semver>"` ties cache lifetime to the
release. On install we `skipWaiting()`; on activate we delete every
cache that isn't the current version. The update banner UI in
`core/ui.js` tells the user a new version is ready and asks for a
reload — we never silently swap behaviour underneath them.

## What the user feels

| Scenario                                         | Old behaviour                  | New behaviour                                   |
| ------------------------------------------------ | ------------------------------ | ----------------------------------------------- |
| Walks into venue with weak Wi-Fi, opens app      | Slow first paint, then OK      | Instant cache-first paint; fresh in background. |
| Submits RSVP while offline                       | Spinner forever; data lost.    | Optimistic ack; queued; drained on reconnect.   |
| Reopens app after a connectivity gap             | Stale data; manual refresh.    | SWR refresh; user sees latest within 5 min.     |
| New release deploys mid-session                  | "Reload to see changes" forever | Banner; one tap; SW activates new caches.       |

## See also

- [ADR-040](../adr/040-sw-strategies-and-background-sync.md)
- [docs/reference/sw-cache-strategies.md](../reference/sw-cache-strategies.md)
- [public/sw.js](../../public/sw.js)
- [docs/operations/incident-response.md](../operations/incident-response.md)
