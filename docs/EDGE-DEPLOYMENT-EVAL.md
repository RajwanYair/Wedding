# Multi-Tenant / Edge Deployment — Evaluation (F5.3.1)

## Edge Deployment Options

| Platform | Pros | Cons | Cost |
| --- | --- | --- | --- |
| **GitHub Pages** (current) | Free, CDN, zero config | Static only, no dynamic features | $0 |
| **Cloudflare Pages** | Free, faster CDN, edge functions | Migration effort, vendor lock-in | Free tier |
| **Vercel** | Preview deploys, edge functions | Vendor lock-in, pricing at scale | Free tier |
| **Netlify** | Preview deploys, form handling | Similar to Vercel | Free tier |

## Recommendation

**Stay on GitHub Pages for v5.x.** Rationale:
- Zero-dep philosophy is best served by static hosting
- All dynamic features use client-side JS + Google Sheets/Supabase
- No server-side rendering needed
- GitHub Pages CDN is sufficient for Israeli audience

## Custom URL Pattern (if adopted)

```text
# Option A: GitHub Pages with custom domain
elior-tova.wedding.app → CNAME → rajwanyair.github.io/Wedding

# Option B: Cloudflare Pages (multi-site)
elior-tova.weddingapp.pages.dev → per-wedding build

# Option C: Single app, per-wedding config (recommended)
rajwanyair.github.io/Wedding?event=elior-tova
→ Loads config from Supabase/Sheets by event ID
→ Already supported via S9.1 multi-event store prefix
```

## Decision

**Option C recommended.** Already partially implemented:
- `getActiveEventId()` in `src/core/state.js` scopes all localStorage to an event
- `reinitStore()` in `src/core/store.js` supports hot-switching events
- Add `?event=ID` URL param support for direct linking
- No infrastructure changes needed
