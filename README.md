<div align="center">

# 💍 Wedding Manager

![Version](https://img.shields.io/badge/version-v8.0.0-d4a574?style=flat-square)
![CI](https://github.com/RajwanYair/Wedding/actions/workflows/ci.yml/badge.svg?style=flat-square)
![Deploy](https://github.com/RajwanYair/Wedding/actions/workflows/deploy.yml/badge.svg?style=flat-square)
![Tests](https://img.shields.io/badge/tests-CI_green-brightgreen?style=flat-square)
![Modular](https://img.shields.io/badge/Modular-50%2B_JS_%2B_7_CSS-E34F26?style=flat-square&logo=html5&logoColor=white)
![Dependencies](https://img.shields.io/badge/Runtime_Deps-Zero-6ee7b7?style=flat-square)
![Hebrew](https://img.shields.io/badge/שפה-עברית_RTL-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)

**Wedding management app for RSVP, guest lists, table seating, WhatsApp outreach, and event-day operations.**
**Vite 8, vanilla JS/CSS, Hebrew RTL first, zero runtime dependencies.**

Node 22+ is the supported local and CI runtime.

</div>

---

![Architecture](architecture.svg)

## Features

![Features](features-grid.svg)

## RSVP Journey

![RSVP Flow](rsvp-flow.svg)

## Quick Start

```bash
git clone https://github.com/RajwanYair/Wedding.git
cd Wedding

# Install shared dependencies from the parent workspace
cd ../MyScripts && npm install && cd Wedding

# Start local development
npm run dev
```

## Development

```bash
npm run lint
npm test
npm run build
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

## Overview

```text
index.html        HTML shell
css/              layered stylesheets
src/main.js       bootstrap entry
src/core/         app primitives: store, nav, events, i18n, ui
src/sections/     feature modules with mount/unmount lifecycle
src/services/     auth, sheets, backend, presence, supabase
src/templates/    lazy-loaded section markup
src/modals/       lazy-loaded modal markup
tests/            Vitest + Playwright coverage
```

Detailed runtime notes live in ARCHITECTURE.md. Contributor workflow notes live in CONTRIBUTING.md.

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
    side: groom|bride|mutual,
    group: family|friends|work|neighbors|other,
    meal: regular|vegetarian|vegan|gluten_free|kosher,
    mealNotes, accessibility, transport, tableId, gift, notes,
    sent, checkedIn, rsvpDate, createdAt, updatedAt }
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
