# Reference: Repositories layer

> Diátaxis: reference. For the architectural rationale see ROADMAP §5.3
> and ADR-002. For the planned strict gate see ROADMAP §6 Phase B9.

The repositories layer in `src/repositories/` is the canonical data-access
boundary for sections and handlers. This page documents the public surface
of every repository class.

## Why a repository layer

- One place to enforce sanitization (Valibot) on writes.
- One place to swap the backend (`store` → Supabase) without rewriting
  callers.
- One place for `event_id` scoping (multi-event mode).
- Sections and handlers do not import services directly; they call repos.

## `BaseRepository<T>`

Source: [src/repositories/base-repository.js](../../src/repositories/base-repository.js)

In-memory CRUD over a store key whose value is an array of items keyed by
a unique string `id`.

```ts
class BaseRepository<T extends { id: string }> {
  constructor(
    storeKey: string,
    storeGet: (k: string) => T[],
    storeSet: (k: string, items: T[]) => void,
    storeUpsert: (k: string, item: T) => void,
  );

  findAll(): T[];
  findById(id: string): T | undefined;
  upsert(item: T): void;
  remove(id: string): void;
  count(): number;
}
```

## Domain repositories

All extend `BaseRepository<T>` and bind to a fixed store key.

| Class                  | Store key   | Item type   |
| ---------------------- | ----------- | ----------- |
| `GuestRepository`      | `guests`    | `Guest`     |
| `TableRepository`      | `tables`    | `Table`     |
| `VendorRepository`     | `vendors`   | `Vendor`    |
| `ExpenseRepository`    | `expenses`  | `Expense`   |

Item type aliases live in [src/types.d.ts](../../src/types.d.ts).

### Example

```js
import { GuestRepository } from "../repositories/guest-repository.js";

const guests = new GuestRepository();
const all = guests.findAll();
const one = guests.findById("g_abc");
guests.upsert({ id: "g_xyz", name: "Sara", phone: "+972541234567" });
guests.remove("g_abc");
```

## Supabase variants

For each domain repository, `src/repositories/supabase-<name>-repository.js`
exposes the same surface but persists to Supabase tables. They share a
`SupabaseBaseRepository` parent that handles `event_id` injection,
RLS-friendly query construction, and error reporting via `reportError()`.

These variants are NOT yet wired into sections; they will replace the
in-memory repositories during ROADMAP Phase A1 cutover (`BACKEND_TYPE` =
`"supabase"`).

## Constraints (ROADMAP B9)

When the strict gate ships, the following ESLint rule will be enforced:

```js
// eslint.config.mjs (planned)
{
  files: ["src/sections/**", "src/handlers/**"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        { group: ["**/services/**"], message: "Use src/repositories/ instead." },
      ],
    }],
  },
}
```

Until then, `scripts/arch-check.mjs` reports violations as advisories.

## See also

- [ADR-002](../adr/002-esm-module-architecture.md)
- [src/repositories/](../../src/repositories/)
- [scripts/arch-check.mjs](../../scripts/arch-check.mjs)
