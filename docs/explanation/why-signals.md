# Explanation: Why Preact Signals (and not the alternatives)

> Diátaxis: explanation. Decision: [ADR-039](../adr/039-preact-signals-store-internals.md).
> Migration recipe: [docs/how-to/migrate-store-to-signals.md](../how-to/migrate-store-to-signals.md).

## The problem we're solving

`core/store.js` shipped with v3 as a hand-rolled `Proxy` observable.
Six minor releases of section growth later it has three structural
weaknesses:

1. **Shallow notification.** Only top-level key writes notify
   subscribers. `storeGet("guests")[3].rsvp = "yes"` runs without
   firing reactivity. Every domain ends up cloning entire arrays in
   user code, so a single guest update re-renders the full list.
2. **No fine-grained dependency tracking.** A subscriber re-runs on
   every change to its domain, even when the field it cares about
   hasn't changed. Sections that watch `vendors` re-render on every
   payment update.
3. **No batching primitive.** Multi-step writes notify N times. The
   `storeBatch` we ship is a thin debouncer, not a true batched
   commit.

Fixing these *inside* the current Proxy implementation is possible.
It costs ~600 lines of well-tested code and a new mental model
("what's a deep observation chain?"). We've done that math.

## Why Signals

A *signal* is "a value plus the set of effects that depend on it,
maintained automatically". It's the same primitive Solid, Vue's
`ref`, and Svelte 5 runes converged on. The key properties we need:

- **Fine-grained tracking.** An effect re-runs only when a signal it
  *read* changes — not whenever the surrounding domain mutates.
- **Synchronous batching.** `batch(fn)` coalesces all writes inside
  `fn` into a single notification per dependent effect.
- **Composable.** `computed(() => …)` derives values; the engine
  diffs the dependency set on every run.

`@preact/signals-core` ships exactly this in **~1.6 KB gzip**, with
no React or Preact runtime included.

## Alternatives considered

| Option                  | Bundle   | Why we rejected                                                    |
| ----------------------- | -------- | ------------------------------------------------------------------ |
| MobX 6                  | ~16 KB   | 10× the budget. Decorator-heavy ergonomics.                        |
| Zustand                 | ~3 KB    | React-coupled (despite framework-agnostic claim, devtools assume React). |
| Effector                | ~10 KB   | Excellent, but we don't need stores-as-units.                      |
| RxJS                    | ~22 KB   | Stream model is wrong shape for "current state plus history".      |
| Solid Store (`createStore`) | ~5 KB | Couples to Solid's compiler.                                       |
| **Hand-rolled Proxy v2** | 0 KB    | We'd ship the same bug class for another six versions.             |
| **Preact Signals**      | ~1.6 KB | **Chosen.**                                                        |

## Why we keep the existing public API

The migration is invisible to feature developers. `storeGet`,
`storeSet`, `storeSubscribe`, `storeBatch`, `storeReset` retain
their semantics. Only the engine swaps. This means:

- 18 sections + 7 modals + every test file remain unchanged.
- We can roll back SG3 (delete the new code path) without touching
  any caller.
- The "advanced" escape hatch (`storeAsSignal`) is opt-in; sections
  that don't need it never see it.

## What we *don't* solve

Signals do not fix:

- **Persistence.** That stays in `storage.js` / `idb-store.js`.
- **Cross-tab sync.** Still done via the `storage` event +
  Supabase Realtime.
- **Reactivity inside templates.** We don't have a virtual DOM and
  don't plan to add one. Sections still imperatively mount, patch
  on subscribe, and unmount.

Signals are an **engine** swap, not a paradigm shift.

## Performance expectation

- Writes: ~2× faster (no Proxy traps).
- Subscribe → fire latency: ~equal (microtask boundary).
- Memory per domain: +1 closure, ~80 bytes. We have ~12 domains;
  the cost is sub-1 KB resident.

We will validate these numbers in the SG1 PR with a micro-benchmark
under `tests/perf/store.bench.mjs`.

## See also

- [ADR-003 store-driven reactivity](../adr/003-store-driven-reactivity.md)
- [ADR-039 Preact Signals as store internals](../adr/039-preact-signals-store-internals.md)
- [docs/how-to/migrate-store-to-signals.md](../how-to/migrate-store-to-signals.md)
- [Preact Signals docs](https://preactjs.com/guide/v10/signals/)
