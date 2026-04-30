---
mode: agent
description: Run a security audit against the OWASP Top 10 for this codebase
---

# Security Audit

Perform a targeted security review of the Wedding Manager codebase against the OWASP Top 10.

## Automated Checks

Run these first:

```bash
node scripts/security-scan.mjs
npm run check:credentials
node scripts/check-plaintext-secrets.mjs
npm audit --audit-level=moderate
```

All must exit 0 before proceeding.

## Manual Review Checklist

### A01 — Broken Access Control

- [ ] All admin routes check `isApprovedAdmin(email)` before rendering
- [ ] `PUBLIC_SECTIONS` only contains sections safe for anonymous/RSVP users
- [ ] Supabase RLS policies exist on every table (check `supabase/migrations/`)
- [ ] No admin email hardcoded in source (only via `ADMIN_EMAILS` config / GitHub Secret)

### A02 — Cryptographic Failures

- [ ] No secrets in `src/core/config.js` (all values should be empty strings)
- [ ] `scripts/inject-config.mjs` injects secrets at build time only
- [ ] No credentials in git history: `git log --all -S "secret_value"`

### A03 — Injection

- [ ] No `innerHTML` with user-controlled data anywhere in `src/`
- [ ] All DOM text insertion uses `textContent` or `sanitize()` from `src/utils/sanitize.js`
- [ ] No `eval()` or `new Function()` calls
- [ ] Supabase queries use parameterized calls (`.eq()`, `.match()`) — no string concatenation

### A05 — Security Misconfiguration

- [ ] CSP in `public/_headers` is restrictive (no `unsafe-inline` script-src)
- [ ] HSTS header present with `max-age` ≥ 1 year
- [ ] `X-Content-Type-Options: nosniff` header present
- [ ] Service worker only caches allowed origins

### A07 — Identification & Authentication Failures

- [ ] `isApprovedAdmin()` is the single source of truth — no duplicate allowlist checks
- [ ] Session rotation: `AUTH_SESSION_DURATION_MS` = 2 hours (check `src/core/config.js`)
- [ ] Anonymous guests cannot access admin sections

### A09 — Security Logging & Monitoring Failures

- [ ] Auth events logged via `logAdminAction()` from `src/services/audit.js`
- [ ] Failed auth attempts produce a console warning (not silently ignored)

## Reporting

For each finding, note:

1. **Severity**: Critical / High / Medium / Low
2. **Location**: file + line
3. **Description**: what the vulnerability is
4. **Fix**: exact code change needed

Fix all Critical and High findings before the next release.
