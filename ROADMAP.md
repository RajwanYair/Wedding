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
| S7 — Docs + Polish | Instruction files, README consolidation, ARCHITECTURE.md mermaid diagrams | v3.8.0 | ✅ Done |
| S8 — Analytics | Heatmap, funnel, vendor timeline, PDF/CSV export, delivery rate | v3.9.0 | ✅ Done |
| S9 — Multi-Event | Event namespace, switcher UI, per-event Sheets, import/export | v4.0.0 | ✅ Done |
| S10 — Real-time | Polling live sync, conflict resolution, presence indicator | v4.0.0 | ✅ Done |
| S11 — Quick Wins | Per-guest RSVP links, transport manifest, meal-per-table, batch ops, gift recording | v4.1.0 | ✅ Done |
| S12 — UX Upgrades | WhatsApp reminders, duplicate detection, QR check-in, drag-drop seating, RSVP deadline | v4.1.0 | ✅ Done |

### Current State (v8.0.3)

```text
index.html     ~425 lines (shell only — sections lazy-loaded)
src/           18 section modules · 9 core modules · 2 services · 5 utils
               15 template HTML files · 6 modal HTML files
Tests          Current repo sanity + unit/integration/e2e suite passing · 0 Node warnings
Lint           0 errors · 0 warnings (ESLint + Stylelint + HTMLHint + markdownlint)
Bundle         < 30 KB gzip main · < 15 KB gzip RSVP-only chunk
CI             6 jobs: lint+test (Node 22+24) · security · Lighthouse · size · E2E
Auth           Google/Facebook/Apple OAuth + email allowlist + anonymous guest
```

---

## Active Focus

This roadmap now keeps release-line history and guardrails only.

- Use CHANGELOG.md for shipped work and repo cleanup history.
- Use GitHub issues and pull requests for current implementation backlog.

---

## Version Plan

| Version | Sprint | Status |
| --- | --- | --- |
| v3.0.0–v3.8.0 | S0–S7 | ✅ Released |
| v3.9.0 | S8 | ✅ Released |
| v4.0.0 | S9 + S10 | ✅ Released |
| v4.1.0 | S11 + S12 | ✅ Released |
| v8.0.0 | production cleanup baseline | ✅ Released |
| v8.0.1 | canonical store cleanup follow-up | ✅ Released |
| v8.0.2 | runtime store and multi-event persistence cleanup | ✅ Released |
| v8.0.3 | direct storage key cleanup follow-up | ✅ Current |

---

## Success Metrics

| Metric | Current Target |
| --- | --- |
| Initial bundle (gzip) | < 30 KB |
| RSVP-only bundle | < 15 KB |
| Lighthouse Performance | ≥ 0.95 |
| Lighthouse Accessibility | ≥ 0.95 |
| `window.*` cross-module usage | 0 |
| Node warnings in `npm test` | 0 |

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
