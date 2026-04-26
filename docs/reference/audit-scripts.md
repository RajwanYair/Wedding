# Reference: audit scripts

> Catalogue of every `audit:*` npm script. All audit scripts are
> **advisory-only** by default and exit 0 on violations. Add `--enforce`
> (where supported) to gate the build.

## Inventory

| Script | File | Default | Enforce flag | Purpose |
| --- | --- | --- | --- | --- |
| `audit:dead` | [scripts/dead-export-check.mjs](../../scripts/dead-export-check.mjs) | advisory | n/a | Unused exports |
| `audit:security` | [scripts/security-scan.mjs](../../scripts/security-scan.mjs) | enforced | n/a | `eval`/`innerHTML` |
| `audit:sections` | [scripts/validate-sections.mjs](../../scripts/validate-sections.mjs) | enforced | n/a | Section contract |
| `audit:arch` | [scripts/arch-check.mjs](../../scripts/arch-check.mjs) | enforced | n/a | Layered imports |
| `audit:actions` | [scripts/check-action-namespace.mjs](../../scripts/check-action-namespace.mjs) | advisory | n/a | `data-action` namespacing |
| `audit:trusted-types` | [scripts/audit-trusted-types.mjs](../../scripts/audit-trusted-types.mjs) | advisory | n/a | Trusted Types readiness |
| `audit:adrs` | [scripts/check-adr-coverage.mjs](../../scripts/check-adr-coverage.mjs) | advisory | n/a | ADR coverage |
| `audit:bundle` | [scripts/check-bundle-size.mjs](../../scripts/check-bundle-size.mjs) | advisory | n/a | Bundle size budget |
| `audit:plaintext-secrets` | [scripts/check-plaintext-secrets.mjs](../../scripts/check-plaintext-secrets.mjs) | advisory | `--enforce` | ADR-026 plaintext writes |
| `audit:coverage` | [scripts/check-coverage-gate.mjs](../../scripts/check-coverage-gate.mjs) | advisory | `--enforce` | Test coverage targets |
| `audit:router` | [scripts/audit-router-usage.mjs](../../scripts/audit-router-usage.mjs) | advisory | `--enforce` | ADR-025 R1 hash/pushState |

## Promotion path

Each advisory script ships in three stages:

1. **Land as advisory** — added to `package.json`, exits 0, used in CI as a non-blocking step.
2. **Burn down call sites** — fix violations in normal feature work; track count in changelog.
3. **Promote to enforced** — flip the default to fail-on-violation in a major version bump.

## Running locally

```pwsh
# All advisory checks
npm run audit:dead
npm run audit:bundle
npm run audit:plaintext-secrets
npm run audit:coverage
npm run audit:router

# Enforce (will exit 1 on any violation)
npm run audit:plaintext-secrets -- --enforce
npm run audit:router -- --enforce
```

## CI integration

See [.github/workflows/ci.yml](../../.github/workflows/ci.yml) — advisory steps
run on the Node 22 matrix only and use `continue-on-error: true`.

## Related

- [ADR-025: pushState router](../adr/025-pushstate-router.md)
- [ADR-026: Encrypt tokens at rest](../adr/026-encrypt-tokens-at-rest.md)
- [ADR-027: Supabase as single backend](../adr/027-supabase-single-backend.md)
