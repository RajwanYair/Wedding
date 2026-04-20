# Wedding Manager — Roadmap

> Strategic product direction for Wedding Manager.
> Architecture details: `ARCHITECTURE.md` · Release history: `CHANGELOG.md` · Contributor guide: `CONTRIBUTING.md`

---

## Competitive Landscape

Best-in-class wedding management platforms and what we can learn from each.

| Capability | **Zola** | **The Knot** | **WeddingWire** | **Joy** | **Ours** (Wedding Manager) |
| --- | --- | --- | --- | --- | --- |
| **Guest list + RSVP** | Full CRM, address collection, meal tracking, group RSVP | Guest list with import, email RSVP | Guest list, RSVP via website | Guest list, RSVP, plus-ones | Phone-first RSVP, WhatsApp integration, CSV import/export, meal + accessibility tracking |
| **Seating chart** | Interactive drag-and-drop floor plan, round + rect + custom shapes | Basic table assignment | Table assignment via vendor | Drag-and-drop floor plan | Drag-and-drop, round + rect shapes, capacity enforcement |
| **Budget tracker** | Category breakdown, vendor cost tracking, payment timeline | Budget calculator with averages | Budget tools with local cost data | Simple budget tracker | Budget + vendor costs + expense tracking, category breakdown, payment rate |
| **Vendor management** | Marketplace + messaging + booking + payments | Vendor directory + reviews + messaging | Vendor directory + RFP + reviews | Vendor list only | Full CRUD, category filters, payment tracking, WhatsApp contact |
| **Wedding website** | Free custom site, 100+ designs, custom domain, password protection | Free website, themes, RSVP integration | Free website with RSVP | Free website, modern themes | Self-hosted GitHub Pages, 5 themes, RTL support, PWA installable |
| **Check-in (event day)** | No | No | No | No | **Real-time check-in with stats, QR potential** |
| **WhatsApp integration** | No (US-centric: email/SMS) | No | No | No | **Native wa.me deep links, bulk send, template engine** |
| **Offline capability** | No (cloud-only) | No | No | No | **Full offline with SW cache + sync queue** |
| **Multi-language** | English only | English + Spanish | English + Spanish + Portuguese | English only | **Hebrew + English + Arabic + Russian (4 locales, ICU plurals)** |
| **RTL support** | No | No | No | No | **Native RTL-first design** |
| **Privacy / self-hosted** | Vendor lock-in, US data centers | Vendor lock-in | Vendor lock-in | Vendor lock-in | **Self-hosted, open-source, data stays with user** |
| **Multi-event** | One wedding per account | One per account | One per account | One per account | **Multi-event namespacing (multiple weddings)** |
| **Tech stack** | React + Node + PostgreSQL | React + Java | React + .NET | React + GraphQL | **Vanilla JS (ES2025) + Vite + Supabase** |
| **Mobile app** | iOS + Android native | iOS + Android native | iOS + Android native | iOS + Android native | PWA only (installable, no app store) |
| **AI features** | AI venue matching, AI invitations | ChatGPT integration for planning | AI vendor recommendations | AI wedding website builder | None yet |
| **Analytics** | Basic guest stats | Basic dashboard | Basic stats | Minimal | **Full analytics: funnel, guest stats, budget, check-in rates** |
| **Registry** | Built-in marketplace + cash funds | Built-in registry | Built-in registry | Built-in registry | Registry links section (redirect-based) |

### Key Takeaways to Harvest

1. **AI integration** — Zola/Joy use AI for content generation and vendor matching; we should add AI-assisted seating and message drafting.
2. **Native mobile** — All competitors have native apps; our PWA must match native UX quality (smooth animations, haptic feedback, share sheet).
3. **Smart seating** — Zola's drag-and-drop with conflict detection is the gold standard; we should add relationship constraints and auto-suggest.
4. **Payment processing** — Zola handles vendor payments in-app; we should integrate payment tracking with receipts.
5. **Guest communication** — Our WhatsApp integration is a unique advantage competitors lack; double down on it.
6. **Data ownership** — Our self-hosted model is a privacy differentiator; market it.
7. **Multi-language** — No competitor supports RTL or 4+ languages; this is a moat.
8. **Realtime collaboration** — Zola supports couple co-editing; we need Supabase realtime for this.

---

## Current State (v9.6.0)

| Dimension | Status | Assessment |
| --- | --- | --- |
| **Frontend** | Vanilla JS ES2025 + Vite 8 + CSS `@layer` + nesting | Production-grade; Proxy reactivity is best-in-class for zero-deps |
| **Backend** | Google Sheets (active) + Supabase (wired, not primary) | Split brain; needs convergence to single authoritative backend |
| **Auth** | Google + Facebook + Apple OAuth + email allowlist + anonymous | Interface clean; token storage unencrypted in localStorage |
| **State** | Proxy-based store + localStorage + debounced persistence | Excellent batching; no offline write queue persistence |
| **i18n** | 4 locales, ICU plurals, Intl APIs, lazy loading | World-class for zero-deps; missing compile-time key validation |
| **Router** | Hash-based + View Transitions + swipe + keyboard shortcuts | `pushState` + `popstate` — browser back/forward works |
| **Testing** | 3720+ Vitest unit tests + Playwright E2E + a11y | Strong coverage; needs integration tests for backend paths |
| **PWA** | Service Worker + manifest + offline fallback + install prompt | Good foundation; sync queue not persistent across crashes |
| **CI/CD** | 7 GitHub Actions workflows, Node 22+24 matrix, CodeQL | Solid; needs dependency review and Lighthouse gates |
| **Docs** | 12 ADRs, ops runbooks, integration guides, Mermaid diagrams | Excellent culture; version spread across 9+ files is fragile |
| **Bundle** | ~45 KB gzipped (estimate), manual chunk splitting | Lean; dead exports removed in v8.3.0 |
| **Security** | CSP headers, SRI, no eval/innerHTML, credential scanning | Good posture; tokens in plaintext localStorage is a gap |

### Honest Decision Audit

| Past Decision | Verdict | Action |
| --- | --- | --- |
| **Zero runtime deps** | Keep (with exceptions) — DOMPurify + Valibot + Supabase SDK justified | Formalize: "minimal runtime deps" not "zero" |
| **Vanilla JS over framework** | **Reconsider** — 18 sections with manual lifecycle is at the complexity ceiling | Evaluate Preact (3 KB) or Lit (5 KB) for component model; keep vanilla if LOC stays manageable |
| **Google Sheets as backend** | **Deprecate** — Apps Script has rate limits, no auth, no realtime | Finalize Supabase as primary; Sheets becomes import/export only |
| **localStorage as primary storage** | **Upgrade** — 5 MB quota, no encryption, sync issues | Move to IndexedDB (via idb-keyval or raw API) with encryption for tokens |
| **Hash-based router** | **Fix** — `replaceState` breaks back button; no query params | Switch to `pushState` + `popstate`; add query param support |
| **Manual chunk splitting** | **Simplify** — brittle path-based chunks | Use Vite's automatic code splitting with dynamic `import()` |
| **CSS in 7 separate files** | Keep — `@layer` ordering is clean and maintainable | Add CSS Modules or `@scope` for section-level isolation |
| **Proxy reactivity for arrays only** | **Extend** — object mutations require `storeSet()` | Add deep Proxy or use Valtio-style proxy for nested objects |
| **Multi-event namespacing** | Keep — unique feature, well-implemented | Ensure Supabase schema supports multi-event with RLS |
| **WhatsApp via wa.me** | Keep and enhance — unique competitive advantage | Add WhatsApp Business API for bulk messaging |
| **4 locale support** | Keep and expand — RTL is a moat | Add locale contribution guide; consider community translations |
| **Version spread across 9+ files** | **Fix** — fragile, error-prone version bumps | Single source of truth in `package.json`; `sync-version.mjs` propagates everywhere |
| **Event delegation via data-action** | Keep — clean, performant, scales to ~50 actions | Add action namespacing for 50+ actions |
| **Template loading via import.meta.glob** | Keep — best practice for lazy HTML injection | Add timeout + retry for slow networks |

---

## Phase 1 — Foundation Hardening (v8.3.x)

Core infrastructure fixes that unblock everything else. No new features.

### 1.1 Backend Convergence: Supabase as Primary

| Item | Detail |
| --- | --- |
| **Goal** | Single authoritative backend; Sheets becomes import/export only |
| **Database** | PostgreSQL via Supabase with typed schema matching `src/types.d.ts` |
| **Auth** | Supabase Auth replaces custom OAuth; keeps email allowlist as admin gate |
| **Realtime** | Supabase Realtime for couple co-editing (guests, tables, settings) |
| **RLS** | Row-Level Security per event; multi-event isolation via `event_id` column |
| **Edge Functions** | WhatsApp Business API proxy, RSVP webhook, analytics aggregation |
| **Migration** | `supabase/migrations/` with sequential numbered SQL files |
| **Fallback** | Offline mode degrades to IndexedDB; sync resumes on reconnect |
| **Sheets role** | Import guests from Sheets; export reports to Sheets; no live sync |

Schema design:

```text
events       (id, owner_id, name, date, venue, settings JSONB, created_at)
guests       (id, event_id FK, first_name, last_name, phone, status, table_id FK, meal, ...)
tables       (id, event_id FK, name, capacity, shape, position_x, position_y)
vendors      (id, event_id FK, category, name, price, paid, ...)
expenses     (id, event_id FK, category, description, amount, date)
rsvp_log     (id, event_id FK, phone, name, status, count, timestamp)
invitations  (id, event_id FK, guest_id FK, channel, sent_at, opened_at, responded_at)
```

### 1.2 Router Fix: pushState + Back Button

- Replace `replaceState` with `pushState` for section navigation.
- Handle `popstate` event for browser back/forward.
- Add optional query param support (`?guest=123`) for deep links.
- Keep hash fallback for older browsers.

### 1.3 Storage Upgrade: IndexedDB + Encryption

- Primary storage: IndexedDB via lightweight wrapper (idb-keyval or raw API).
- Encrypt sensitive data (auth tokens, PII) with Web Crypto API.
- localStorage kept only for small config (theme, locale, active event ID).
- Quota detection with graceful fallback and user notification.
- Persistent offline write queue (survives app crash/reload).

### 1.4 Security Hardening

- Encrypt auth tokens in storage (AES-GCM via Web Crypto).
- Implement session timeout enforcement (2-hour rotation constant already exists).
- Add CSRF protection for Supabase mutations.
- Audit and remove any remaining plaintext credentials.
- Add `Permissions-Policy` header alongside existing CSP.

### 1.5 Dead Code Cleanup

- Address 246 dead exports (19% of 1330 total) identified by `audit:dead`.
- Remove orphaned templates, unused section modules, and stale handlers.
- Target: less than 5% dead exports.

---

## Phase 2 — Developer Experience and Tooling (v8.4.x)

### 2.1 Shared Tooling Consolidation (MyScripts-Level)

Centralize common tool configs at `MyScripts/tooling/` root.

| Layer | Current | Target |
| --- | --- | --- |
| `node_modules/` | Shared at `MyScripts/` | No change |
| ESLint/Stylelint/HTMLHint/tsconfig/Vitest | Partial shared + inline fallbacks | 100% imported from `tooling/`; zero duplicated rules |
| CI shim | `ensure-shared-tooling.mjs` | Regenerates all bases, not a subset |
| Per-project configs | Overrides + fallback duplication | Thin overrides only (globals, globs, plugins) |

Steps: Audit configs > promote shared rules > thin project configs > remove inline fallbacks > validate CI > add cross-project smoke test > document convention.

### 2.2 TypeScript and Build Alignment

| Setting | Current | Target |
| --- | --- | --- |
| `target` | ES2022 | ES2025 |
| `module` | ES2022 | ESNext |
| `lib` | ES2023 | ES2025 |
| `extends` | none | `../tooling/tsconfig/base.json` |

- Add `@ts-check` to all remaining `.js` files.
- Strengthen JSDoc coverage on core and service modules.
- Consider `.ts` migration for `src/core/` (keep sections as `.js`).

### 2.3 GitHub Copilot Customization Overhaul

| Asset | Current | Target |
| --- | --- | --- |
| Instructions | 3 files | 7 files (add JS, tests, CSS, Supabase scoped instructions) |
| Agents | 4 with limited tools | 4 with expanded tools, `applyTo`, testing expectations |
| Prompts | 2 | 8 (add version-bump, i18n-add, debug, refactor, security-audit, pre-release) |
| Skills | 0 | 5 reusable skill modules (RTL-i18n, store, auth, testing, theming) |
| MCP servers | 4 | 5+ (add gitkraken) |
| Root `AGENTS.md` | Missing | Add for cloud agent / Copilot Workspace support |

### 2.4 Configuration and Docs Standards

- **VS Code:** Add `launch.json` (Vite + Chrome debug), update extensions, add file nesting rules.
- **GitHub:** Convert issue templates to YAML forms; fix stale PR template; expand labeler; add Dependabot groups.
- **SVG diagrams:** Organize in `docs/diagrams/`; add Mermaid-to-SVG export script; CI freshness check.
- **Package metadata:** Add `repository`, `homepage`, `bugs`, `engines.npm`.
- **README:** Complete badge row (CI, deploy, license, Node, version, tests, bundle size).
- **Version management:** Single source in `package.json`; `sync-version.mjs` propagates to all 9+ files automatically.

### 2.5 Test Infrastructure

| Area | Current | Target |
| --- | --- | --- |
| Unit tests | 3957+ (Vitest) | Maintain + add coverage for new backend paths |
| Integration tests | Minimal | Add Supabase integration tests with test containers |
| E2E tests | Playwright smoke + visual regression | Add RSVP flow, check-in flow, multi-event flow |
| Coverage | Reported but no gate | Gate at 80% line coverage in CI |
| Performance tests | `tests/perf/` exists | Add Lighthouse CI checks on deploy |

---

## Phase 3 — Product Excellence (v9.0.x)

### 3.1 UX Overhaul

#### Component Model Evaluation

| Option | Size | Pros | Cons |
| --- | --- | --- | --- |
| **Keep vanilla** | 0 KB | No new deps; full control | Manual lifecycle at 18+ sections is error-prone |
| **Preact** | 3 KB | React-compatible; signals; tiny | New dependency; learning curve |
| **Lit** | 5 KB | Web Components standard; shadow DOM | Shadow DOM complicates global themes |
| **Stencil** | 12 KB | Generates standards-based components | Heavier; compiler-based |

Decision: Evaluate Preact Signals for reactive primitives without full framework migration. Keep vanilla HTML templates. Add component model only if section count exceeds 25.

#### Navigation and Transitions

- Fix back button (Phase 1.2).
- Upgrade View Transitions API to cross-document transitions (Chrome 126+).
- Add page transition animations per section type.
- Add breadcrumb trail for deep navigation.

#### Accessibility

- Add skip-to-content link.
- Audit with axe-core in CI (already have `@axe-core/playwright`).
- Add `prefers-reduced-motion` checks for all animations.
- Add high-contrast theme variant.
- Ensure all interactive elements have visible focus indicators.

#### Responsive and Mobile

- Add container queries (`@container`) for component-level responsiveness.
- Add `320px` breakpoint for small phones.
- Improve touch targets (minimum 44x44px per WCAG).
- Add pull-to-refresh with visual feedback.

### 3.2 Smart Features

#### AI-Assisted Seating

- Input: guest relationships (family, friends, work), conflicts, preferences.
- Algorithm: constraint-satisfaction solver (CSP) or simulated annealing.
- Output: suggested seating arrangement with conflict highlights.
- User can accept, reject, or manually adjust.

#### AI Message Drafting

- Use LLM API (OpenAI / Anthropic) to generate WhatsApp invitation messages.
- Inputs: wedding details, guest name, tone preference (formal/casual/playful).
- Hebrew + English output with RTL-aware formatting.
- User approves before send.

#### RSVP Link Tracking

- Generate unique per-guest RSVP links with token.
- Track funnel: invited > link sent > link clicked > form started > confirmed > checked in.
- Visualize conversion funnel in analytics dashboard.

#### QR Code Check-in

- Generate per-guest QR codes (client-side, no external API).
- Scan with device camera at venue entrance.
- Real-time check-in stats dashboard for event day.

### 3.3 WhatsApp Business API Integration

- Move from `wa.me` deep links to WhatsApp Business API.
- Enable bulk messaging without manual per-guest tab opening.
- Add message delivery status tracking (sent, delivered, read).
- Add template message approval workflow (Meta requirement).
- Keep `wa.me` fallback for users without Business API access.

### 3.4 Realtime Collaboration

- Supabase Realtime channels for live updates.
- Presence indicators (who's editing what).
- Conflict resolution for concurrent edits (last-write-wins with merge UI).
- Optimistic updates with rollback on conflict.
- Live RSVP notifications (toast when guest confirms).

### 3.5 Advanced Analytics

- Guest conversion funnel visualization.
- Budget burn-down chart over time.
- Vendor payment timeline.
- Dietary breakdown for catering planning.
- Table utilization heatmap.
- Export to PDF (print-optimized layout).

---

## Phase 4 — Platform and Scale (v10.x)

### 4.1 Multi-Tenant Architecture

- Supabase organization-level access for wedding planners managing multiple events.
- Role-based access: owner, co-planner, vendor, guest.
- Shared vendor database across events.
- Template events (clone settings from previous wedding).

### 4.2 Native-Quality PWA

- Web Push notifications for RSVP confirmations and vendor messages.
- Background Sync API for offline mutations.
- File Handling API for CSV/Excel import.
- Share Target API for receiving shared content.
- Badging API for unread notification count.
- Maintain Lighthouse score above 95 across all categories.

### 4.3 Internationalization Expansion

- Add locale contribution guide with validation tooling.
- Community-contributed translations via JSON PR workflow.
- RTL auto-detection from browser locale.
- Currency formatting per locale (ILS, USD, EUR).
- Date format per locale (DD/MM vs. MM/DD).

### 4.4 API and Integrations

| Integration | Type | Purpose |
| --- | --- | --- |
| **WhatsApp Business API** | REST | Bulk messaging, delivery tracking |
| **Google Calendar** | OAuth + REST | Sync timeline events to couple's calendar |
| **Waze / Google Maps** | Embed + Deep link | Venue navigation for guests |
| **Spotify** | oEmbed | Playlist embedding in wedding website |
| **Payment gateways** | Webhook | Vendor payment tracking (Stripe/PayPal) |
| **Photo services** | OAuth | Gallery integration (Google Photos / iCloud) |

### 4.5 Infrastructure Hardening

- Supabase self-hosted option for maximum privacy.
- CDN for static assets (Cloudflare or Vercel Edge).
- Database backups with point-in-time recovery.
- Monitoring: error tracking (Sentry free tier), uptime (UptimeRobot).
- Rate limiting on Edge Functions.

---

## Working Principles

1. **Ship working software** — production code beats aspirational code.
2. **One canonical source** per concern — constants, defaults, config, version, docs.
3. **Security and data integrity** outrank convenience.
4. **Offline and mobile** are first-class, not edge cases.
5. **Dead code is debt** — remove it quickly.
6. **Minimal dependencies** — justify every `npm install` with a size/security/maintenance argument.
7. **Test what matters** — backend paths, auth flows, data integrity, and offline sync.
8. **Accessibility is not optional** — WCAG 2.1 AA minimum.

---

## Release Line

| Version | Focus | Status |
| --- | --- | --- |
| **v8.2.x** | Security hardening, dead code cleanup, storage centralization | **Done** |
| **v8.3.x** | Foundation hardening: router fix, dead exports, DX tooling, Copilot instructions | **Done** |
| **v9.0.x** | Production readiness: test consolidation, config modernization, repo cleanup, release prep | **Active** |
| **v10.x** | Multi-tenant, native-quality PWA, API integrations, infra hardening | Future |

---

## Success Metrics

| Metric | Current | Target (v9.0) | Target (v10.x) |
| --- | --- | --- | --- |
| **Lighthouse Performance** | ~85 (est.) | above 95 | above 95 |
| **Lighthouse Accessibility** | ~90 (est.) | above 95 | 100 |
| **Bundle size (gzip)** | ~45 KB (est.) | below 50 KB | below 60 KB (with AI features) |
| **Test coverage (lines)** | ~70% (est.) | above 80% | above 85% |
| **Dead exports** | 19% (246/1330) | below 5% | below 3% |
| **Time to interactive** | ~1.5s (est.) | below 1s | below 1s |
| **Offline RSVP** | Partial (no persistent queue) | Full (IndexedDB queue) | Full + Background Sync |
| **Concurrent users** | 1 (localStorage) | 2+ (Supabase Realtime) | 10+ (multi-tenant) |
| **Supported locales** | 4 (he, en, ar, ru) | 4+ (community contrib) | 6+ |
| **RSVP conversion tracking** | None | Full 6-stage funnel | + A/B testing |

---

## Technology Decisions Register

Decisions that are **open for reconsideration** at each phase boundary.

| Decision | Current Choice | Alternatives to Evaluate | Review At |
| --- | --- | --- | --- |
| Frontend framework | Vanilla JS | Preact, Lit, Solid | v9.0 (if sections above 25) |
| State management | Custom Proxy store | Preact Signals, Valtio, nanostores | v9.0 |
| CSS approach | Global `@layer` files | CSS Modules, `@scope`, Tailwind | v9.0 |
| Backend | Supabase (PostgreSQL) | PocketBase, Turso (libSQL), Firebase | v8.3 (finalize) |
| Hosting | GitHub Pages (static) | Vercel, Cloudflare Pages, Netlify | v9.0 (if SSR needed) |
| Mobile strategy | PWA only | Capacitor wrapper, React Native | v10.x (if app store needed) |
| AI provider | None | OpenAI, Anthropic, local LLM | v9.0 |
| WhatsApp | wa.me deep links | WhatsApp Business API, Twilio | v9.0 |
| Monitoring | None | Sentry, LogRocket, UptimeRobot | v8.4 |
| Search | Client-side filter | Supabase full-text search, Meilisearch | v10.x |
