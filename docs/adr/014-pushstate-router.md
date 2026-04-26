# ADR-014: Hash Router → `pushState` + Typed Routes

**Status:** Proposed (target v12.0.0)
**Date:** 2026-04-28
**Deciders:** Engineering Team

## Context

Today the app navigates with hash fragments (`#guests`, `#tables`, …). The
hash router has two concrete failures users hit in v11:

1. The browser back button does not always restore the previous section
   because `replaceState` (not `pushState`) is the historical default — fixed
   in part for primary-tab clicks in v11.5.0 but still inconsistent.
2. There is no first-class way to deep-link to a specific record:
   `?guestId=abc` is not part of any route table; sections re-implement query
   handling.

Roadmap §4 lists this as a P0 router workstream for v12 (Phase A6).

A typed route table already lives at `src/core/route-table.js` (added in
v11.1.0) but is not yet authoritative.

## Decision

Migrate to `history.pushState` with a typed route table as the single source
of truth, while retaining a one-time **hash → path** fallback so PWAs
installed on prior versions keep working.

### Route shape

```ts
type Route = {
  name: SectionId;          // canonical id (matches SECTION_LIST)
  path: string;             // e.g. "guests" or "guests/:id"
  public: boolean;          // mirrors PUBLIC_SECTIONS gate
  query?: Record<string, "string" | "number">; // typed query params
};
```

### Navigation API

```ts
navigateTo(name: SectionId, params?: Record<string, string|number>): void;
onPopState(state: { section, params }): void;     // browser back/forward
```

### Hash fallback (one release only)

On bootstrap, if `location.hash` is present and `location.search` is empty,
parse the hash as `#section?key=val`, replace it with the equivalent path
via `history.replaceState`, and continue. Removed in v13.0.0.

### Public vs admin gate

The route table carries `public: true|false`. `nav.js` reads this instead of
the existing `PUBLIC_SECTIONS` Set; the Set becomes a derived constant for
backward compat in v12 and is removed in v13.

## Consequences

**Positive:**

- Browser back/forward restore section + query params reliably.
- Deep links (`/Wedding/guests?id=abc`) shareable from WhatsApp.
- Single canonical route table (no two sources of truth for "is this
  public?").
- View Transitions (already supported by core/route-table) become trivial.

**Negative:**

- GitHub Pages cannot serve nested paths without a 404 fallback. We will
  add `public/404.html` that re-runs the bootstrap with the requested path
  preserved in `sessionStorage` (standard SPA-on-Pages workaround).
- One release of dual-mode handling adds ~30 LoC to the bootstrap.

## Alternatives considered

- **Stay on hash.** Rejected: roadmap blocker; back button bugs cost UX.
- **Adopt a third-party router (e.g. lit-html-router, navaid).** Rejected:
  violates zero-runtime-deps; our needs are 18 sections + a few params.
- **Re-implement React-Router shape.** Rejected: over-engineered for a
  flat section list.

## References

- Roadmap §6 Phase A6 — pushState router
- `src/core/route-table.js` (existing typed table)
- `src/core/nav.js` (current hash router)
- `src/core/constants.js` (`PUBLIC_SECTIONS`, `SECTION_LIST`)
- ADR-007 (event-scoping) — query-param model is consistent with `event_id`
