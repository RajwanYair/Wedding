# Wedding Manager — Roadmap

> Component-based SPA · Hebrew RTL · Vite 8 · Google Sheets sync · Zero Runtime Deps

## Constraints (Non-Negotiable)

| Constraint | Detail |
| --- | --- |
| Deploy target | GitHub Pages — `https://rajwanyair.github.io/Wedding` |
| Backend | Google Sheets via Apps Script Web App |
| Runtime deps | **Zero** — all third-party is devDeps only |
| Language | Hebrew RTL primary, English lazy-loaded |
| Build | Vite 8 — single `dist/` output |
| Auth | Email allowlist + Google / Facebook / Apple OAuth |
| Cost | $0 infrastructure — GitHub Pages + Google Sheets + Apps Script |

---

## Completed Sprints

| Sprint | Milestone | Version | Status |
| --- | --- | --- | --- |
| S0 — Kill `window.*` | Proper ES modules, `import`/`export`, `^_` varsIgnorePattern | v3.0.0-alpha.1 | ✅ Done |
| S1 — Split HTML | index.html → shell + 15 lazy templates + 6 modals | v3.0.0-alpha.2 | ✅ Done |
| S2 — Modern UI | View Transitions, skeleton screens, swipe nav, glassmorphism 2.0 | v3.0.0-beta.1 | ✅ Done |
| S3 — Backend | Exp. backoff, write queue, conflict resolution, RSVP_Log sync | v3.0.0-beta.2 | ✅ Done |
| S4 — Security | Session rotation, sanitize(), SRI, Workbox SW, Lighthouse ≥ 0.90 | v3.0.0-rc.1 | ✅ Done |
| S5 — GitHub DevOps | Issue/PR templates, Dependabot, branch protection, auto-release | v3.0.0-rc.1 | ✅ Done |
| S6 — Quality | Coverage-v8, 1407+ tests (106+ suites), coverage gate 80%/70% | v3.0.0-rc.2 | ✅ Done |
| S7 — Docs + Polish | Instruction files, GUIDE.md v3.8.0, ARCHITECTURE.md mermaid diagrams | v3.8.0 | ✅ Done |

### Current State (v3.8.0)

```text
index.html     ~425 lines (shell only — sections lazy-loaded)
src/           18 section modules · 9 core modules · 2 services · 5 utils
               15 template HTML files · 6 modal HTML files
Tests          1407+ passing (106+ suites) · 0 Node warnings
Lint           0 errors · 0 warnings (ESLint + Stylelint + HTMLHint + markdownlint)
Bundle         < 30 KB gzip main · < 15 KB gzip RSVP-only chunk
CI             6 jobs: lint+test (Node 22+24) · security · Lighthouse · size · E2E
Auth           Google/Facebook/Apple OAuth + email allowlist + anonymous guest
```

---

## Active and Upcoming

### S8 — Analytics and Reporting

Richer dashboards with exportable reports.

| # | Task | Size |
| --- | --- | --- |
| 8.1 | Guest origin heatmap (groom/bride side by table) | M |
| 8.2 | RSVP funnel report (invited → confirmed → checked-in) | M |
| 8.3 | Vendor payment timeline chart | M |
| 8.4 | Export PDF report (print CSS optimized) | L |
| 8.5 | WhatsApp delivery rate tracking | S |

**Exit**: Analytics charts exportable as SVG/PDF. CI green.

### S9 — Multi-Event Support

Support managing multiple weddings from one app instance.

| # | Task | Size |
| --- | --- | --- |
| 9.1 | Event namespace in localStorage (`wedding_v1_{eventId}_*`) | L |
| 9.2 | Event switcher UI (top-bar selector) | M |
| 9.3 | Per-event Google Sheet binding | M |
| 9.4 | Import/export zip per event | M |

**Exit**: 2+ events can coexist. All data isolated by eventId. CI green.

### S10 — Real-time Collaboration

Live updates between multiple admin devices.

| # | Task | Size |
| --- | --- | --- |
| 10.1 | Polling-based live sync (30 s interval, configurable) | M |
| 10.2 | Conflict resolution UI (diff view + accept/reject) | L |
| 10.3 | Presence indicator (who is editing) | M |
| 10.4 | WebSocket upgrade path via Apps Script | XL |

**Exit**: Two admins can edit simultaneously without data loss. CI green.

---

## Version Plan

| Version | Sprint | Status |
| --- | --- | --- |
| v3.0.0–v3.8.0 | S0–S7 | ✅ Released |
| v3.9.0 | S8 | Planned |
| v4.0.0 | S9 | Planned |
| v4.1.0 | S10 | Planned |

---

## Success Metrics

| Metric | v2 baseline | v3.8.0 actual | Target |
| --- | --- | --- | --- |
| `index.html` lines | 1 774 | ~425 | < 250 |
| Initial bundle (gzip) | ~45 KB | < 30 KB | < 30 KB ✅ |
| RSVP-only bundle | ~45 KB | < 15 KB | < 15 KB ✅ |
| Lighthouse Performance | 0.85 | ≥ 0.90 | ≥ 0.95 |
| Lighthouse Accessibility | 0.90 | ≥ 0.95 | ≥ 0.95 ✅ |
| Test count | 689 | 1 407+ | ≥ 1 400 ✅ |
| Coverage (lines) | ~60% | ≥ 80% | ≥ 80% ✅ |
| `window.*` cross-module | ~200 | 0 | 0 ✅ |
| ESLint varsIgnorePattern | 70+ prefixes | `^_` only | `^_` ✅ |
| Node warnings in `npm test` | 1 | 0 | 0 ✅ |

---

## Google Sheets Schema

| Tab | Columns | Direction |
| --- | --- | --- |
| Guests | Id · FirstName · LastName · Phone · Email · Count · Children · Status · Side · Group · Meal · TableId · Notes · … | Read + Write |
| Tables | Id · Name · Capacity · Shape | Read + Write |
| Config | Key · Value (wedding details) | Read + Write |
| Vendors | Id · Category · Name · Contact · Phone · Price · Paid · Notes | Write |
| Expenses | Id · Category · Amount · Description · Date | Write |
| RSVP_Log | Timestamp · Phone · Name · Status · Count | Append-only |

---

## Key Principles

1. **Explicit over implicit** — `import { fn }` not `window.fn()`
2. **Lazy by default** — admin sections load on first visit only
3. **Section lifecycle** — `mount()`/`unmount()` for clean resource management
4. **Single source of truth** — reactive store drives all UI via subscriptions
5. **Progressive enhancement** — View Transitions, swipe gestures degrade gracefully
6. **Security at every layer** — CSP + sanitization + server validation + rate limiting
7. **Zero runtime deps** — vanilla JS/CSS, build tools as devDeps only
8. **i18n everywhere** — `t('key')` for JS, `data-i18n` for HTML
9. **Mobile-first** — design for 360 px, enhance for desktop
10. **Offline-capable** — Service Worker + localStorage + write queue
