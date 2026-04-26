# Reference: CSP directives

> Diátaxis: reference. For the rationale see
> [docs/explanation/csp-and-trusted-types.md](../explanation/csp-and-trusted-types.md).
> Source of truth: [public/\_headers](../../public/_headers).

The production CSP is shipped as an HTTP header by GitHub Pages via
`public/_headers`. This page enumerates every directive, the values
we send, and the reason each value is allow-listed.

## Header

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'sha256-…';
  style-src  'self' 'unsafe-hashes' 'sha256-…';
  img-src    'self' data: https://lh3.googleusercontent.com;
  font-src   'self';
  connect-src 'self' https://*.supabase.co https://api.green-api.com;
  frame-src  https://accounts.google.com;
  worker-src 'self';
  manifest-src 'self';
  object-src 'none';
  base-uri   'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  require-trusted-types-for 'script';
  trusted-types wedding-sanitizer default;
```

## Directive table

| Directive                  | Value(s)                                            | Why                                                                 |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| `default-src`              | `'self'`                                            | Deny by default; every other directive is an explicit opt-in.       |
| `script-src`               | `'self' 'sha256-…'`                                 | Inline `<script>` blocks are pinned by hash; no `unsafe-inline`.    |
|                            | `https://accounts.google.com`                       | Google Identity Services SDK (loaded only when user clicks Google sign-in). |
|                            | `https://connect.facebook.net`                      | Facebook JS SDK (dynamic, OAuth only).                              |
|                            | `https://appleid.cdn-apple.com`                     | Sign-in-with-Apple SDK (dynamic, OAuth only).                       |
| `style-src`                | `'self'`                                            | All CSS shipped from origin.                                        |
|                            | `'unsafe-hashes' 'sha256-…'`                        | Pins the few inline `style="…"` strings produced by Vite at build.  |
| `img-src`                  | `'self'`                                            | Local assets.                                                       |
|                            | `data:`                                             | Inline SVG icons emitted by `generate-icons.mjs`.                   |
|                            | `https://lh3.googleusercontent.com`                 | Google profile avatars (admin auth UI).                             |
| `font-src`                 | `'self'`                                            | Self-hosted Heebo subset; no remote font CDN.                       |
| `connect-src`              | `'self'`                                            | XHR/fetch back to origin (SW, manifest, locale JSON).               |
|                            | `https://*.supabase.co`                             | Supabase REST + Realtime + Auth.                                    |
|                            | `https://api.green-api.com`                         | Green-API WhatsApp gateway.                                         |
| `frame-src`                | `https://accounts.google.com`                       | Google sign-in iframe.                                              |
| `worker-src`               | `'self'`                                            | Service worker + future Web Workers.                                |
| `manifest-src`             | `'self'`                                            | `manifest.json` for PWA install.                                    |
| `object-src`               | `'none'`                                            | Disables `<object>`, `<embed>`, `<applet>`.                         |
| `base-uri`                 | `'self'`                                            | Prevents `<base href>` tampering.                                   |
| `form-action`              | `'self'`                                            | Forms POST only to origin.                                          |
| `frame-ancestors`          | `'none'`                                            | Disallows our app being embedded in any frame (clickjacking).       |
| `upgrade-insecure-requests`| —                                                   | Auto-upgrade `http://` subresources.                                |
| `require-trusted-types-for`| `'script'`                                           | Enforce TT on script-y DOM sinks.                                   |
| `trusted-types`            | `wedding-sanitizer default`                         | Only our named policy may produce trusted strings.                  |

## What is *not* allowed

- `'unsafe-inline'` — inline `<script>` is rejected outright.
- `'unsafe-eval'` — `eval`, `Function(string)`, `setTimeout(string)`.
- Wildcards in `script-src` or `connect-src`. The Supabase wildcard is
  scoped to the `*.supabase.co` subdomain only.
- Mixed content. `upgrade-insecure-requests` keeps everything TLS.

## Adding a new origin

1. Add the origin to the relevant directive in `public/_headers`.
2. Update this page and `docs/explanation/csp-and-trusted-types.md`.
3. Add a regression test under
   `tests/integration/csp-headers.test.mjs` that fails if the
   directive is missing.
4. Document the *why* in the commit message — the CSP is a security
   surface; opaque additions are reverted on review.

## Verification

```bash
# Locally
curl -sI http://localhost:4173 | grep -i content-security

# In CI (production preview)
node scripts/check-csp.mjs
```

The `check-csp.mjs` script validates the deployed CSP matches the
in-repo expectation.

## See also

- [docs/explanation/csp-and-trusted-types.md](../explanation/csp-and-trusted-types.md)
- [ADR-038 Trusted Types policy](../adr/038-trusted-types-policy.md)
- [public/\_headers](../../public/_headers)
