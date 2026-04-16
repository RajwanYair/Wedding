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
| S8 — Analytics | Heatmap, funnel, vendor timeline, PDF/CSV export, delivery rate | v3.9.0 | ✅ Done |
| S9 — Multi-Event | Event namespace, switcher UI, per-event Sheets, import/export | v4.0.0 | ✅ Done |
| S10 — Real-time | Polling live sync, conflict resolution, presence indicator | v4.0.0 | ✅ Done |
| S11 — Quick Wins | Per-guest RSVP links, transport manifest, meal-per-table, batch ops, gift recording | v4.1.0 | ✅ Done |
| S12 — UX Upgrades | WhatsApp reminders, duplicate detection, QR check-in, drag-drop seating, RSVP deadline | v4.1.0 | ✅ Done |
| S13 — Guest Experience | Live countdown, plus-one names, thank-you messages, seating map, guest notes | v4.2.0 | ✅ Done |
| S14 — Admin Productivity | Multi-filter, budget widget, vendor due dates, event export, guest tags | v4.2.0 | ✅ Done |
| S15 — UX & Smart Features | Undo stack, shortcuts, auto-backup, activity feed, search highlight | v4.3.0 | ✅ Done |
| S16 — Day-Of & Advanced | Check-in sound, smart table assign, payment schedule, RSVP timeline, dietary cards | v4.3.0 | ✅ Done |
| S17 — Data Quality & Smart Insights | Full-text search, bulk meal, expense donut, table capacity colors, budget alert | v4.4.0 | ✅ Done |
| S18 — Sync, Forecast & Operations | Queue monitor, arrival forecast, batch checkin, timeline alarm, WhatsApp unsent filter | v4.4.0 | ✅ Done |
| S19 — Vendor Management & Guest Intelligence | Vendor quick-dial, VIP flag, vendor category card, follow-up list, bulk mark unsent | v4.5.0 | ✅ Done |
| S20 — Print, Reports & UX Polish | Guest badges print, timeline print, expense cat filter, invite stats card, accessibility filter | v4.5.0 | ✅ Done |

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

### S13 — Guest Experience & Communication

Enhanced guest-facing features and communication tools.

| # | Task | Size |
| --- | --- | --- |
| 13.1 | Live countdown timer (d:h:m:s, 1-second interval) | S |
| 13.2 | Plus-one names in RSVP (dynamic fields when count > 1) | M |
| 13.3 | Thank-you WhatsApp messages (post-wedding for checked-in guests) | M |
| 13.4 | Seating chart SVG map (floor plan with table shapes + guests) | L |
| 13.5 | Guest notes timeline (timestamped admin notes per guest) | M |

**Exit**: All 5 features functional. i18n complete. CI green.

### S14 — Admin Productivity

Power-user tools for efficient wedding management.

| # | Task | Size |
| --- | --- | --- |
| 14.1 | Multi-criteria guest filter (status + side + group + meal + table) | M |
| 14.2 | Budget summary widget on dashboard (target, committed, paid, remaining) | M |
| 14.3 | Vendor due dates + overdue indicators (date field + red highlight) | S |
| 14.4 | Export event summary (comprehensive text file with all stats) | M |
| 14.5 | Guest custom tags/labels (add/remove/display badges) | M |

**Exit**: All 5 features functional. i18n complete. CI green.

### S15 — UX & Smart Features

Polish and smart automation for a refined user experience.

| # | Task | Size |
| --- | --- | --- |
| 15.1 | Undo stack — Ctrl+Z for guest/table/vendor deletes | M |
| 15.2 | Keyboard shortcuts help overlay (? key opens modal) | S |
| 15.3 | Auto-backup scheduler (periodic JSON snapshots + download/restore) | M |
| 15.4 | Dashboard activity feed (recent changes log with timestamps) | M |
| 15.5 | Guest search highlight (mark matched text in search results) | S |

**Exit**: All 5 features functional. i18n complete. CI green.

### S16 — Day-Of & Advanced

Day-of operations tools and advanced analytics.

| # | Task | Size |
| --- | --- | --- |
| 16.1 | Check-in sound + visual flash alerts (Web Audio API beep) | S |
| 16.2 | Smart table optimizer (balance by side, group, dietary) | M |
| 16.3 | Vendor payment schedule view (timeline of upcoming/overdue) | M |
| 16.4 | RSVP response timeline (SVG chart of responses over time) | M |
| 16.5 | Printable dietary cards (per-table dietary requirement cards) | M |

**Exit**: All 5 features functional. i18n complete. CI green.

### S17 — Data Quality & Smart Insights (v4.4.0)

Richer search, batch operations, and visual analytics improvements.

| # | Task | Size |
| --- | --- | --- |
| 17.1 | Full-text guest search — extend to email, notes, group, meal, tags | S |
| 17.2 | Bulk meal assignment — batch toolbar selector for meal type | S |
| 17.3 | Expense category donut chart — visual breakdown in Analytics | M |
| 17.4 | Table capacity color indicators — green/yellow/red + overbooking banner | M |
| 17.5 | Budget overshoot alert — dashboard warning when committed > target | S |

**Exit**: All 5 features functional. i18n complete. CI green.

### S18 — Sync, Forecast & Operations (v4.4.0)

Operational intelligence and day-of efficiency improvements.

| # | Task | Size |
| --- | --- | --- |
| 18.1 | Offline sync queue monitor — badge + list of pending store keys | M |
| 18.2 | Guest arrival forecast — projected headcount using maybe/pending weights | M |
| 18.3 | Batch check-in by table — one tap to arrive all guests at a table | S |
| 18.4 | Timeline event alarm — browser notification / in-app banner for upcoming events | M |
| 18.5 | WhatsApp unsent filter shortcut — one-click unsent filter with count badge | S |

**Exit**: All 5 features functional. i18n complete. CI green.

### S19 — Vendor Management & Guest Intelligence (v4.5.0)

Vendor quick-contact and guest VIP/follow-up tools.

| # | Task | Size |
| --- | --- | --- |
| 19.1 | Vendor quick-dial — tel: + wa.me buttons in vendor action cell | S |
| 19.2 | Guest VIP/star flag — toggle ⭐ per guest, filter VIP-only | S |
| 19.3 | Vendor category dashboard card — cost/paid/overdue per category | M |
| 19.4 | Follow-up pending list — sent guests still showing `pending` status | M |
| 19.5 | Bulk mark as unsent — reset `sent=false` for selected guests | S |

**Exit**: All 5 features functional. i18n complete. CI green.

### S20 — Print, Reports & UX Polish (v4.5.0)

Printing workflows, UX refinements, and invitation analytics.

| # | Task | Size |
| --- | --- | --- |
| 20.1 | Guest name badges print — 3-up badge grid for confirmed guests | M |
| 20.2 | Timeline schedule print — full schedule in print window | S |
| 20.3 | Expense category filter — click category chip to filter expense rows | S |
| 20.4 | Invitation stats dashboard card — sent/unsent/RSVP rate summary | S |
| 20.5 | Accessibility check-in filter — ♿ button to show accessibility-needed guests | S |

**Exit**: All 5 features functional. i18n complete. CI green.

| Version | Sprint | Status |
| --- | --- | --- |
| v3.0.0–v3.8.0 | S0–S7 | ✅ Released |
| v3.9.0 | S8 | ✅ Released |
| v4.0.0 | S9 + S10 | ✅ Released |
| v4.1.0 | S11 + S12 | ✅ Released |
| v4.2.0 | S13 + S14 | ✅ Released |
| v4.3.0 | S15 + S16 | ✅ Released |
| v4.4.0 | S17 + S18 | ✅ Released |
| v4.5.0 | S19 + S20 | ✅ Released |

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
