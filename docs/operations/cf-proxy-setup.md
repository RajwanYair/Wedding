# CF Proxy + Custom Domain Setup (S699)

This guide covers setting up the Cloudflare Worker AI proxy with a custom domain and proper DNS configuration for the Wedding Manager app.

## Architecture

```
Browser → api.wedding.rajwanyair.com → CF Worker (wedding-ai-proxy-prod) → AI providers
Browser → wedding.rajwanyair.com     → GitHub Pages (static app)
```

## Prerequisites

- Cloudflare account with `rajwanyair.com` zone active
- `wrangler` CLI installed: `npm install -g wrangler`
- Logged in: `wrangler login`

## 1 — Deploy the Worker

```bash
# From the worker/ directory:
cd worker

# Build TypeScript (if editing src/index.ts):
npx tsc --project tsconfig.worker.json

# Deploy to production environment:
wrangler deploy --env production

# Verify:
wrangler tail --env production
```

## 2 — DNS Records (Cloudflare Dashboard)

Add these records in your Cloudflare DNS panel for `rajwanyair.com`:

| Type  | Name                  | Content                                    | Proxy   |
|-------|-----------------------|--------------------------------------------|---------|
| CNAME | `api.wedding`         | `wedding-ai-proxy.YOUR_SUBDOMAIN.workers.dev` | ✅ Proxied |
| CNAME | `wedding`             | `rajwanyair.github.io`                     | ✅ Proxied |

> **Note**: The GitHub Pages CNAME record must be proxied (orange cloud) for the custom domain SSL to work correctly with Cloudflare.

## 3 — GitHub Pages Custom Domain

1. In repository Settings → Pages → Custom domain: enter `wedding.rajwanyair.com`
2. Check "Enforce HTTPS"
3. Commit a `CNAME` file in the repo root (or `public/CNAME`) with content: `wedding.rajwanyair.com`

## 4 — Environment Variables

Set secrets for the production Worker:

```bash
# From worker/ directory (secrets are never stored in wrangler.toml):
wrangler secret put AI_PROXY_TOKEN --env production
wrangler secret put ALLOWED_ORIGINS --env production
```

Set in `wrangler.toml` `[env.production]` vars (non-secret):

```toml
[env.production]
vars = { ALLOWED_ORIGINS = "https://wedding.rajwanyair.com,https://rajwanyair.github.io", ... }
```

## 5 — Update Vite Config / CSP

The `public/_headers` file already includes `https://api.wedding.rajwanyair.com` in `connect-src`.

In `vite.config.js`, the `AI_PROXY_URL` env var must point to the production Worker:

```bash
# .env.production (never commit to git):
VITE_AI_PROXY_URL=https://api.wedding.rajwanyair.com
```

## 6 — Validate

```bash
# Test the Worker endpoint (should return JSON):
curl -X POST https://api.wedding.rajwanyair.com/api/ai \
  -H "Content-Type: application/json" \
  -d '{"prompt":"ping","provider":"test"}' 2>&1 | head -5

# Test CORS headers:
curl -I -H "Origin: https://wedding.rajwanyair.com" https://api.wedding.rajwanyair.com/api/ai
# Expect: Access-Control-Allow-Origin: https://wedding.rajwanyair.com
```

## 7 — Staging Environment

For the staging Worker (`--env staging`), DNS record:

| Type  | Name              | Content                                              | Proxy   |
|-------|-------------------|------------------------------------------------------|---------|
| CNAME | `api-staging.wedding` | `wedding-ai-proxy-staging.YOUR_SUBDOMAIN.workers.dev` | ✅ Proxied |

## Rollback

```bash
# Roll back to previous deployment:
wrangler rollback --env production

# Or deploy a specific version:
wrangler deploy --env production --compatibility-date YYYY-MM-DD
```

## References

- [Cloudflare Workers Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [wrangler.toml configuration](../../worker/wrangler.toml)
- [CI deploy workflow](../../.github/workflows/ci.yml)
