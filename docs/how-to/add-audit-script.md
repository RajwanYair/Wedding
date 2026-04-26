# How-to: Add a new `audit:*` script

> Audience: maintainers extending the advisory CI gates
> Reference: [docs/reference/audit-scripts.md](../reference/audit-scripts.md)

## Recipe

### 1. Pick a name

Use the prefix **`audit:`** for diagnostic scans, **`check:`** for
correctness gates that must pass. Audit scripts are **advisory by
default**. They support `--enforce` to flip into blocking mode.

### 2. Create the file

```text
scripts/audit-<topic>.mjs
```

Skeleton:

```js
#!/usr/bin/env node
/**
 * scripts/audit-<topic>.mjs — Advisory scan for <X> (<ADR ref>).
 *
 * Advisory mode (default): always exits 0.
 * Pass `--enforce` to exit 1.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ENFORCE = process.argv.includes("--enforce");
const ROOT = "src";

const violations = [];

// … walk files, collect { file, line, rule, snippet } …

if (violations.length === 0) {
  console.log("[audit-<topic>] OK — no issues.");
  process.exit(0);
}
console.log(`[audit-<topic>] Found ${violations.length} issue(s):`);
for (const v of violations) {
  console.log(`  ${v.file}:${v.line}  [${v.rule}]`);
  console.log(`    > ${v.snippet}`);
}
process.exit(ENFORCE ? 1 : 0);
```

### 3. Register the npm script

Add to `package.json` `"scripts"`:

```jsonc
"audit:<topic>": "node scripts/audit-<topic>.mjs"
```

Order matters: place it next to related audits (router, secrets, etc.)
not in alphabetical-only order.

### 4. Wire CI as advisory

In `.github/workflows/ci.yml`, add a step on the **Node 22** matrix
only (keep older Node lean):

```yaml
- name: Audit (<topic>) — advisory
  if: matrix.node == 22
  run: npm run audit:<topic>
  continue-on-error: true
```

### 5. Add to docs

- Append a row to [docs/reference/audit-scripts.md](../reference/audit-scripts.md).
- Mention the script in the relevant ADR's "Acceptance criteria".

### 6. Promotion path

When you flip the advisory to enforced (usually a major-version bump):

1. Drop `continue-on-error` from the CI step.
2. Replace `audit:<topic>` with `audit:<topic> -- --enforce`.
3. Update [docs/reference/audit-scripts.md](../reference/audit-scripts.md) **Default** column.

## Related

- [Reference: audit scripts](../reference/audit-scripts.md)
- [ADR-025: pushState router](../adr/025-pushstate-router.md)
- [ADR-026: Encrypt tokens at rest](../adr/026-encrypt-tokens-at-rest.md)
