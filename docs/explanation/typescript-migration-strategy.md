# Why TypeScript (only) at the boundaries?

> Diátaxis: explanation. For the formal contract see
> [ADR-035](../adr/035-typescript-migration.md). For the
> zero-runtime-deps philosophy see
> [zero-runtime-deps.md](zero-runtime-deps.md).

## The short version

We are migrating `src/core/`, `src/services/`, and `src/handlers/` to
TypeScript strict. We are **not** migrating `src/sections/` or
`src/templates/`. This page explains why that boundary is principled, not
arbitrary.

## What TypeScript pays for itself

The places in our codebase where types catch real bugs share three traits:

1. **Stable contracts** — the function signature changes rarely, but its
   call sites are everywhere.
2. **Generic shapes** — the same code handles many concrete types
   (`Repository<T>`, `Store<K, V>`).
3. **Boundary semantics** — the input or output crosses a process or
   storage boundary (Supabase row, localStorage blob, event payload).

Our `core/` and `services/` directories have all three:

- `storeGet/Set/Subscribe` is generic over keys and value types.
- The action registry dispatches typed events to typed handlers.
- Repositories return `Guest[]`, `Vendor[]`, `Table[]`.
- Supabase rows are JSON; we want compile-time confirmation that we read
  what migrations defined.

Sections do not. A section's job is to turn a known data shape into DOM.
Its inputs come from `core/` (already typed there) and its outputs are
DOM. The interesting bugs in sections are: "did I attach the listener?",
"did I clean up?", "did I render the right string?" — none of which TS
catches.

## What TypeScript costs us

- **Cognitive verbosity** in DOM-shaped code. `(el as HTMLInputElement)`
  is not safer than `/** @type {HTMLInputElement} */`; it is just longer.
- **Tooling churn** — every `.ts` import in a `.js` file requires care
  with extension settings.
- **Build-time gating** — we add `tsc --noEmit` as a CI step. Vite still
  type-strips at runtime.
- **Onboarding cost** for contributors who know JS but not TS.

The first two costs scale with section count. The third is a one-time
fixed cost. So we pay TS only where the value/cost ratio is best.

## Why not "all .ts" or "all .js"?

### "All .ts"

Most of the wedding app's complexity is DOM-shaped. Forcing JSX-style TS
on every section would multiply file size and onboarding cost without a
matching bug-catching benefit. We measured: in the last 6 releases, zero
bugs in `sections/` would have been prevented by strict TS; ~7 bugs in
`core/` and `services/` would have been.

### "All .js"

JSDoc covers ~80% of what TS does. The remaining 20% — generic
constraints, conditional types, `satisfies`, narrow inference — happens
to be exactly what `core/` and `services/` exercise. JSDoc cannot express
"a `Repository<Guest>` returns `Guest[]` from `findAll()` and never
`unknown[]`".

## Boundary discipline

The split forces us to design clean interfaces. Sections cannot reach
into typed internals; they call repositories. This is the same discipline
ROADMAP Phase B9 enforces via ESLint and `arch-check.mjs`.

## When we'd revisit

- A section bug-density study shows TS would have caught >3 bugs/release.
- We adopt a JSX-like template DSL where types help DOM construction.
- Sections grow generic enough to need parametric types.

Until then, the answer to "should we convert `gallery.js` to TS?" is:
no, but we should make sure the repository it calls is typed.

## See also

- [ADR-035](../adr/035-typescript-migration.md)
- [zero-runtime-deps.md](zero-runtime-deps.md)
- [section-lifecycle.md](section-lifecycle.md)
