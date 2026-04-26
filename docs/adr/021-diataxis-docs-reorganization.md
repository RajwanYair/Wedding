# ADR-021 — Diátaxis Documentation Reorganisation

> **Status:** Proposed · **Date:** 2026-04-29 · **Owners:** Docs · **Related:** ROADMAP §3.4, §5.1 #6

## Context

Documentation has accumulated organically: ADRs, runbooks, locale guide, agent
guides, user guides (just added in v11.7.0). It is currently **author-organised**
(by-who-wrote-it) rather than **reader-organised** (by-what-the-reader-needs).
Diátaxis offers a clean four-quadrant split:

| Quadrant | Purpose |
| --- | --- |
| **Tutorial** | Learning-oriented; absolute-beginner-friendly |
| **How-to** | Task-oriented; assumes context |
| **Reference** | Information-oriented; precise, exhaustive |
| **Explanation** | Understanding-oriented; the "why" |

## Decision

Reorganise `docs/` over v11.8.0 → v12.0.0:

```text
docs/
  README.md                    ← top-level Diátaxis index (NEW)
  tutorials/
    first-event.md             ← end-to-end walk-through (NEW)
    invite-via-whatsapp.md     ← (NEW)
  how-to/
    add-a-locale.md            ← from current locale-guide.md
    bump-version.md            ← from .github/agents/release-engineer.agent.md (extract)
    restore-from-backup.md     ← from operations/disaster-recovery.md (extract)
  reference/
    data-shapes.md             ← from src/types.d.ts (generated)
    storage-keys.md            ← list of wedding_v1_* keys
    api.md                     ← repositories surface
  explanation/
    architecture.md            ← from ARCHITECTURE.md (link)
    adrs.md                    ← link to docs/adr/README.md
    roadmap.md                 ← link to ROADMAP.md
  users/                       ← stays (audience-first; cross-links into the four quadrants)
  operations/                  ← stays (audience-first)
  adr/                         ← stays (canonical explanation home)
```

### Migration sequence

1. **v11.8.0 (this release)** — add `docs/users/README.md` (done) and
   `docs/operations/README.md` (done). No content moves.
2. **v11.9.0** — create `docs/tutorials/first-event.md` and
   `docs/how-to/add-a-locale.md`; cross-link from the existing locale guide.
3. **v11.10.0** — generate `docs/reference/data-shapes.md` from `src/types.d.ts`
   via a new `npm run docs:reference` script.
4. **v12.0.0** — promote `docs/README.md` to the canonical entry point; archive
   author-ordered indexes that duplicate Diátaxis quadrants.

## Consequences

- New contributors get a clear map: "I want to learn → tutorials"; "I have a
  task → how-to"; "I need a fact → reference"; "I want to understand → ADRs".
- ADRs continue to serve the **Explanation** quadrant — no duplication.
- The `users/` and `operations/` audience-folders cross-link into the four
  quadrants without being demoted.
- Generated reference (data shapes from `types.d.ts`) prevents drift.

## Alternatives Considered

- **Status quo:** rejected — see Context.
- **Pure Diátaxis (drop audience folders):** rejected — couple/planner/vendor
  framing is genuinely useful for non-technical readers.
- **Wiki-style flat docs/:** rejected — no map, no entry point.
