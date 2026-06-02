---
mode: agent
description: "Audit and clean dead code — unused exports, orphan files, unreferenced templates."
---

# Dead Code Audit

Run a comprehensive dead code audit:

1. `npm run audit:dead` — find unused exports
2. Check for orphaned template files in `src/templates/` not loaded by nav
3. Check for orphaned modal files in `src/modals/` not referenced
4. Check for utils with 0 import references outside their own test
5. Check for CSS classes defined but never used in HTML or JS

## Actions

For each dead artifact found:

- If clearly dead (0 references): delete it
- If ambiguous: flag for review with a `// TODO: verify usage` comment
- Update test counts and canonical facts after deletions

## Quality gate

After cleanup:

```bash
npm run lint && npm test && npm run build
```

All must pass with 0 errors.
