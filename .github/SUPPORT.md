# Support

<!-- markdownlint-disable MD033 -->
<div align="center">

[![Issues](https://img.shields.io/badge/Report_a_Bug-Issues-f87171?style=flat-square&logo=github)](https://github.com/RajwanYair/Wedding/issues/new/choose)
[![Discussions](https://img.shields.io/badge/Ask_a_Question-Discussions-60a5fa?style=flat-square&logo=github)](https://github.com/RajwanYair/Wedding/discussions)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-34d399?style=flat-square&logo=github)](https://rajwanyair.github.io/Wedding/)

</div>
<!-- markdownlint-enable MD033 -->

## Getting Help

| Channel                                                                              | Use For                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------ |
| [README](https://github.com/RajwanYair/Wedding#readme)                               | Setup, usage, and feature overview         |
| [CHANGELOG](https://github.com/RajwanYair/Wedding/blob/main/CHANGELOG.md)            | Version history and release notes          |
| [ARCHITECTURE](https://github.com/RajwanYair/Wedding/blob/main/ARCHITECTURE.md)      | Module layout, data flow, design decisions |
| [Discussions](https://github.com/RajwanYair/Wedding/discussions)                     | Questions, ideas, and general help         |
| [Issues](https://github.com/RajwanYair/Wedding/issues/new/choose)                    | Bug reports, feature requests              |
| [Security Advisories](https://github.com/RajwanYair/Wedding/security/advisories/new) | Private security vulnerability reports     |

## Quick Troubleshooting

### RSVP not loading?

1. Open browser DevTools (F12) → Console tab
2. Check for CORS or network errors
3. The app uses local-first storage (`localStorage` with `wedding_v1_` prefix) — your data is never lost even if the network drops
4. Clear cache if a stale service worker is loaded — see "SW update" section below

### Google Sheets sync not working?

- Sync is debounced via `enqueueWrite()` — small edits batch every few seconds
- Check Settings → Google Sheets and verify the configured Sheet ID + service-account access
- Look for `[sheets]` logs in the browser console — sync errors are surfaced there

### WhatsApp link opens to wrong number?

- Phone numbers go through `cleanPhone()` which converts Israeli `05X` → `+972`
- For non-Israeli numbers, prefix with the full country code (e.g. `+1...`)
- Check Settings → User Access for admin allowlist

### Dashboard shows English when I want Hebrew (or vice-versa)?

- Toggle via the language switcher in the header (he/en/ar/es/fr/ru)
- Default is Hebrew RTL — `dir="rtl" lang="he"` on `<html>`
- 6 locales supported, all with full key parity (enforced by `npm run check:i18n`)

### Service Worker showing stale data after deploy?

- The app auto-detects new deployments via `initSW()` in `src/core/ui.js`
- A banner appears prompting reload, or auto-reloads after 30 s
- Force reload: hard refresh (`Ctrl+Shift+R`) or DevTools → Application → Service Workers → Unregister

### Running Tests Locally

```bash
# From repo root (after `npm install` from parent MyScripts/ folder)
npm run lint          # ESLint + Stylelint + HTMLHint + markdownlint (0 errors, 0 warnings)
npm test              # Vitest — 6450+ tests, 458 files, 0 Node warnings
npm run build         # Vite production build
npm run ci            # lint + i18n parity + credentials check + test + build
```

Requires **Node.js ≥ 22**.

### Live Demo

Visit the [GitHub Pages deployment](https://rajwanyair.github.io/Wedding/) to try the app without installing.

## Response Time

This is a personal project maintained by [@RajwanYair](https://github.com/RajwanYair).
Response times may vary, but issues are typically reviewed within a few days.

For private security vulnerabilities, please use
[Security Advisories](https://github.com/RajwanYair/Wedding/security/advisories/new)
rather than a public issue.
