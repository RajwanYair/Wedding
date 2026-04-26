# How-to: Migrate `core/store.js` to Preact Signals (ADR-039)

> Diátaxis: how-to. Decision: [ADR-039](../adr/039-preact-signals-store-internals.md).
> Background: [docs/explanation/why-signals.md](../explanation/why-signals.md).

This recipe walks through the SG0 → SG3 migration of the store
internals to Preact Signals, while keeping the public API stable.

## When to use

Once per phase, in order. Do **not** skip phases — each gate exists.

## You will need

- A green `main` (lint + tests pass).
- ~1.6 KB gzip available in the bundle budget.

## SG0 — Add the dependency

```bash
npm install @preact/signals-core
npm run audit:bundle
```

Verify the React adapter is **not** pulled in:

```bash
npm ls @preact/signals
# expected: only @preact/signals-core
```

Commit:

```bash
git commit -m "feat(store): add @preact/signals-core (ADR-039 SG0)"
```

## SG1 — Re-implement the engine

Edit `src/core/store.js`. Replace the Proxy implementation with the
sketch from ADR-039:

```js
import { signal, batch, effect } from "@preact/signals-core";

const domains = new Map();

function ensure(name, initial) {
  let s = domains.get(name);
  if (!s) {
    s = signal(initial);
    domains.set(name, s);
  }
  return s;
}

export function storeGet(name) {
  return domains.get(name)?.value;
}

export function storeSet(name, value) {
  ensure(name, value).value = value;
}

export function storeSubscribe(name, fn) {
  const s = ensure(name, undefined);
  return effect(() => fn(s.value));
}

export function storeBatch(fn) {
  return batch(fn);
}
```

Run the suite:

```bash
npm test
```

If anything fails, the most likely cause is a section that relied on
fire-on-shallow-equal behaviour. Fix the section, not the engine.

## SG2 — Add the escape hatch

Some advanced sections (charts, virtualised lists) want to subscribe
directly to the underlying signal. Expose it explicitly:

```js
export function storeAsSignal(name) {
  return ensure(name, undefined);
}
```

Document it in `docs/reference/store-api.md` under "advanced".

## SG3 — Remove the legacy code

Delete the Proxy implementation. Mark
[ADR-003](../adr/003-store-driven-reactivity.md) as **Superseded** by
ADR-039 in its front-matter.

Flip the audit:

```bash
node scripts/audit-store-mutation-depth.mjs --enforce
```

…and update the workflow step to use `--enforce`.

## Troubleshooting

| Symptom                                             | Likely cause                                  | Fix                                                       |
| --------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| Unrelated tests fail with "TypeError: signal of undefined" | Domain accessed before first `storeSet`. | Initialise the domain in `defaults.js`.                   |
| Subscriber fires twice on first call                | `effect()` runs synchronously on creation.    | Expected; remove your manual "initial fire" in callers.   |
| Bundle audit reports +9 KB                          | Adapter import (`@preact/signals/react`).     | Re-pin to `@preact/signals-core` only.                    |
| Storybook / dev tools no longer show updates        | DevTools hook missing.                        | Add `signals-core/devtools` lazy import in dev only.      |

## See also

- [ADR-039](../adr/039-preact-signals-store-internals.md)
- [ADR-003](../adr/003-store-driven-reactivity.md)
- [docs/explanation/why-signals.md](../explanation/why-signals.md)
