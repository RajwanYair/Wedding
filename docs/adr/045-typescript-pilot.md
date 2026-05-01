# ADR-045 — TypeScript pilot: `worker/` first

- Status: Accepted
- Date: 2026-05
- Related: ADR-002, ADR-035, ADR-044

## Context

ADR-035 lays out the broader plan to migrate `core/`, `services/`, and
`handlers/` to TypeScript.  Before touching app modules we need a low-risk
pilot to validate the toolchain, lint integration, build pipeline, and
test runner.  S568 adopts the new `worker/` directory (S564–S566 AI edge
proxy) as that pilot:

- It is a brand-new module — no existing JSDoc to translate.
- It is deployed independently (Cloudflare Workers) — TypeScript build
  failures cannot block GitHub Pages deploys of the main app.
- It is small (3 files at S566) — easy to keep `tsc --noEmit` green.

## Decision

1. Add a **dedicated `tsconfig.worker.json`** that compiles `worker/**/*.ts`
   with `strict: true`, `noEmit: true`, `module: "es2022"`, `target: "es2022"`,
   `moduleResolution: "bundler"`, and `lib: ["es2023", "webworker"]`.
2. Convert one file in this sprint: `worker/types.ts` — defines the shared
   `ProxyRequest` / `ProxyResponse` interfaces previously duplicated in
   JSDoc across `worker/router.js` and `worker/providers.js`.  Both `.js`
   files import the types via `/** @typedef {import("./types.js").…} */`
   so runtime behaviour is unchanged.
3. The Vitest config does not need updating — the existing `vmThreads`
   pool with Vite's transform handles `.ts` imports transparently.
4. ESLint already supports TS via `@typescript-eslint/parser` (devDep).
   Add a small `worker/**/*.ts` override that swaps the parser.
5. Lint, test, and CI gates must pass at zero errors before merging.

## Consequences

- **Positive**: Validates ADR-035's assumptions in isolation; produces a
  reusable `tsconfig` skeleton; shared `ProxyRequest`/`ProxyResponse`
  interfaces reduce duplication in adapters.
- **Negative**: Adds a second tsconfig file to maintain.  Mixed `.js`/`.ts`
  in `worker/` requires contributors to know both — mitigated by keeping
  types-only in `.ts` for now.
- **Neutral**: No bundle impact (worker is not part of the main app build).

## Out of scope

- Converting `core/`, `services/`, `handlers/`.  Those land in ADR-035 phases.
- `.d.ts` ambient declarations for non-worker code.
- Strict null checks on the existing JSDoc-typed app modules.
