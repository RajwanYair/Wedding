# ADR-003: Store-Driven Reactivity

**Status:** Accepted
**Date:** 2025-01-15
**Context:** Wedding Manager v5

## Decision

Application state is managed via a central store (`src/core/store.js`) using
`storeGet` / `storeSet` / `storeSubscribe`. No framework-level reactivity.

## Rationale

- Predictable data flow — single source of truth per data type
- Persistence to localStorage with `wedding_v1_` prefix
- Google Sheets sync via `enqueueWrite()` — debounced, queued, with backoff
- Sections subscribe to relevant keys and re-render on change

## Store Keys

| Key           | Type        | Description                        |
| ------------- | ----------- | ---------------------------------- |
| `guests`      | `Guest[]`   | All wedding guests                 |
| `tables`      | `Table[]`   | Seating tables                     |
| `vendors`     | `Vendor[]`  | Vendor contacts                    |
| `expenses`    | `Expense[]` | Budget expenses                    |
| `weddingInfo` | `object`    | Event details (date, venue, names) |
| `budget`      | `object`    | Budget target + entries            |
| `timeline`    | `object[]`  | Day-of timeline items              |

## Consequences

- No fine-grained reactivity — entire section re-renders on any store change
- Performance is acceptable due to small data sets (<1000 guests typical)
- Must manually call `storeSubscribe` and clean up in `unmount()`
