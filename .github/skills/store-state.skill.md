---
description: "Store, state, and persistence patterns for the Wedding Manager."
---

# Skill: Store + State

## Store Architecture

The app uses a Proxy-based reactive store in `src/core/store.js`.

- **Read**: `storeGet(key)` — returns current value.
- **Write**: `storeSet(key, value)` — updates store + schedules localStorage persist.
- **Subscribe**: `storeSubscribe(key, callback)` — called whenever `key` changes.
- **Unsubscribe**: return value of `storeSubscribe()` is an unsubscribe function — call it in `unmount()`.

## Storage Keys

All localStorage keys use the `wedding_v1_` prefix. Canonical keys and defaults live in:

- `src/core/constants.js` — `STORAGE_KEYS` enum
- `src/core/defaults.js` — initial default values per domain

Never invent new raw localStorage keys. Add to `STORAGE_KEYS` first.

## Sheets Sync

When a store change must sync to Google Sheets, use the write queue:

```js
import { enqueueWrite } from "../services/sheets.js";
enqueueWrite("guests", () => syncGuestsToSheets());
```

- Never call `syncStoreKeyToSheets` directly from section modules.
- `enqueueWrite` debounces and batches writes.

## Persistence Pattern for a New Domain

1. Add a key to `STORAGE_KEYS` in `src/core/constants.js`.
2. Add a default value to `src/core/defaults.js`.
3. Create `src/repositories/<domain>-repo.js` with CRUD helpers (only layer that mutates store arrays).
4. Read with `storeGet(STORAGE_KEYS.MY_KEY)`.
5. Write with `storeSet(STORAGE_KEYS.MY_KEY, newValue)` — from repository only.
6. Subscribe in section `mount()`, unsubscribe in `unmount()`.

## Optimistic Updates

Use the optimistic update pattern for user-facing mutations:

```js
import { applyOptimistic } from "../core/conflict-resolver.js";
const rollback = applyOptimistic(STORAGE_KEYS.GUESTS, updatedGuests);
try {
  await remoteWrite(updatedGuests);
} catch {
  rollback();
}
```

## Cross-Section Communication

- Do **not** import section modules into other section modules.
- Use store subscriptions for reactive cross-section updates.
- Use `data-action` event delegation for user interactions (see `src/core/events.js`).

## Checklist

- [ ] New domain key added to `STORAGE_KEYS`.
- [ ] Default value in `defaults.js`.
- [ ] Repository file `src/repositories/<domain>-repo.js` owns all mutations.
- [ ] Subscriptions cleaned up in `unmount()`.
- [ ] Sheets sync uses `enqueueWrite()`.
- [ ] No direct `localStorage` access outside `src/core/storage.js`.
