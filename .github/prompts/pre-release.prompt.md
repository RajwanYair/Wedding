---
mode: agent
description: Run the full pre-release checklist before tagging a version
---

# Pre-Release Checklist

Run every step below before tagging `${input:version}`. All items must be green.

## Step 1 — Lint

```bash
npm run lint
```

Must exit 0 with **0 errors, 0 warnings**.

## Step 2 — i18n Parity

```bash
npm run check:i18n
```

Must exit 0. Every key in `he.json` must exist in `en.json`, `ar.json`, and `ru.json`.

## Step 3 — Credentials

```bash
npm run check:credentials
```

Must exit 0. All secret fields must be empty strings in source.

## Step 4 — Tests

```bash
npm test
```

Must exit 0. **0 failures, 0 skipped**.

## Step 5 — Build

```bash
npm run build
```

Must exit 0. Check `dist/` was generated.

## Step 6 — Bundle Size

```bash
npm run size
```

Review output. Main bundle should be < 500 KB gzipped.

## Step 7 — Service Worker

Verify `public/sw.js` `CACHE_NAME` contains `${input:version}`.

## Step 8 — Version Files

Run `npm run sync:version` and confirm all version-bearing files match `${input:version}`:

- `src/core/config.js` → `APP_VERSION`
- `package.json` → `"version"`
- `public/sw.js` → `CACHE_NAME`
- `tests/wedding.test.mjs` → version assertion

## Step 9 — CHANGELOG

`CHANGELOG.md` must have an entry for `${input:version}` at the top.

## Step 10 — Dead Export Audit

```bash
npm run audit:dead
```

Review output. Section exports are expected (namespace access). Flag any new dead exports in core modules.

## Step 11 — Security Scan

```bash
node scripts/security-scan.mjs
npm audit --audit-level=moderate
```

Both must exit 0.

## Step 12 — Commit & Tag

```bash
git add -A
git commit -m "chore(release): ${input:version}"
git tag ${input:version}
git push && git push --tags
```

## Step 13 — GitHub Release

```bash
gh release create ${input:version} --title "${input:version} — <title>" --notes-file CHANGELOG_EXCERPT.md
```
