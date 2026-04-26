# ADR-035 — TypeScript migration for `core/`, `services/`, `handlers/`

- Status: Proposed
- Date: 2026-04
- Related: ADR-002, ROADMAP §6 Phase B2

## Context

Today the entire `src/` tree is JavaScript with `// @ts-check` comments and
JSDoc annotations. Type information lives in `src/types.d.ts` and is
consumed by the language service. This works well for sections, where
DOM-shaped logic is dominant and JSDoc reads naturally. It works poorly
for `core/` (store, router, i18n, events, action-registry), `services/`
(supabase, sheets, error-monitor, presence), and `handlers/` (cross-cutting
event handlers): those modules have stable, narrow contracts where strict
generic types catch real bugs that JSDoc cannot express.

Symptoms in the current setup:

- `storeGet/Set/Subscribe` cannot constrain key→value pairs; sections cast.
- Event-handler signatures drift between registration and dispatch.
- Repository return types are `Promise<unknown>` everywhere; callers cast.
- Refactors across `core/` and `services/` rely on grep, not the compiler.

## Decision

Migrate three directories to **TypeScript strict** in this priority order:

1. **`src/core/`** — store, router, i18n, events, action-registry, etc.
2. **`src/services/`** — supabase, error-monitor, presence, sheets, etc.
3. **`src/handlers/`** — cross-cutting event handlers.

`src/sections/` and `src/templates/` stay as `.js` + JSDoc + `data-i18n`.
This gives us strict typing where it pays (boundaries, contracts, generics)
without paying the JSX-style verbosity cost in DOM-shaped code.

### Migration phases

| Phase | Scope                                              | Gate     |
| ----- | -------------------------------------------------- | -------- |
| TS0   | `tsconfig.json`: `strict: true`, `noEmit`, ES2025  | advisory |
| TS1   | Mechanical `.js → .ts` for `src/core/` (no logic changes) | advisory |
| TS2   | `src/services/` migration                          | advisory |
| TS3   | `src/handlers/` migration                          | advisory |
| TS4   | Flip CI: `npx tsc --noEmit` is a hard gate         | enforce  |

### Constraints

- **Build does not change.** Vite already type-strips on the fly via
  esbuild. We add `npx tsc --noEmit` as a separate CI step; runtime is
  unaffected.
- **No external `.d.ts` for shipped code.** Each `.ts` file is its own
  source of truth; `src/types.d.ts` becomes a thin re-export.
- **No barrel files.** Direct imports keep tree-shaking honest.
- **No decorators, no namespaces, no enums** (use `as const` unions).
- **Sections stay `.js`.** This is a deliberate boundary; revisited only
  if section bug-density justifies it.

## Consequences

Positive:

- Compiler-verified contracts at every module boundary.
- Refactors in `core/` are structurally safe.
- IDE feedback for cross-cutting renames is instant.

Negative:

- Three migration commits with mechanical churn.
- Adds `typescript` to devDependencies (already present transitively via
  Vite/Vitest; adding it as a direct devDep is a no-op for users).

## Non-goals

- Migrating sections or templates.
- Generating runtime type guards (Valibot already covers boundary
  validation; ADR-008).
- Decorators or class-based DI.

## Rollout

- This release: ship `tsconfig.json` strict baseline + this ADR + the
  Diátaxis explanation page. No code touched.
- One phase per subsequent release; each migration commit stands alone
  with `npx tsc --noEmit` exiting 0.
