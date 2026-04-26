# Architecture Decision Records (ADRs)

> Each ADR captures a single significant decision: context, alternatives, the
> decision, and its consequences. ADRs are immutable once accepted — supersede
> rather than edit. New ADRs are created via `.github/prompts/` or by hand.

| # | Title | Status | Date | Tags |
| --- | --- | --- | --- | --- |
| [001](001-zero-runtime-deps.md) | Zero runtime dependencies | Accepted | 2025 | bundle, principles |
| [002](002-esm-module-architecture.md) | ESM module architecture | Accepted | 2025 | architecture |
| [003](003-store-driven-reactivity.md) | Store-driven reactivity | Accepted | 2025 | state |
| [004](004-message-template-engine.md) | Message template engine | Accepted | 2025 | messaging |
| [005](005-campaign-state-machine.md) | Campaign state machine | Accepted | 2025 | messaging |
| [006](006-guest-token-design.md) | Guest token design | Accepted | 2025 | privacy |
| [007](007-event-scoping.md) | Event scoping (`event_id`) | Accepted | 2025 | multi-event |
| [008](008-pii-classification.md) | PII classification | Accepted | 2025 | privacy, security |
| [009](009-optimistic-updates.md) | Optimistic updates | Accepted | 2025 | UX |
| [010](010-ab-testing-strategy.md) | A/B testing strategy | Accepted | 2025 | analytics |
| [011](011-focus-trap-accessibility.md) | Focus trap accessibility | Accepted | 2025 | a11y |
| [012](012-event-bus.md) | Event bus | Accepted | 2025 | architecture |
| [013](013-opt-in-monitoring-and-supply-chain.md) | Opt-in monitoring + supply chain | Accepted | 2026-04-28 | observability, supply-chain |
| [014](014-pushstate-router.md) | `pushState` router migration | Accepted | 2026-04-28 | routing |
| [015](015-sheets-to-supabase-cutover.md) | Sheets → Supabase cutover | Accepted | 2026-04-28 | backend |
| [016](016-web-vitals-monitoring-policy.md) | Web Vitals monitoring policy | Accepted | 2026-04-29 | observability |
| [017](017-coverage-gate.md) | Coverage gate threshold | Accepted | 2026-04-29 | testing, CI |
| [018](018-trusted-types-adoption.md) | Trusted Types adoption plan | Proposed | 2026-04-29 | security |
| [019](019-repositories-enforcement.md) | Repositories layer enforcement | Accepted | 2026-04-29 | architecture |
| [020](020-service-directory-dedup.md) | Service directory dedup | Accepted | 2026-04-29 | architecture |
| [021](021-diataxis-docs-reorganization.md) | Diátaxis docs reorganization | Proposed | 2026-04-29 | docs |
| [022](022-action-namespace-migration.md) | Action namespace migration sequence | Proposed | 2026-04-29 | architecture |

## Status legend

- **Proposed** — under review; may change before acceptance.
- **Accepted** — committed; new code must comply.
- **Superseded** — replaced by a newer ADR (linked in header).
- **Deprecated** — no longer relevant but kept for history.

## When to write an ADR

Write an ADR for any decision that meets one or more of:

- Replaces an existing subsystem (router, store, storage, auth, backend).
- Introduces or removes a runtime dependency.
- Changes a public API of `core/`, `services/`, or `repositories/`.
- Sets a CI gate threshold (coverage, bundle size, Lighthouse score).
- Changes the security model (CSP, Trusted Types, encryption-at-rest).

A `Replace` decision in [ROADMAP.md](../../ROADMAP.md) §3 **must** have a matching
ADR — verified by `scripts/check-adr-coverage.mjs` (advisory in v11.x; hard gate in
v12.0.0).
