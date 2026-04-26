# ADR-030: Lazy-load locale bundles + namespace splitting

> Status: **Accepted** · Phase: A5 · Targets: v11.13 → v12.0
> Owner: Platform/UX

## Context

Today every locale ships as a single JSON file:

| Locale | Gzip | Source |
| --- | --- | --- |
| `he` (default) | 16.0 KB | `src/i18n/he.json` (eager via `dist/assets/he-*.js`) |
| `en` (lazy) | 26.4 KB | `src/i18n/en.json` |
| `ar` (lazy) | 28.5 KB | `src/i18n/ar.json` |
| `ru` (lazy) | 28.8 KB | `src/i18n/ru.json` |

Total bundle (Hebrew first paint) ≈ 45 KB gzip, of which i18n is ~16 KB.
Switching to English costs an extra 26 KB on top. Adding a fifth locale
(see backlog: French, Spanish) would push the lazy-switch cost above
30 KB and slow `language-changed` re-renders on 3G.

## Decision

Adopt **two-axis splitting**:

1. **Namespace split** — break each locale into per-section namespaces
   matching `SECTION_LIST` (dashboard, guests, tables, … 18 namespaces
   plus `common`).
2. **Active-namespace fetch** — `t()` resolves against the namespaces
   currently loaded; `loadNamespace(section)` returns a promise and is
   called automatically on section mount.

```text
src/i18n/
  he/
    common.json
    dashboard.json
    guests.json
    …
  en/  …
  ar/  …
  ru/  …
```

Vite produces one chunk per `{locale, namespace}` (≈72 chunks total),
each in the 1–4 KB gzip range.

## Phases

| Phase | Gate | Scope |
| --- | --- | --- |
| **N0** _(now, v11.12)_ | merged | This ADR + measurement spreadsheet (no code change). |
| **N1** _(v11.13)_ | landed | New `loadNamespace()` API, fallback to legacy single-file when namespace missing. Tests for parity. |
| **N2** _(v11.14)_ | landed | Migrate `dashboard` and `landing` namespaces only. Both files must round-trip identical strings. |
| **N3** _(v11.15)_ | landed | Migrate remaining 16 namespaces. CI parity check `check-i18n-parity.mjs` extended to validate cross-namespace coverage. |
| **N4** _(v12.0)_ | enforced | Delete legacy `src/i18n/{he,en,ar,ru}.json`. |

## Acceptance criteria

- N1: Hebrew first-paint stays ≤ 16 KB gzip; lazy English load drops below 18 KB.
- N3: Adding a fifth locale costs ≤ 4 KB on the active section, not the whole locale.
- N4: No build references the legacy single-file pattern.

## Migration helpers

A new script `scripts/split-locale.mjs` (lands in N1) reads the legacy
JSON and splits by `data-i18n` namespace prefixes already present in
the templates (e.g. `dashboard.title`, `guests.add`).

## Non-goals

- Server-side translation memory or vendor TMS integration.
- Locale negotiation by `Accept-Language` (already handled by `locale-detector.js`).

## Related

- [ADR-001: Zero runtime deps](001-zero-runtime-deps.md)
- [ADR-004: Message template engine](004-message-template-engine.md)
