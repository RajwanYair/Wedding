# ADR-017 — Coverage Gate Threshold & Rationale

> **Status:** Accepted · **Date:** 2026-04-29 · **Owners:** Release-Engineer · **Related:** §5.1 #3 of ROADMAP

## Context

`npm run test:coverage` is wired into `ci.yml` and gated (`# S6.11: Coverage gate is
enforced — failures block CI`). Internal coverage runs at ~85 % lines / ~75 % branches /
~85 % functions across 2280 tests. We have not, until now, encoded the *threshold* and
*review cadence* in an ADR — leaving room for the gate to drift if `vitest.config.*`
changes hands.

## Decision

1. **Threshold (CI-enforced):** **80 % lines · 75 % branches · 80 % functions** on the
   Node 22 matrix. Below threshold = CI red. Currently set in `vitest.config.*`; this
   ADR is the change-control record.
2. **Internal target (aspirational):** 85 % lines · 75 % branches · 85 % functions. We
   do not raise the CI gate until the internal target has held for two consecutive
   minor releases.
3. **Exemptions (documented in `vitest.config.*` `coverage.exclude`):**
   - `src/templates/**` — pure HTML templates.
   - `src/i18n/**` — JSON locale data (covered by `check-i18n.mjs`).
   - `tests/**` — test infrastructure.
   - `dist/**`, `node_modules/**`, `scripts/**`, `playwright.config.mjs`,
     `vite.config.js`, `eslint.config.mjs` — build / config.
4. **No per-file gate.** A per-file threshold creates churn around small utilities; we
   rely on the aggregate.
5. **Sprint policy:** any PR that drops aggregate coverage by more than 0.5 pp must
   either (a) restore coverage in the same PR, or (b) link an issue tagged `tech-debt`
   committing to recover it within one minor.

## Consequences

- The 80 % gate is intentionally below the 85 % internal target so refactors that
  legitimately reorganise tests do not block on a single percentage point swing.
- `tests/perf/` and `tests/e2e/` deliberately do **not** count toward unit coverage;
  Lighthouse CI and Playwright cover those concerns independently.
- A future move to per-package thresholds (e.g. higher gate on `core/`, `services/`)
  remains open — see §5.3 #1 of ROADMAP and ADR-019.

## Alternatives Considered

- **No CI gate (status quo before v11.3.0):** rejected — coverage drifted twice during
  the v10 → v11 series.
- **90 % hard gate:** rejected — punishes legitimate refactors and biases toward
  trivial tests.
- **Per-file gate:** rejected — noisy on small utilities.
