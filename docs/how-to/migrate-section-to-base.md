# How-to: Migrate a section to `BaseSection`

> Diátaxis: how-to. For the rationale, see
> [ADR-034](../adr/034-base-section-adoption.md). For the lifecycle
> contract, see [docs/explanation/section-lifecycle.md](../explanation/section-lifecycle.md).

This recipe converts a function-style section in `src/sections/` to the
`BaseSection` class pattern with no behaviour changes.

## When to use

- You are migrating one of the 18 existing sections per ADR-034.
- You are adding a new section. (Skip the conversion steps; start directly
  from the class skeleton in step 4.)

## You will need

- ~15 minutes per simple section, ~45 minutes per complex section.
- Visual-regression baselines green before you start (so any drift you
  introduce is detectable).

## Steps

### 1. Read the current section

Open `src/sections/<name>.js`. Identify:

- Top-level `mount()` and `unmount()` exports.
- Module-level state (`let _state = …`).
- Every `storeSubscribe(...)` call and what unsubscribes them.
- Every `setInterval`, `setTimeout`, `addEventListener`, observer, etc.

### 2. Run the audit baseline

```bash
node scripts/audit-base-section.mjs
```

Confirm your section is in the *pending* list. After the migration it
must move to *adopted*.

### 3. Capture the visual baseline

```bash
npm run test:e2e -- --update-snapshots --grep "<name>"
```

Commit the baseline before changing code so you can detect drift.

### 4. Replace the module body with a class

```js
import { BaseSection, fromSection } from "../core/section-base.js";

class GuestsSection extends BaseSection {
  /** @type {HTMLElement | null} */
  #root = null;

  async onMount() {
    this.#root = document.querySelector("[data-section='guests']");
    this.subscribe("guests", () => this.#render());
    this.addCleanup(() => { this.#root = null; });
    this.#render();
  }

  onUnmount() {
    // Anything not registered via subscribe()/addCleanup() goes here.
  }

  #render() {
    if (!this.#root) return;
    // existing render body, unchanged
  }
}

export const { mount, unmount, capabilities } = fromSection(
  new GuestsSection("guests"),
);
```

### 5. Map old to new

| Old                             | New                          |
| ------------------------------- | ---------------------------- |
| `let _state = …`                | `#privateField`              |
| `function mount() { … }`        | `async onMount() { … }`      |
| `function unmount() { … }`      | `onUnmount() { … }`          |
| `storeSubscribe(k, fn)`         | `this.subscribe(k, fn)`      |
| `clearInterval(t)` in unmount   | `this.addCleanup(() => clearInterval(t))` |
| `removeEventListener` in unmount| `this.addCleanup(() => …)`   |

### 6. Verify

```bash
npm run lint
npm test
node scripts/audit-base-section.mjs
npm run test:e2e -- --grep "<name>"
```

Expected outcomes:

- Lint and tests pass.
- The audit shows the section as adopted.
- Visual diff is empty.

### 7. Commit

```bash
git add src/sections/<name>.js
git commit -m "refactor(<name>): adopt BaseSection (ADR-034)"
```

## Troubleshooting

| Symptom                          | Likely cause                                       | Fix                                             |
| -------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| Section renders twice on remount | Forgot to register a subscription via `this.subscribe` | Replace `storeSubscribe` with `this.subscribe`. |
| Interval keeps firing after unmount | `setInterval` not in `addCleanup`               | Add `this.addCleanup(() => clearInterval(t))`.  |
| `this.#root` is `null` in render | `onMount` ran before DOM is ready                  | Re-query in `#render()` or guard with early return. |
| Visual diff in alignment         | DOM order changed during refactor                  | Re-baseline only after confirming intent.       |

## See also

- [ADR-034](../adr/034-base-section-adoption.md)
- [src/core/section-base.js](../../src/core/section-base.js)
- [docs/explanation/section-lifecycle.md](../explanation/section-lifecycle.md)
