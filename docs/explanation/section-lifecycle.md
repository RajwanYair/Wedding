# Section lifecycle

> Diátaxis: explanation. For the contract see
> [src/core/section-contract.js](../../src/core/section-contract.js). For
> the migration plan to a uniform pattern, see
> [ADR-034](../adr/034-base-section-adoption.md).

## Mental model

A section is a self-contained, mountable, unmountable view. The router
mounts exactly one section at a time. When a route change happens, the
old section is unmounted and the new one is mounted. Mounting and
unmounting are not the same as render and clear — they are *contract
boundaries*.

```text
+--------------------+      +--------------------+      +--------------------+
| route: dashboard   | ---> | unmount(dashboard) | ---> | mount(guests)      |
|  (mounted)         |      | render: torn down  |      | render: rebuilt    |
+--------------------+      +--------------------+      +--------------------+
```

## The contract

Every section module exports two functions:

| Function   | Called when                                       | Must                                              |
| ---------- | ------------------------------------------------- | ------------------------------------------------- |
| `mount()`  | Section becomes active                            | Wire DOM, subscribe to store, attach listeners    |
| `unmount()`| Section is being replaced                         | Tear down listeners, unsubscribe, cancel timers   |

Optionally, a `capabilities` object declares what the section needs
(e.g. `{ requiresAdmin: true }`).

## What "mount" and "unmount" actually own

`mount()` owns:

1. **DOM queries** against the section's template root. The template was
   already injected by the template loader before `mount` runs.
2. **Store subscriptions** — for example `storeSubscribe("guests", render)`.
3. **DOM listeners** that aren't covered by the global `data-action`
   delegator.
4. **Timers / observers** the section needs (intervals, IntersectionObserver).

`unmount()` owns:

1. **Reversal of every subscription `mount` registered.** Forgetting one
   leaks memory and double-fires renders the next time the user revisits.
2. **Reversal of every listener and timer.**
3. **Optionally clearing instance state** so re-mounts start fresh.

## Why we are moving to `BaseSection`

Without a base class, every section reinvents the cleanup machinery. Some
sections track unsubscribers in module-level arrays; others rely on the
fact that a particular subscription only fires while DOM exists; one
section forgets cleanup entirely and depends on the GC.

`BaseSection` gives every section the same three primitives:

- `this.subscribe(key, fn)` — store subscription that auto-unsubscribes.
- `this.addCleanup(fn)` — arbitrary teardown.
- `onMount` / `onUnmount` lifecycle hooks.

This makes "did I clean up?" a structural question instead of a
human-discipline question. ADR-034 plans the rollout.

## Common bugs the lifecycle prevents (or causes)

| Bug                                              | Cause                              | Prevention                          |
| ------------------------------------------------ | ---------------------------------- | ----------------------------------- |
| Render fires twice on revisit                    | Subscription not unbound           | `this.subscribe()` + `BaseSection`  |
| Memory creeps up after many route changes        | Listeners not detached             | `this.addCleanup(remove…)`         |
| Stale data after a remote update                 | No subscription at all             | Subscribe in `onMount`              |
| Click handler fires on the wrong section         | Inline listener stayed attached    | Use `data-action` delegator instead |
| Section "freezes" after navigating back to it    | Module-level state retained        | Reset state in `onUnmount`          |

## Performance budget

`mount` runs on the user's main thread, on the route-change critical
path. It must:

- Do **no** synchronous network I/O.
- Do **no** layout thrashing (read-then-write batches).
- Defer expensive work to `requestIdleCallback` or a microtask.

Sections that need a server fetch should render an empty/loading shell in
`mount`, then resolve in the background.

## See also

- [ADR-034](../adr/034-base-section-adoption.md)
- [src/core/section-base.js](../../src/core/section-base.js)
- [src/core/section-contract.js](../../src/core/section-contract.js)
- [docs/how-to/migrate-section-to-base.md](../how-to/migrate-section-to-base.md)
