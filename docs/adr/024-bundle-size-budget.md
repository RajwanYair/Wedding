# ADR-024: Per-Route Bundle Size Budget

- **Status**: Proposed
- **Date**: 2026-04-29
- **Targeted release**: v11.9.0 (advisory) → v12.0.0 (enforcing)

## Context

The current `npm run size` script reports the total `dist/` size after a Vite
build, but does not break down per-route or per-chunk gzip costs. As ADR-014
codified the move to lazy section + modal templates, we now load JS by route,
which makes a **per-chunk** budget far more useful than a flat total.

Recent measurements (v11.8.0):

```text
Total gzip:      ~45 KB initial (main + vendor)
Largest chunk:   ~22 KB (main entry, post-treeshake)
Lazy modals:     1–4 KB each
Section JS:      2–8 KB each
```

Without a budget, regressions creep in silently — particularly when adding
charting libraries to analytics or campaign tooling.

## Decision

Adopt the following **gzip** budgets:

| Tier | Budget | Applies to |
| --- | --- | --- |
| Initial bootstrap | **60 KB** | `index.html` + entry chunk + critical CSS |
| Per-route chunk | **25 KB** | Any single section JS chunk |
| Per-modal chunk | **10 KB** | Any single modal JS or template chunk |
| Total app | **220 KB** | Sum of all gzip chunks in `dist/` |

### Enforcement timeline

| Release | Mode |
| --- | --- |
| v11.9.0 | **Advisory** — `audit:bundle` script reports + warns; CI never fails |
| v12.0.0 | **Enforcing** — exceeding any budget fails the `npm run ci` step |

### Override mechanism

A new `scripts/bundle.budget.json` may pin a per-chunk override:

```json
{
  "overrides": {
    "analytics.js": 35,
    "campaign.js": 30
  },
  "comment": "Charts pull recharts-lite (lazy); reviewed 2026-04-29"
}
```

Any override must include a comment and be reviewed at every minor release.

## Alternatives considered

1. **Single total budget only** — too coarse; hides single-route bloat.
2. **Per-file (raw KB) budget** — punishes cleanly compressing code; gzip is
   what users actually download.
3. **Webpack-bundle-analyzer style report** — useful, but heavier than the
   current minimal toolchain. The advisory script can graduate to this if
   needed.

## Consequences

- A new `scripts/check-bundle-size.mjs` walks `dist/`, gzips each chunk via
  `node:zlib`, compares against the budget table, prints a report, and exits
  0 in advisory mode (1 in enforcing mode).
- `npm run audit:bundle` runs the script after `npm run build`.
- `npm run ci` keeps it advisory until v12.0.0 — the script's exit code is
  ignored via `|| true` until the enforcement flip.
- Documenting overrides in JSON keeps the budget scrutable in git diffs.

## Acceptance criteria

- [x] Decision document committed
- [ ] `scripts/check-bundle-size.mjs` lands in v11.9.0 as advisory
- [ ] `scripts/bundle.budget.json` committed with the v11.9.0 measurement baseline
- [ ] CI flips to enforcing mode in v12.0.0
