# ADR-022 — Action Namespace Migration Sequence

> **Status:** Proposed · **Date:** 2026-04-29 · **Owners:** Architecture · **Related:** ROADMAP §5.3 #4, ADR-019 (repositories enforcement), `scripts/check-action-namespace.mjs`

## Context

`src/core/action-registry.js` currently exports 108 `data-action` values, almost
all of them in flat camelCase form (`saveGuest`, `addNewEvent`, `cycleTheme`).
The advisory `audit:actions` script reports **0/102 namespaced** (6 lifecycle
actions are exempt). We have already committed in ROADMAP §5.3 #4 to migrate to
`domain:verb` (e.g. `guests:save`, `tables:add`).

A direct rename would touch:

- `src/core/action-registry.js` (enum values)
- 21 templates under `src/templates/*.html` (`data-action="..."`)
- 7 modal templates under `src/modals/*.html`
- ~30 handler functions under `src/handlers/*.js`
- Tests asserting action strings (~12 files)

We need a sequenced plan that keeps every release green.

## Decision

Migrate by **domain, one per minor release**, supporting both names during the
transition with a one-time `console.warn` in development.

### Migration order

| Order | Domain | Examples | Target release |
| --- | --- | --- | --- |
| 1 | Modals | `closeModal`, `openAddGuestModal` → `modal:close`, `modal:open-add-guest` | v11.8.0 |
| 2 | Auth | `submitEmailLogin`, `loginFacebook` → `auth:submit-email`, `auth:login-facebook` | v11.9.0 |
| 3 | Guests | `saveGuest`, `addGuestNote` → `guests:save`, `guests:add-note` | v11.10.0 |
| 4 | Tables | → `tables:*` | v11.11.0 |
| 5 | Vendors / Expenses | → `vendors:*`, `expenses:*` | v11.12.0 |
| 6 | Theme / UI / Mobile-nav | → `ui:cycle-theme`, `ui:toggle-light`, `ui:toggle-mobile-nav` | v11.13.0 |
| 7 | Events / Sections | → `events:*`, `nav:show-section` | v11.14.0 |
| 8 | Cleanup — remove old aliases | n/a | v12.0.0 |

### Dual-name support (per domain)

For each batch:

1. Add the new namespaced action value to `ACTIONS` and the runtime registry.
2. Map the new name to the same handler as the old name in
   `core/action-registry.js`.
3. Update one template / modal / test at a time to the new name; old continues
   to work.
4. Once the domain's templates are all on the new name, mark the old value as
   deprecated (dev-only `console.warn` on first use).

### CI gate evolution

| Release | `audit:actions` mode |
| --- | --- |
| v11.7.0 (today) | Advisory: report `flat` count, exit 0 |
| v11.8.0 | Advisory + per-domain counter — fail if Modals not 100 % namespaced |
| v11.9.0 | Hard gate on Modals + Auth |
| … incremental … | Each domain gates one release after migration |
| v12.0.0 | Hard gate on **all** domains; old aliases removed |

## Consequences

- Templates and tests change one domain at a time → small reviewable PRs.
- Bundle is unaffected (runtime registry remains a flat object).
- The `domain:verb` shape composes with future ARIA / instrumentation
  (e.g. emit `event_${domain}_${verb}` analytics events automatically).
- No "big-bang" PR; every release stays green.

## Alternatives Considered

- **Big-bang rename:** rejected — too large a diff to review safely.
- **Keep flat names forever:** rejected — see ROADMAP §5.3 #4 commitment.
- **Use slashes (`guests/save`) instead of colons:** rejected — `:` matches
  the convention in `data-i18n` keys we already ship.
