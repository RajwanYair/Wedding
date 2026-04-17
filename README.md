<div align="center">

# 💍 Wedding Manager

![Version](https://img.shields.io/badge/version-v6.7.0-d4a574?style=flat-square)
![CI](https://github.com/RajwanYair/Wedding/actions/workflows/ci.yml/badge.svg?style=flat-square)
![Deploy](https://github.com/RajwanYair/Wedding/actions/workflows/deploy.yml/badge.svg?style=flat-square)
![Tests](https://img.shields.io/badge/tests-2720%2B_passing-brightgreen?style=flat-square)
![Modular](https://img.shields.io/badge/Modular-50%2B_JS_%2B_7_CSS-E34F26?style=flat-square&logo=html5&logoColor=white)
![Dependencies](https://img.shields.io/badge/Runtime_Deps-Zero-6ee7b7?style=flat-square)
![Hebrew](https://img.shields.io/badge/שפה-עברית_RTL-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)

**Wedding management app — RSVP, table seating, WhatsApp invitations, push notifications, E2E tests.**
**Modular (7 CSS + 50+ JS), zero-dependency, Hebrew RTL with English support.**

</div>

---

![Architecture](architecture.svg)

## Features

![Features](features-grid.svg)

## RSVP Journey

![RSVP Flow](rsvp-flow.svg)

## Quick Start

```bash
# Clone
git clone https://github.com/RajwanYair/Wedding.git

# Install shared dependencies (from parent directory)
cd .. && npm install && cd Wedding

# Open in browser (no build step needed!)
open index.html
```

## Auth Setup (optional)

![Auth Flow](auth-flow.svg)

Edit `src/core/config.js`:

```js
const GOOGLE_CLIENT_ID  = "YOUR_ID.apps.googleusercontent.com"; // console.cloud.google.com
const FB_APP_ID         = "";   // developers.facebook.com → App ID
const APPLE_SERVICE_ID  = "";   // developer.apple.com → Service ID
```

Add SDK `<script>` tags for Facebook and Apple in `index.html` (see comments).

## Development

```bash
# Tests
npm test

# Lint — all must exit 0 (0 errors, 0 warnings)
npm run lint         # HTML + CSS + JS + Markdown
npm run lint:html    # HTMLHint    → index.html
npm run lint:css     # Stylelint   → css/*.css
npm run lint:js      # ESLint      → src/**/*.js
npm run lint:md      # markdownlint-cli2
```

## Project Structure

```text
Wedding/
├── index.html            # HTML shell
├── css/                  # 7 CSS modules
│   ├── variables.css     # Custom properties, theme colors
│   ├── base.css          # Reset, typography
│   ├── layout.css        # Grid, nav, panels
│   ├── components.css    # Buttons, forms, cards, modals
│   ├── responsive.css    # 768px + 480px breakpoints
│   ├── print.css         # Print styles
│   └── auth.css          # Auth overlay
├── src/                  # ES module source — Vite 8 entry
│   ├── main.js           # Bootstrap, event wiring, section lifecycle
│   ├── core/             # Foundation modules (~18 files)
│   │   ├── store.js      # Proxy-based reactive store V2 with batching
│   │   ├── events.js     # data-action delegation (single listener)
│   │   ├── i18n.js       # he/en/ar/ru with ICU plural
│   │   ├── nav.js        # Hash router + swipe gestures + View Transitions
│   │   ├── ui.js         # Toast, modal, theme, loading
│   │   ├── dom.js        # Cached DOM refs (el object)
│   │   ├── config.js     # Auth credentials + build config
│   │   ├── constants.js  # Section lists, modal IDs, enum values
│   │   └── action-registry.js  # All data-action constants
│   ├── handlers/         # Action handler registration (~7 files)
│   ├── sections/         # 20 section modules with mount/unmount lifecycle
│   ├── services/         # auth, sheets, supabase, backend, presence, offline-queue
│   ├── utils/            # phone, date, sanitize, misc, form-helpers, undo
│   ├── templates/        # Lazy-loaded HTML fragments (one per section)
│   ├── modals/           # Modal HTML fragments
│   ├── i18n/             # he.json, en.json, ar.json, ru.json
│   └── plugins/          # contact-plugin, gallery-plugin, registry-plugin
├── public/               # sw.js, manifest.json, icons
├── scripts/              # Build tools, SRI check, size report, push notifications
├── supabase/             # Migrations and Edge Functions
│   ├── migrations/       # 6 SQL migration files
│   └── functions/        # Edge Functions
├── tests/                # 1957+ tests: unit + integration + E2E
│   ├── unit/             # 38 Vitest suite files
│   └── e2e/              # Playwright smoke + visual regression
└── .github/              # CI/CD workflows, Copilot instructions, agents
```

## Architecture

```mermaid
graph TD
    subgraph "Entry"
        A[index.html] --> B[src/main.js]
    end
    subgraph "Core"
        B --> C[core/config.js]
        B --> D[core/store.js\nProxy reactive]
        B --> E[core/state.js\nlocalStorage]
        B --> F[core/nav.js\nhash nav]
        B --> G[core/i18n.js\nhe/en/ar/ru]
        B --> H[core/dom.js\ncached refs]
        B --> I[core/events.js\ndata-action delegation]
    end
    subgraph "Sections"
        B --> J[sections/dashboard.js]
        B --> K[sections/guests.js]
        B --> L[sections/tables.js]
        B --> M[sections/rsvp.js]
        B --> N[sections/analytics.js]
        B --> O[sections/settings.js]
        B --> P[sections/...]
    end
    subgraph "Services"
        B --> Q[services/sheets.js\nenqueueWrite + sync]
        B --> R[services/auth.js\nGoogle/FB/Apple/Email]
        B --> S[services/backend.js\nSupabase + offline queue]
        B --> T[services/presence.js]
    end
    subgraph "Data Store"
        Q -- read/write --> V[(Google Sheets\nApps Script)]
        E -- persist --> W[(localStorage\nwedding_v1_*)]
        S -- sync --> X[(Supabase)]
    end
    subgraph "CI/CD"
        Y[git push] --> Z[ci.yml\nlint+test]
        Y --> AA[deploy.yml\nGH Pages]
        Y --> AB[release.yml\non vX.Y.Z tag]
    end
```

## Guest Model

```text
{ id, firstName, lastName, phone, email, count, children,
  status: pending|confirmed|declined|maybe,
  side:   groom|bride|mutual,
  group:  family|friends|work|other,
  meal:   regular|vegetarian|vegan|gluten_free|kosher,
  mealNotes, accessibility: string, transport: string,
  tableId, gift, notes, sent, checkedIn, rsvpDate, rsvpSource,
  tags?, vip?, history?, createdAt, updatedAt }
```

## Themes

| Name | CSS class | Primary color |
|------|-----------|---------------|
| Default | (none) | Purple `#8b5cf6` |
| Rose Gold | `theme-rosegold` | `#d4a574` |
| Gold | `theme-gold` | `#f59e0b` |
| Emerald | `theme-emerald` | `#10b981` |
| Royal Blue | `theme-royal` | `#3b82f6` |

## License

MIT © [RajwanYair](https://github.com/RajwanYair)

---

## User Guide

### Dashboard

The **Dashboard** is the first tab after login. It shows countdown, confirmed/pending/declined counts, total seats, suggested actions, and gift tracker. Stats animate on scroll.

### Managing Guests

1. Click **הוסף אורח / Add Guest** (+ button).
2. Fill in first name, last name, phone, and group.
3. Set expected attendance count (adults + children).
4. Click **שמור / Save**.

Use the filter bar for Status, Side, Group, or free-text search. Click column headers to sort. An amber border indicates unsynced data.

### Table Seating

Create tables with name, capacity, and shape. Use **שבץ אוטומטית / Auto-assign** to seat all unassigned confirmed guests by group priority, or drag guests manually.

### RSVP Flow

Guests open the app link, enter their phone number (phone-first lookup), confirm/decline, select meal preference, and submit. Generate QR codes from the Invitation tab.

### WhatsApp Messages

Select guests and click the WhatsApp icon (💬). Phone numbers are auto-converted to `+972` international format via `wa.me/` links.

### Vendors & Budget

Add vendors with category, name, contact, price, and paid amount. The Budget tab shows total cost, paid amount, remaining balance, and category breakdown. Log ad-hoc expenses separately.

### Settings & Offline Mode

The app works offline once loaded. Data is saved to localStorage and syncs to Google Sheets when online. Configure backend settings, themes, and language in Settings.
