---
mode: agent
description: "Migrate a JavaScript file to TypeScript — rename, add types, fix TSC errors, update imports."
---

# Migrate to TypeScript

Migrate `${file}` from JavaScript to TypeScript:

1. Rename `.js` → `.ts` (or `.mjs` → `.mts` for scripts)
2. Add explicit type annotations to all exports
3. Replace JSDoc `@param`/`@returns` with TS signatures
4. Run `npm run typecheck` — fix all errors in this file
5. Update all import paths that reference this file
6. Run `npm run lint` — ensure 0 errors
7. Run `npm test` — ensure all tests still pass

## Rules

- Prefer `interface` over `type` for object shapes
- Use existing types from `src/types.d.ts` and `src/types/`
- Do NOT change runtime behavior — types only
- Keep the file in the same directory
- Preserve all existing JSDoc `@module` and `@owner` tags as comments
