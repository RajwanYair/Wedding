# Documentation Index — Wedding Manager

> v11.9.0 · [Live App](https://rajwanyair.github.io/Wedding) · [GitHub](https://github.com/RajwanYair/Wedding)

This directory contains all architecture, integration, and operational documentation for the Wedding Manager project.

The user-facing docs are organized by the [Diátaxis](https://diataxis.fr/) framework:

| Quadrant | Folder | Purpose |
| --- | --- | --- |
| **Tutorials** | [tutorials/](tutorials/) | Learning-oriented, fixed happy-path lessons |
| **How-to guides** | [how-to/](how-to/) | Task-oriented recipes for common goals |
| **Reference** | [reference/](reference/) | Information-oriented, exhaustive facts |
| **Explanation** | [adr/](adr/) | Understanding-oriented architectural rationale |

## Diátaxis quick links

- Tutorial: [Your first event](tutorials/first-event.md)
- How-to: [Add a locale](how-to/add-a-locale.md)
- Reference: [Storage keys](reference/storage-keys.md)
- Explanation: see the ADR table below.

---

## Architecture Decision Records (ADRs)

| # | Title | Status |
|---|-------|--------|
| [001](adr/001-zero-runtime-deps.md) | Zero Runtime Dependencies | ✅ Accepted |
| [002](adr/002-esm-module-architecture.md) | ESM Module Architecture | ✅ Accepted |
| [003](adr/003-store-driven-reactivity.md) | Store-Driven Reactivity | ✅ Accepted |
| [004](adr/004-message-template-engine.md) | Message Template Engine | ✅ Accepted |
| [005](adr/005-campaign-state-machine.md) | Campaign State Machine | ✅ Accepted |
| [006](adr/006-guest-token-design.md) | Guest Token Design | ✅ Accepted |
| [007](adr/007-event-scoping.md) | Event Scoping | ✅ Accepted |
| [008](adr/008-pii-classification.md) | PII Classification | ✅ Accepted |
| [009](adr/009-optimistic-updates.md) | Optimistic Updates | ✅ Accepted |
| [010](adr/010-ab-testing-strategy.md) | A/B Testing Strategy | ✅ Accepted |
| [011](adr/011-focus-trap-accessibility.md) | Focus Trap Accessibility | ✅ Accepted |
| [012](adr/012-event-bus.md) | Event Bus | ✅ Accepted |
| [022](adr/022-action-namespace-migration.md) | Action Namespace Migration | 🟡 Proposed |
| [023](adr/023-org-team-scoping.md) | Org & Team Scoping | 🟡 Proposed |
| [024](adr/024-bundle-size-budget.md) | Bundle Size Budget | 🟡 Proposed |

---

## Integration Guides

| Document | Description |
|----------|-------------|
| [integrations/overview.md](integrations/overview.md) | High-level overview of all integrations |
| [integrations/supabase.md](integrations/supabase.md) | Supabase setup, RLS, edge functions |

---

## Operations Runbooks

| Document | Description |
|----------|-------------|
| [operations/deploy-runbook.md](operations/deploy-runbook.md) | GitHub Pages deploy procedure |
| [operations/incident-response.md](operations/incident-response.md) | Incident classification and response |
| [operations/migrations.md](operations/migrations.md) | Database migration procedures |

---

## Key Reference Documents

| Document | Location | Description |
|----------|----------|-------------|
| Architecture | [ARCHITECTURE.md](../ARCHITECTURE.md) | System architecture overview |
| Roadmap | [ROADMAP.md](../ROADMAP.md) | Phase roadmap + competitive analysis |
| Changelog | [CHANGELOG.md](../CHANGELOG.md) | Full version history |
| Contributing | [CONTRIBUTING.md](../CONTRIBUTING.md) | Development setup + contribution guide |
| Security | [SECURITY.md](../SECURITY.md) | Security policy + vulnerability reporting |

---

## Copilot Customizations

| File | Purpose |
|------|---------|
| [.github/copilot-instructions.md](../.github/copilot-instructions.md) | Global Copilot rules |
| [.github/instructions/javascript.instructions.md](../.github/instructions/javascript.instructions.md) | JS conventions for `src/**` |
| [.github/instructions/css.instructions.md](../.github/instructions/css.instructions.md) | CSS conventions for `css/**` |
| [.github/instructions/tests.instructions.md](../.github/instructions/tests.instructions.md) | Test conventions for `tests/**` |
| [.github/instructions/supabase.instructions.md](../.github/instructions/supabase.instructions.md) | Supabase conventions |
| [.github/prompts/version-bump.prompt.md](../.github/prompts/version-bump.prompt.md) | Version bump workflow |
| [.github/prompts/i18n-add.prompt.md](../.github/prompts/i18n-add.prompt.md) | Add i18n key workflow |
| [.github/prompts/debug-issue.prompt.md](../.github/prompts/debug-issue.prompt.md) | Debug issue workflow |
| [.github/prompts/pre-release.prompt.md](../.github/prompts/pre-release.prompt.md) | Pre-release checklist |
