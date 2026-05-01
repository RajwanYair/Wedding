# ADR-044 — Cloudflare proxy in front of GitHub Pages

- **Status**: Proposed
- **Date**: 2026-05-15
- **Sprint**: S560
- **Supersedes**: —

## Context

The Wedding Manager app is currently deployed as a static bundle to
GitHub Pages at `https://rajwanyair.github.io/Wedding/`.  Direct GitHub
Pages hosting works, but it has gaps that block several v30+ features:

| Gap                          | Impact                                                   |
| ---------------------------- | -------------------------------------------------------- |
| No custom domain             | Awkward URL for guests; no email-friendly RSVP links     |
| No edge cache control        | `public/sw.js` and `manifest.json` cache for hours       |
| No regional analytics        | We rely only on Lighthouse + UptimeRobot                 |
| No HTTP header injection     | We can't add `Cache-Control`, `CSP`, `Permissions-Policy` headers Pages doesn't ship |
| Bot/abuse protection limited | Pages has no rate-limiting layer for RSVP form abuse     |

## Decision

Place the deployment behind **Cloudflare** as a reverse-proxy.  Use the
free plan's features only (no Workers Paid, no R2 here).  Pages remains
the origin; Cloudflare adds:

1. **Custom domain** (e.g. `wedding.rajwan.dev`) with TLS via Universal SSL.
2. **`_headers` rules** (already shipped at `public/_headers`) honoured at edge.
3. **Cache rules**: `*.html` + `sw.js` short-TTL (60 s); hashed assets long-TTL (1 y).
4. **Bot Fight Mode** + **Hotlink Protection** for RSVP/landing pages.
5. **Cloudflare Analytics** (free, GDPR-friendly, no JS payload).

## Alternatives considered

| Option                 | Verdict | Reason                                                   |
| ---------------------- | ------- | -------------------------------------------------------- |
| Pages alone            | Reject  | Header + bot-protection gaps unfixable                   |
| Netlify migration      | Reject  | Loses GitHub Pages free build minutes; adds vendor risk  |
| Vercel migration       | Reject  | Same as Netlify; no Hebrew-locale specific advantage     |
| Self-hosted nginx VPS  | Reject  | Adds 24×7 ops burden; violates "no server" principle    |
| Fastly free tier       | Reject  | More expensive past free tier; smaller community         |

## Consequences

### Positive

- Free tier is permanent and well-documented.
- Trivial to revert (delete the `CNAME` record).
- Adds DDoS protection at no cost.
- Better p95 latency outside US-east (Israel users especially).

### Negative

- Adds Cloudflare as a runtime dependency.
- DNS managed off-GitHub (must document in `docs/operations/`).
- Possible cache-stampede on deploy if rules misconfigured.

## Migration plan

1. Buy or reuse a domain (e.g. via Namecheap/Cloudflare Registrar).
2. Set DNS NS records to Cloudflare.
3. Add CNAME `wedding` → `rajwanyair.github.io`.
4. In GitHub Pages settings, set the custom domain.
5. Add Cloudflare cache rule:
   - `Hostname is wedding.rajwan.dev` AND `URI Path contains /assets/`
     → Cache Level: Cache Everything; Edge TTL: 1 year.
   - `Hostname is wedding.rajwan.dev` AND `URI Path matches sw.js`
     → Bypass cache.
6. Add `Page Rule`: `wedding.rajwan.dev/*` → `Always Use HTTPS`.
7. Verify `npm run sri` still passes.
8. Update `docs/operations/uptime.md` monitor URLs to the custom domain.
9. Update `README.md` deployment URL.

## Rollback

1. Delete the GitHub Pages custom-domain setting.
2. Pause Cloudflare DNS at the domain registrar (point NS away).
3. App is back on `rajwanyair.github.io/Wedding/` within DNS TTL (≤ 5 min).

## Open questions

- Should we move to Cloudflare Pages (origin too) in v31+?
- Do we want Cloudflare Turnstile for RSVP anti-spam?
- Will Workers free tier cover an analytics ingest endpoint?

## References

- [Cloudflare free plan limits](https://www.cloudflare.com/plans/)
- [GitHub Pages custom domains](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
- ADR-040 (SW strategies) — defines the cache contract Cloudflare must respect.
- ADR-042 (CI baseline gating) — the CI build artifact is what Cloudflare proxies.
