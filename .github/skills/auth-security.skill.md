---
description: "Auth, roles, and security patterns for the Wedding Manager."
---

# Skill: Auth + Security

## Auth Flow

The app supports four auth modes, resolved in order:

1. **Anonymous / Guest** — auto-enters on landing; can only access `PUBLIC_SECTIONS`.
2. **Email allowlist** — `ADMIN_EMAILS` in `src/core/config.js`; grants full admin access.
3. **OAuth** — Google / Facebook / Apple; email is checked against allowlist after OAuth callback.
4. **Supabase Auth** — wraps OAuth; JWT `email` claim must pass `isApprovedAdmin(email)`.

Entry point: `src/core/nav-auth.js` — `isApprovedAdmin(email)` is the single gate.

## Rules

- Never bypass `isApprovedAdmin()` — it is the single source of truth for admin access.
- `PUBLIC_SECTIONS` in `src/core/constants.js` controls what anonymous users see.
- Sensitive config (`GOOGLE_CLIENT_ID`, `FB_APP_ID`, etc.) lives in `src/core/config.js` — never hardcode in templates.
- Credentials are injected at build time by `scripts/inject-config.mjs` — source defaults are empty strings.

## Token Storage

- Auth tokens are currently in localStorage (`wedding_v1_auth_*` keys).
- **Do not read/write tokens directly** — use `src/core/storage.js` helpers.
- Planned upgrade (v8.4+): encrypt with Web Crypto AES-GCM.

## Input Sanitization

Use `sanitize(input, schema)` from `src/utils/sanitize.js` (powered by `valibot`) for all user inputs:

```js
import { sanitize } from "../utils/sanitize.js";
const { value, errors } = sanitize(rawInput, {
  type: "string",
  maxLength: 100,
});
if (errors.length) return showError(errors);
```

- **Never use `innerHTML` with unsanitized data** — use `textContent` or `sanitize()`.
- **Never use `eval()`** — ESLint `no-eval` rule is enforced.
- Phone numbers: `cleanPhone(raw)` from `src/utils/phone.js` before storing or sending.
- All valibot schemas are defined in `src/utils/sanitize.js` — do not inline validation logic.

## Security Headers

Production headers live in `public/_headers` (Cloudflare/Pages CDN format):

- `Content-Security-Policy` — restricts script/style/connect sources.
- `Strict-Transport-Security` — HSTS max-age 1 year.
- `Permissions-Policy` — restricts camera, microphone, geolocation.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.

## Credential Scanning

`scripts/check-credentials.mjs` scans `src/` for secrets matching known patterns.
Run: `npm run check:credentials` — must exit 0 before any commit touching `src/core/config.js`.

## OAuth Globals

`FB`, `AppleID`, `google` are declared `readonly` in `eslint.config.mjs` — do not re-declare.

## CF Worker / AI Proxy Security

The Cloudflare Worker in `worker/` proxies AI API calls to protect the API key:

- The AI API key is stored as a **Cloudflare Worker secret** — never in `src/` or committed to git.
- `callAiProxy(prompt, opts)` in `src/services/ai-proxy.js` sends requests to the worker; it does NOT include the AI API key.
- The worker adds the AI API key as a `Bearer` token in a server-side `Authorization` header — invisible to the browser.
- Error responses from the worker must **not** include the API key or the upstream error message verbatim.
- Rate limiting is enforced in the worker via Cloudflare KV — default 60 req/min per IP.
- If `AI_PROXY_URL` is not set, `callAiProxy()` fails gracefully with a static message — no crash.

## Checklist

- [ ] All user inputs pass through `sanitize()`.
- [ ] No `innerHTML` with unsanitized content.
- [ ] Auth gate uses `isApprovedAdmin(email)`.
- [ ] No hardcoded credentials in source files.
- [ ] `npm run check:credentials` passes.
- [ ] New headers added to `public/_headers` if needed.
- [ ] AI API key stored only in CF Worker secrets — not in `src/` or `.env` files.
- [ ] `callAiProxy()` used for all AI requests — no direct AI API `fetch` calls in `src/`.
