# Explanation: Bundle budget

> Diátaxis: explanation. For the gzip target see ROADMAP §3.1. For
> dependency philosophy see
> [docs/explanation/zero-runtime-deps.md](./zero-runtime-deps.md).

## The number

> **45 KB gzip** initial route, **60 KB hard gate** in CI.

That covers `index.html` + the synchronous `src/main.js` chunk + the
CSS critical path. Lazy-loaded section bundles, modal templates, and
locale JSON are explicitly excluded — they are amortised over the
session and do not block first paint.

## Why so small

### 1. Mobile reality

Real venues have weak Wi-Fi and 3G/4G. A 45 KB initial payload arrives
on a 1.6 Mbps link in **~225 ms**, well inside the 1-second
"fast-paint" window we hold ourselves to. Doubling the budget would
push p95 first-paint over our SLO.

### 2. No framework runtime

We chose vanilla ES2025 modules + Vite. The closest alternatives:

| Framework | Runtime cost (gzip) | First-paint impact |
| --------- | ------------------- | ------------------ |
| React 18 + ReactDOM | ~45 KB              | Doubles our initial bundle. |
| Vue 3.4              | ~33 KB              | Pushes us to 78 KB. |
| Svelte 5 (compiled)  | ~3 KB runtime       | Acceptable, but adds a build dialect. |
| **Vanilla**          | **0 KB**            | We pay only for code we wrote. |

We picked vanilla precisely so 100% of our budget is *application*
code.

### 3. Three runtime dependencies

`@supabase/supabase-js` (lazy), `dompurify` (~7 KB gzip), `valibot`
(~3 KB gzip). Every other utility is in-tree. ADR-001 explains the
zero-runtime-bloat principle that flowed into this number.

## How we stay inside the budget

### `npm run audit:bundle`

CI runs `scripts/check-bundle-size.mjs` after `vite build`. It reads
`dist/`, gzips each entrypoint, and fails the build if the initial
chunk exceeds 60 KB or grows by more than 10% versus the last
release. Output lands in PR comments via the `size-report.mjs`
companion.

### Dynamic imports

Sections, modals, and locales are imported on demand:

```js
const { mount } = await import(`./sections/${name}.js`);
```

Vite emits one chunk per dynamic import — the seating-chart bundle
(~12 KB gzip) only ships when the user opens it.

### Locale lazy-loading

`src/i18n/he.json` ships in the initial bundle (Hebrew is the
default). `en.json`, `ar.json`, `ru.json` load only when the user
flips the language toggle.

### Dependency review

Adding a new dep requires:

1. An ADR (or an explicit "extends ADR-001" note) describing the
   bundle cost, alternatives considered, and lazy-loading plan.
2. A `npm run size` diff in the PR description.
3. Approval from the release engineer.

We have rejected, in writing, Sentry SDK (50 KB), Lodash, RxJS, and
Tailwind for this reason.

## What we gave up

Honest trade-offs:

- **No virtual DOM.** Re-renders are explicit; sections own their
  patch logic. Tooling like React DevTools doesn't apply.
- **Hand-rolled router.** ADR-025 picked `pushState` over
  `react-router`-equivalents.
- **Manual dependency injection.** `core/store.js` is the seam.
- **No CSS-in-JS.** Themes use CSS custom properties and `@layer`.

These are deliberate. Our user is on a phone in a banquet hall — the
budget is a feature, not a constraint.

## Dashboard

| Metric                         | Current   | Target    |
| ------------------------------ | --------- | --------- |
| Initial JS gzip                | ~32 KB    | ≤ 45 KB   |
| Initial CSS gzip               | ~9 KB     | ≤ 12 KB   |
| Total initial gzip             | ~45 KB    | ≤ 60 KB hard |
| Lazy section avg gzip          | ~6 KB     | ≤ 10 KB   |
| Locale JSON gzip               | ~2 KB ea. | ≤ 4 KB    |

(Numbers reproduce locally with `npm run size`; CI publishes to PRs.)

## See also

- [docs/explanation/zero-runtime-deps.md](./zero-runtime-deps.md)
- [ADR-001 zero runtime deps](../adr/001-zero-runtime-deps.md)
- [scripts/size-report.mjs](../../scripts/size-report.mjs)
- ROADMAP §3.1 — performance budgets
