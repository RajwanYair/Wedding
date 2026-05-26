---
description: "Build, deploy, and bundle optimization patterns for the Wedding Manager."
---

# Skill: Build & Deploy

## Build System

Vite 8 · Entry: `src/main.js` · Output: `dist/`

```bash
npm run build     # Production build
npm run size      # Bundle size report
npm run sri       # SRI hash verification
```

## Key Configuration (vite.config.js)

| Setting | Value | Purpose |
|---------|-------|---------|
| `base` | `/Wedding/` (overridable via `VITE_BASE`) | GitHub Pages sub-path |
| `cacheDir` | `$TEMP/wedding-dev/vite-cache` | Keep generated cache out of workspace |
| `build.outDir` | `dist` | Gitignored build output |
| `build.sourcemap` | `true` | Debug production issues |
| `test.coverage.reportsDirectory` | `$TEMP/wedding-dev/coverage` | Coverage reports in temp |

## Deploy Pipeline

1. **CI** (`ci.yml`): lint → test → build → deploy to GitHub Pages
2. **Preview** (`preview.yml`): PR preview deployments
3. **Release** (`release.yml`): Tag-triggered release with notes

## Bundle Budget

Defined in `scripts/bundle.budget.json`. Enforced by `npm run size`.

## Code Splitting

Vite auto-splits on dynamic `import()` boundaries:

- Section modules: lazy-loaded by `nav.js`
- Modal templates: lazy-loaded on first open
- Locale dictionaries: lazy-loaded per language switch
- No manual `manualChunks` — splits survive file renames

## Service Worker

`public/sw.js` — `CACHE_NAME` must match version in `package.json`.
Update flow: `initSW()` in `src/core/ui.js` detects new deployments, shows banner.

## Environment Variables

| Variable | Injected By | Usage |
|----------|-------------|-------|
| `VITE_BASE` | CI / local override | Base path for assets |
| `AI_PROXY_URL` | Vite define at build | Cloudflare Worker endpoint |
| `SUPABASE_URL` | Config | Supabase project URL |
| `SUPABASE_ANON_KEY` | Config | Supabase anon key |

## Production Checklist

- `npm run lint` → 0 errors, 0 warnings
- `npm test` → all pass
- `npm run build` → exit 0
- `npm run size` → within budget
- SW `CACHE_NAME` matches version
- No `console.log` in `src/` (only `console.error`/`console.warn`)
