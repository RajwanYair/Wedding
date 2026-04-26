# ADR-039: Preact Signals as `core/store.js` internals

- **Status**: Accepted (planning) — 2026-04-26
- **Phase**: B3 (v13)
- **Supersedes**: §3.3 of [ADR-003 Store-driven reactivity](./003-store-driven-reactivity.md) (custom Proxy implementation)
- **Owner**: Core
- **Related**: [ROADMAP §7.4](../../ROADMAP.md), [§5.2](../../ROADMAP.md)

## Context

`src/core/store.js` ships a hand-rolled `Proxy`-based observable. It
notifies on top-level key writes only. Nested mutations
(`storeGet("guests")[3].rsvp = "yes"`) do **not** fire subscribers,
which forces sections to clone-and-replace whole arrays for every
incremental update. That is:

- An ergonomic foot-gun: developers regularly write code that does not
  re-render and discover the bug only at QA time.
- A perf foot-gun: replacing a 500-guest array on every RSVP update
  triggers full virtualised list re-mounts.
- A test foot-gun: half our reactivity tests exercise the workaround
  rather than the real path.

We have rejected MobX (~16 KB gzip) and Zustand (~3 KB but React-only)
in earlier reviews. **Preact Signals** (`@preact/signals-core`) is
~1.6 KB gzip, framework-agnostic, and offers fine-grained dependency
tracking with `signal()`, `computed()`, and `effect()`.

## Decision

Migrate the **internals** of `core/store.js` to Preact Signals while
preserving the existing public API (`storeGet`, `storeSet`,
`storeBatch`, `storeSubscribe`, `storeReset`).

Public API remains stable. Sections do not change. Only the engine
swaps.

## Phasing

| Phase | Goal                                                           | Gate                                                                |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| SG0   | Add `@preact/signals-core` (lazy-imported by `store.js`).      | Bundle audit shows ≤ 1.8 KB gzip cost.                              |
| SG1   | Re-implement `storeGet`/`storeSet`/`storeSubscribe` over signals. Existing tests pass. | All 2300+ Vitest cases green.                                       |
| SG2   | Expose escape hatch `storeAsSignal(domain)` for advanced use.  | Documented in `docs/reference/store-api.md`.                        |
| SG3   | Remove the legacy Proxy code path; ADR-003 is superseded.      | `src/core/store.js` Proxy removed; ADR-003 marked **Superseded**.   |

## Consequences

**Positive**

- Nested mutations via the new `useSignalState(domain)` helper fire
  reactivity correctly. (Direct `storeGet().push(...)` still requires
  an explicit `storeSet` — by design — so we don't tempt deep
  observation.)
- ~1.6 KB gzip cost; offset by removing ~3 KB of bespoke Proxy code.
- Aligns with ROADMAP §1 *Reactivity* row ("Replace") and ADR-003
  follow-up.

**Negative**

- One extra runtime dep — counts against ADR-001's tight budget.
  Justified by removing equivalent in-tree code.
- Tree-shaking has to be verified: `@preact/signals-core` is ESM, but
  bundlers occasionally include the React adapter by mistake. Build
  audit added in SG0.

**Neutral**

- No section-level changes; the migration is invisible to feature
  developers.

## Audit & enforcement

- `npm run audit:store-mutation-depth` — flags suspect nested writes
  in `src/sections/`. Advisory until SG3, then `--enforce`.
- Bundle audit gate (`npm run audit:bundle`) catches accidental React
  adapter inclusion.

## Migration sketch

```js
// store.js — core after SG1
import { signal, batch, effect } from "@preact/signals-core";

const domains = new Map(); // name -> Signal<value>

export function storeGet(name) {
  return domains.get(name)?.value;
}
export function storeSet(name, value) {
  let s = domains.get(name);
  if (!s) {
    s = signal(value);
    domains.set(name, s);
  } else {
    s.value = value;
  }
}
export function storeSubscribe(name, fn) {
  let s = domains.get(name);
  if (!s) {
    s = signal(undefined);
    domains.set(name, s);
  }
  return effect(() => fn(s.value));
}
export function storeBatch(fn) {
  return batch(fn);
}
```

## Rollback

Revert SG3; the Proxy code is preserved on the `legacy/proxy-store`
branch through v13.0.

## See also

- [ADR-003 store-driven reactivity](./003-store-driven-reactivity.md)
- [docs/explanation/why-signals.md](../explanation/why-signals.md)
- [docs/how-to/migrate-store-to-signals.md](../how-to/migrate-store-to-signals.md)
- [ROADMAP §7.4](../../ROADMAP.md)
