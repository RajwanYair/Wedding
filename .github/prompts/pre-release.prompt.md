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

Must exit 0. **0 failures, 0 skipped, 0 Node warnings**.

## Step 5 — Build

```bash
npm run build
```

Must exit 0. Check `dist/` was generated.

## Step 6 — Bundle Size

```bash
npm run size
```

Review output. Main bundle should be < 500 KB uncompressed.

## Step 7 — Service Worker

Verify `public/sw.js` `CACHE_NAME` contains `${input:version}`.

## Step 8 — Version Files

Run `npm run sync:version` and confirm all 14 version-bearing files match `${input:version}`.

## Step 9 — CHANGELOG

`CHANGELOG.md` must have an entry for `${input:version}` at the top.

## Step 10 — Dead Export Audit

```bash
node scripts/dead-export-check.mjs
```

Section exports are expected (namespace access). Flag any new dead exports in core/services.

## Step 11 — Architecture Audits

```bash
node scripts/audit-base-section.mjs
node scripts/audit-console-error.mjs
node scripts/audit-css-scope.mjs --enforce
```

All must exit 0.

## Step 12 — Security Scan

```bash
node scripts/security-scan.mjs
npm audit --audit-level=moderate
```

Both must exit 0.

## Step 13 — Commit & Tag

```bash
git add -A
git commit -m "${input:version} — <sprint summary>"
git tag ${input:version}
git push && git push --tags
```

## Step 14 — GitHub Release

```bash
$env:GH_PAGER = ""
gh release create ${input:version} --title "${input:version} — <title>" --generate-notes
```
