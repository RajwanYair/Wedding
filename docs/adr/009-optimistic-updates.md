# ADR 009 — Optimistic Updates Pattern

**Status**: Accepted
**Date**: 2025
**Deciders**: Core team

## Context

Wedding Manager users frequently update guest RSVP statuses and table
assignments from a mobile network.  Round-trip latency to Supabase (hosted
in EU-West-1) averages 250–600 ms on 4G.  Waiting for the server before
updating the UI creates a noticeable stutter and feels unresponsive during
check-in scanning.

## Decision

Local state is updated immediately (optimistic write) via the Zustand-like
`store.js`.  The Supabase write is dispatched asynchronously.  If it fails,
the store reverts to the previous value and shows a toast error.

### Pattern implementation

```js
// 1. Snapshot previous value
const prev = storeGet("guests").find(g => g.id === id);

// 2. Apply optimistic update
storeMutate("guests", guests => guests.map(g =>
  g.id === id ? { ...g, ...patch } : g
));

// 3. Persist to Supabase
try {
  await repo.update(id, patch);
} catch (err) {
  // 4. Rollback on failure
  storeMutate("guests", guests => guests.map(g =>
    g.id === id ? { ...g, ...prev } : g
  ));
  showToast(t("error_save_failed"), "error");
}
```

### Conflict detection

When the remote response contains a newer `updated_at` than the local
snapshot, the conflict resolver (`src/core/conflict-resolver.js`) is
invoked.  The default strategy is `remote_wins` for most fields; manual
resolution is surfaced in the conflict modal for human-curated fields
(`tableId`, `meal`).

### Offline support

The `offline-queue.js` service (`src/services/offline-queue.js`) stores
pending writes in `localStorage` when `navigator.onLine` is false.  On
reconnect the queue is drained in FIFO order.  Stale writes older than
24 hours are discarded to prevent data inconsistencies.

## Consequences

**Positive:**

- Instant UI feedback — no spinner for common operations.
- Works offline; syncs on reconnect.
- Improved check-in throughput at the venue (~40 guests/minute vs 15).

**Negative:**

- Rollback logic must exist for every optimistic write path.
- Concurrent edits from two admin browsers can still conflict; the conflict
  modal mitigates but does not eliminate this.
- `offline-queue.js` adds complexity; stale-write discard policy is
  arbitrary and may surprise users on very long offline periods.

## Alternatives Considered

| Option | Reason rejected |
|--------|-----------------|
| Pessimistic locking (wait for server) | Unacceptable latency; check-in scanning requires sub-100 ms response |
| CRDT-based merge | Significant complexity; not warranted for a single-admin-at-a-time app |
| Last-write-wins without conflict detection | Risk of silent data loss during concurrent edits |
