# ADR-025: Migrate Hash Router to `pushState` + Typed Routes

- **Status**: Proposed
- **Date**: 2026-04-29
- **Targeted release**: v12.0.0 (Phase A6)
- **Related**: ADR-002 (ESM modules), ADR-012 (event bus), ROADMAP §6 Phase A

## Context

The current router (`src/core/nav.js`) is **hash-based**: every section change
writes `#guests`, `#tables`, … to `location.hash`. This was simple to ship and
plays well with GitHub Pages, but it has three real, reproducible problems:

1. **Back button is broken** — `replaceState` is used in several call sites
   to "tidy" the URL, which silently drops history entries. Users press
   "back" and end up two sections behind, or the browser leaves the app
   entirely.
2. **No deep-link parameters** — opening a specific guest, table, or
   campaign requires a custom in-app handler. There is no `?id=…`
   convention; deep links from WhatsApp invitations re-implement parsing
   per section.
3. **Hash collides with anchors** — anchors inside long sections (e.g.
   "back to top") fight the router for ownership of `location.hash`.

ROADMAP §1 verdict for routing: **Replace.** This ADR documents the
migration and acceptance criteria.

## Decision

Adopt a `pushState` router with a **typed route table**, **query params for
deep links**, and a single delegated `popstate` handler.

### Route table shape

```js
// src/core/route-table.js (already exists; extend it)
export const ROUTES = Object.freeze({
  dashboard: { path: "/", section: "dashboard", auth: "admin" },
  guests:    { path: "/guests", section: "guests", auth: "admin",
               params: { id: "string?", filter: "string?" } },
  rsvp:      { path: "/rsvp", section: "rsvp", auth: "public",
               params: { phone: "string?", token: "string?" } },
  // …
});
```

Each entry declares:

- `path` — the canonical URL fragment under `import.meta.env.BASE_URL`.
- `section` — the section module to mount.
- `auth` — `"public" | "admin"` (replaces ad-hoc `PUBLIC_SECTIONS` checks).
- `params` — declared query keys with type + optionality.

### Navigation API

```js
import { navigate, currentRoute, onRouteChange } from "src/core/nav.js";

navigate("guests", { id: guest.id });        // pushState
navigate("guests", { filter: "pending" }, { replace: true }); // replaceState
const { section, params } = currentRoute();
const off = onRouteChange((r) => render(r.section, r.params));
```

### Migration phases

| Phase | Release | Scope |
| --- | --- | --- |
| R0 | v11.10.0 (this ADR) | Specification + parameter schema only |
| R1 | v11.11.x | Add `navigate()` + `popstate` handler **alongside** the hash router. Both work; `navigate()` writes `pushState`. |
| R2 | v11.12.x | Refactor every `location.hash = …` call to `navigate()` |
| R3 | v12.0.0 | Remove the hash listener; redirect `#section` → `/section` once on load for backwards compatibility |

### Deep-link conventions

| Section | Param | Effect |
| --- | --- | --- |
| `/guests` | `?id=<uuid>` | Opens the guest detail modal |
| `/guests` | `?filter=pending\|confirmed\|declined` | Pre-applies a filter |
| `/rsvp` | `?phone=<e164>` | Pre-fills RSVP phone lookup |
| `/rsvp` | `?token=<jwt>` | One-tap token-bound RSVP |
| `/tables` | `?id=<uuid>` | Opens the table editor |
| `/campaign` | `?id=<uuid>` | Opens the named campaign |

All params pass through `valibot` schemas before the section sees them.

### GitHub Pages compatibility

GH Pages serves any unknown path as `404.html`. We solve this with the
standard `404.html → index.html` redirect already used by other SPAs:

1. Copy `index.html` to `dist/404.html` in `vite build` (postbuild script).
2. On boot, `src/main.js` checks `sessionStorage.spaRedirect` and replays
   the original URL via `history.replaceState`.

## Alternatives considered

1. **Stay on hash routing** — rejected: back-button breakage is a P0 UX
   issue, deep links remain awkward.
2. **Move to a router library (e.g. `wouter`, `navigo`)** — rejected:
   adds a runtime dependency for ~150 lines of code we already have.
3. **History API directly without a route table** — rejected: every
   section reinvents param parsing; no central auth gate.

## Consequences

- **Bookmarks change**: `https://…/Wedding/#guests` → `https://…/Wedding/guests`.
  We add a one-shot client redirect for the lifetime of v12.
- **Service worker**: precache list must include `404.html`.
- **Tests**: Playwright smoke specs that assert `location.hash` rewrite to
  assert `location.pathname`.
- **Sentry / monitoring**: stack-trace URLs gain real paths, simplifying
  triage.

## Acceptance criteria for R0 (this ADR)

- [x] Decision document committed
- [x] Param schema convention defined
- [ ] R1 implementation ticket opened
- [ ] Migration timeline pinned to v12.0.0
