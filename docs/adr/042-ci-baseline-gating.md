# ADR-042: CI baseline-gating strategy for legacy debt

- **Status**: Accepted — 2026-05-02
- **Phase**: A/B (v12.0.0)
- **Owner**: Platform / CI
- **Related**:
  [ADR-017 coverage gate](./017-coverage-gate.md),
  [ADR-018 trusted types adoption](./018-trusted-types-adoption.md),
  [ADR-026 encrypt tokens at rest](./026-encrypt-tokens-at-rest.md),
  [ADR-032 console-error migration](./032-console-error-migration.md),
  [ADR-034 base-section adoption](./034-base-section-adoption.md),
  [ADR-036 css scope per section](./036-css-scope-per-section.md),
  [ADR-038 trusted types policy](./038-trusted-types-policy.md)

## Context

Phase A/B introduced multiple lint-style audits over the existing codebase:
`audit:dead`, `audit:arch`, `audit:trusted-types`, `audit:console-error`,
`audit:aria-roles`, `audit:router`, `audit:base-section`, `audit:css-scope`,
`audit:section-templates`, `audit:jsdoc`, `audit:plaintext-secrets`,
`audit:coverage`. Each one has a different starting count of pre-existing
violations. Two failure modes were observed:

1. **Pure advisory** audits drift upward — new violations land silently and the
   debt grows.
2. **Strict 0** gates block useful PRs unrelated to the audit's domain and
   create pressure to disable rather than triage.

## Decision

Every Phase A/B audit script accepts a `--baseline=<N>` flag. CI invokes the
script with the highest count that *currently* exists in `main`. The script
exits non-zero when the count *exceeds* the baseline, and prints both the
baseline and the delta. Once a domain reaches a sustainable floor (typically 0
or a documented exemption set), the gate is upgraded from `--baseline=N` to
`--enforce`.

Locked baselines as of v12.0.0:

| Audit | Mode | Value |
| --- | --- | --- |
| `audit:dead` | baseline | 193 |
| `audit:arch` | baseline | 15 |
| `audit:trusted-types` | baseline | 24 |
| `audit:plaintext-secrets` | enforce | 0 |
| `audit:coverage` | enforce | lines 49 / branches 41 / functions 54 / statements 48 |
| `audit:console-error` | enforce | 0 |
| `audit:aria-roles` | baseline | 18 |
| `audit:router` | baseline | 1 |
| `audit:base-section` | enforce | 0 |
| `audit:css-scope` | enforce | 0 |
| `audit:section-templates` | baseline | 2 |
| `audit:jsdoc` | enforce | 0 (500/500 documented) |

## Consequences

- **Positive**: violations can only go down. No silent drift. Each domain has
  an explicit owner via the related ADR.
- **Positive**: PR authors get an actionable error: "you went from N to N+1".
- **Negative**: the workflow file holds a lot of magic numbers. Mitigated by
  inline comments next to every step and this ADR as the central index.
- **Follow-up**: Each baseline-mode audit needs a roadmap entry for the
  enforce upgrade (Phase C/D).

## Implementation

`.github/workflows/ci.yml` invokes each script with the values above. Scripts
live under `scripts/audit-*.mjs` and `scripts/check-*.mjs`. Local devs run
`npm run audit:<name>` (advisory) or `npm run audit:<name> -- --enforce`.
