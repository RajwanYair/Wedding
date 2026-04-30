# ADR-043: pnpm evaluation for CI and local development

- **Status**: Proposed — 2026-05-24
- **Phase**: B (v15.0.0)
- **Owner**: Platform / CI
- **Related**:
  [ADR-002 ESM module architecture](./002-esm-module-architecture.md),
  [ADR-037 supply-chain hardening](./037-supply-chain-hardening.md),
  [ADR-042 CI baseline gating](./042-ci-baseline-gating.md)

## Context

The project currently uses **npm** (v10, shared `../MyScripts/node_modules/`
for local dev; dedicated `npm ci` in GitHub Actions CI). This design was
chosen to share tooling between sibling projects and avoid duplicate installs.
It works but has two friction points:

1. **Hoisting non-determinism** — npm hoisting occasionally pulls a different
   transitive version of a shared devDep (e.g. `eslint-plugin-jsdoc`) on fresh
   CI runs, causing hard-to-reproduce lint failures.
2. **Disk / time in CI** — a full `npm ci` on the GitHub-hosted runner takes
   ~40–50 s for 561 packages; pnpm with a content-addressable store and
   hardlinks can reduce this to ~10–15 s after the first warm run.

### Alternatives evaluated

| Option           | Install time (warm) | Deduplication             | Lock file format    |
| ---------------- | ------------------- | ------------------------- | ------------------- |
| npm (current)    | ~45 s               | hoisting only             | `package-lock.json` |
| pnpm             | ~12 s (est.)        | content-addressable store | `pnpm-lock.yaml`    |
| yarn Berry (PnP) | ~10 s (est.)        | PnP linker                | `yarn.lock`         |

Yarn Berry's Plug'n'Play linker requires every package to declare its deps
explicitly; several build tools (Vite, Playwright) have historically had
partial PnP support issues. pnpm's `nodeLinker=node-modules` mode is a
drop-in replacement.

## Decision

Run a **parallel pnpm CI workflow** (`.github/workflows/pnpm-ci.yml`) alongside
the existing npm workflow for one release cycle (v15.0.0 → v16.0.0). If:

- install time improves ≥ 30 %, AND
- lint + tests pass on every merge to `main`, AND
- no new hoisting-related failures appear

…then migrate fully to pnpm and drop `package-lock.json` in v16.0.0. If the
pilot reveals blockers (e.g. incompatibility with shared parent node_modules),
revert without impact.

### Key constraints

- Local dev keeps `../MyScripts/node_modules/` fallback unchanged for now.
- `pnpm-lock.yaml` is committed for reproducibility during the pilot.
- `package-lock.json` is kept alongside it until the migration is confirmed.
- The pnpm workflow is **informational** (non-blocking) during the pilot.

## Consequences

**Positive**

- Faster CI installs via content-addressable store + hardlinks.
- Stricter phantom-dependency prevention (`node_modules/.modules.yaml`).
- `pnpm audit` output is a drop-in for `npm audit`.

**Negative / Risks**

- Two lock files in the repo during the pilot period.
- Any script using `npm run` inside `.github/workflows/` must be updated
  to `pnpm run` after migration.
- Shared `../MyScripts/node_modules/` cannot be symlinked by pnpm without
  extra `node-linker` config.

## Implementation plan

1. Add `.github/workflows/pnpm-ci.yml` — install pnpm via `pnpm/action-setup`,
   run `pnpm install --frozen-lockfile`, then `pnpm run lint && pnpm run test`.
2. Generate `pnpm-lock.yaml` locally (`npx pnpm@latest import`).
3. Monitor timing across 5+ CI runs; document results in this ADR.
4. Decision review at v16.0.0 planning.
