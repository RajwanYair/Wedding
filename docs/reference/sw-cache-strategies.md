# Reference: Service Worker cache strategies (ADR-040)

> Diátaxis: reference. Source of truth: [public/sw.js](../../public/sw.js).
> Decision: [ADR-040](../adr/040-sw-strategies-and-background-sync.md).

## Strategy taxonomy

| Strategy                  | Behaviour                                                                 | Use when                                                  |
| ------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| `cache-first`             | Return cached if present; otherwise fetch + cache + return.               | Immutable hashed assets, fonts, icons.                    |
| `network-first`           | Try network with timeout (3 s); fall back to cache; finally `offline.html`. | Top-level navigation.                                     |
| `stale-while-revalidate`  | Return cache immediately; refresh in background; update cache for next call. | Manifest, SW, Supabase reads (≤ 5 min freshness).         |
| `network-only`            | Always network; never touched by SW. No cache write.                      | Anything not explicitly mapped.                           |
| `bg-sync-queue`           | Always network. On network failure, persist to outbox; replay on `sync` / `online`. | Mutating Supabase calls (`POST` / `PUT` / `PATCH` / `DELETE`). |

## Route → strategy table

| # | Match (URL pattern)                                                  | Method        | Strategy                | Cache name               | TTL     |
| - | -------------------------------------------------------------------- | ------------- | ----------------------- | ------------------------ | ------- |
| 1 | `Request.mode === "navigate"`                                        | GET           | `network-first`          | `wedding-pages-vN`       | —       |
| 2 | `/assets/**` (Vite-emitted hashed)                                   | GET           | `cache-first`            | `wedding-assets-vN`      | 1 year  |
| 3 | `/manifest.json`, `/sw.js`, `/CHANGELOG.md`                          | GET           | `stale-while-revalidate` | `wedding-meta-vN`        | —       |
| 4 | `/icons/**`, `/fonts/**`                                              | GET           | `cache-first`            | `wedding-static-vN`      | 90 days |
| 5 | `https://*.supabase.co/rest/**`                                      | GET           | `stale-while-revalidate` | `wedding-supabase-r-vN`  | 5 min   |
| 6 | `https://*.supabase.co/**`                                           | POST/PUT/PATCH/DELETE | `bg-sync-queue`  | (outbox)                 | —       |
| 7 | Everything else                                                      | any           | `network-only`           | —                        | —       |

`vN` is replaced at build time with the package version (matches the
`CACHE_NAME` constant in `sw.js`).

## Cache lifecycle

| Event           | Action                                                                |
| --------------- | --------------------------------------------------------------------- |
| `install`       | Open `wedding-pages-vN` and `wedding-static-vN`. Pre-cache the manifest emitted by `scripts/generate-precache.mjs`. Call `skipWaiting()`. |
| `activate`      | `clients.claim()`. Delete every cache whose name does not match `wedding-*-vN`. |
| `fetch`         | Match the table above; never touch routes that don't have a rule.     |
| `sync`          | Drain the outbox (FIFO, exponential backoff per entry).               |
| `message`       | Receive `{ type: "skipWaiting" }` from the update banner; call `skipWaiting()`. |

## Outbox schema (IDB)

Database: `wedding-outbox` · Object store: `entries` · Key: `id` (uuid).

```ts
interface OutboxEntry {
  id: string;                 // uuid
  url: string;                // absolute
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  headers: Record<string, string>; // including Idempotency-Key
  body?: string;              // serialised JSON
  createdAt: number;          // epoch ms
  attempts: number;           // 0..6
  lastError?: string;
}
```

Dead-letter store: `wedding-outbox-dead` (same shape; manual replay
from Settings → Sync Queue).

## Backoff schedule

| Attempt | Delay before retry | Trigger                 |
| ------- | ------------------ | ----------------------- |
| 1       | 0 s                | online or `sync` event  |
| 2       | 30 s               | retry timer             |
| 3       | 2 min              | retry timer             |
| 4       | 10 min             | retry timer             |
| 5       | 1 hour             | retry timer             |
| 6       | 4 hours            | retry timer             |
| 7+      | —                  | move to dead-letter     |

## Browser support

| Capability        | Chrome / Edge | Firefox | Safari (iOS) |
| ----------------- | ------------- | ------- | ------------ |
| Service worker    | ✅            | ✅      | ✅           |
| Background Sync   | ✅            | partial | ❌           |
| Periodic Sync     | ✅ (with permission) | ❌ | ❌           |

Safari fallback: outbox replays on `online` event only. No periodic
retry while the page is closed; the entries simply persist until the
user opens the app.

## See also

- [ADR-040](../adr/040-sw-strategies-and-background-sync.md)
- [docs/explanation/sw-rewrite-strategy.md](../explanation/sw-rewrite-strategy.md)
- [public/sw.js](../../public/sw.js)
- [scripts/generate-precache.mjs](../../scripts/generate-precache.mjs)
