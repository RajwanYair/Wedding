# ADR-006: Guest Token Design

**Status:** Accepted  
**Date:** 2025-06-15  
**Context:** Wedding Manager v6.5.0 — Sprint 36–37

## Problem

Guests need a lightweight, shareable link that lets them access their personalised
RSVP page without creating an account.  The token must:

- Encode a guest ID and expiry without server round-trips
- Be safe to embed in WhatsApp messages (short, URL-safe)
- Support revocation (e.g. if a guest transfers the link)
- Not reveal sensitive data in the token itself

## Decision

Implement `src/services/guest-token.js` as a **signed, base64url-encoded token**
using a djb2-style HMAC substitute.

### Token format

```
base64url( guestId + "|" + exp_ms )|djb2_hash(guestId + "|" + exp_ms + "|" + secret)
```

Encoded as two base64url segments joined by `.`:

```
<b64url(payload)>.<b64url(signature)>
```

### Design choices

| Aspect | Decision | Rationale |
|---|---|---|
| Algorithm | djb2 hash (non-cryptographic) | No `crypto.subtle` needed; adequate for convenience tokens |
| Expiry | Configurable TTL (default 30 days) | Matches RSVP window |
| Revocation | Revoked IDs stored in `localStorage` | No DB round-trip; revocation is infrequent |
| Secret | Set via `setTokenSecret(s)` at app init | Avoids hard-coding; rotatable |
| Padding | `"=".repeat(4 - (len%4)) || ""` | Correct base64 re-padding formula |

### Security properties

- Tokens are **tamper-evident** — any mutation of guest ID or expiry invalidates the hash
- Tokens are **not secret** — anyone with the link can use it (by design: guests share with family)
- Revocation is **eventual** — revoked tokens remain valid on other devices until localStorage clears

## Consequences

**Positive:**
- Zero runtime deps maintained
- Works offline (no server needed to verify)
- Easy to generate and distribute via WhatsApp

**Negative:**
- djb2 is not cryptographically secure — determined attacker could forge tokens
- Revocation is per-device (localStorage); not globally enforced
- Secret stored in memory — lost on page refresh unless persisted

## Alternatives Considered

- **JWT (HS256)** — requires `crypto.subtle`; adds complexity; overkill for wedding tokens
- **Supabase magic links** — requires email; many guests don't have email configured
- **Session cookies** — require server; conflict with static-site deployment
