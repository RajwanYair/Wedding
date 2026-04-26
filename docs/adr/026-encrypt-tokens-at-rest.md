# ADR-026: Encrypt Auth Tokens & PII at Rest

- **Status**: Proposed
- **Date**: 2026-04-29
- **Targeted release**: v12.0.0 (Phase A3)
- **Related**: ADR-008 (PII classification), ROADMAP §6 Phase A

## Context

Today, several long-lived secrets and PII fields persist in plaintext
`localStorage`:

| Storage key | What's stored | Sensitivity |
| --- | --- | --- |
| `wedding_v1_supabase_session` | Supabase JWT bundle (access + refresh) | **Critical** |
| `wedding_v1_supabase_auth` | OAuth provider state | High |
| `wedding_v1_greenApiToken` | WhatsApp Green API token | **Critical** |
| `wedding_v1_greenApiInstanceId` | WhatsApp Green API instance | High |
| `wedding_v1_wa_phone_number_id` | WhatsApp Business phone id | Medium |
| `wedding_v1_guests` | Names + phones + dietary notes | High (PII) |

Any XSS at any time exfiltrates all of the above. ADR-008 already
classifies guest data as PII; ROADMAP §0 priority #2 commits to
encrypting credentials and PII at rest.

`src/core/storage.js` already exposes a `secure-storage` wrapper around
the Web Crypto API (`AES-GCM`, 256-bit, IndexedDB-resident key). It is
referenced from a few call sites but is not the default path.

## Decision

Adopt **AES-GCM 256** at rest for all keys in the **Critical** and
**High** sensitivity tiers, using a **non-extractable** CryptoKey
generated and stored in IndexedDB (`crypto.subtle.generateKey`,
`extractable: false`).

### Key management

```text
On first run:
  1. crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt","decrypt"])
  2. Persist the CryptoKey object (NOT the raw bytes) into IndexedDB
     under db `wedding-secure-store`, store `keys`, key `master-v1`.
  3. Set localStorage flag `wedding_v1_secure_init = "1"`.

On every subsequent boot:
  1. Read the CryptoKey object from IndexedDB.
  2. Use `subtle.encrypt`/`subtle.decrypt` for all secure storage operations.
```

Because `extractable: false`, the raw key never appears in JS heap memory
and cannot be exfiltrated via XSS that doesn't already have full
SubtleCrypto access (in which case the attacker has equivalent
capability anyway). This is the strongest at-rest guarantee available
to a browser-resident app without a backend HSM.

### Storage envelope

Each ciphertext blob is stored as JSON:

```json
{
  "v": 1,
  "iv": "<base64 12-byte iv>",
  "ct": "<base64 ciphertext>"
}
```

A fresh IV is generated per write (`crypto.getRandomValues(new Uint8Array(12))`).

### Migration phases

| Phase | Release | Scope |
| --- | --- | --- |
| E0 | v11.10.0 (this ADR) | Specification + advisory `audit:plaintext-secrets` script |
| E1 | v11.11.x | Move WhatsApp Green API tokens to secure storage (lowest-risk migration; one consumer) |
| E2 | v11.12.x | Move Supabase session/auth blobs to secure storage; encrypt-on-write, decrypt-on-read shim |
| E3 | v11.13.x | Encrypt the `guests`, `vendors` store domains (PII) |
| E4 | v12.0.0 | Remove plaintext fallback path; advisory script becomes hard CI gate |

### Backwards compatibility

For each migration step, the read path tries:

1. Decrypt as v1 envelope.
2. If JSON does not match the envelope shape, treat as plaintext legacy
   value, immediately re-write encrypted, and return.

This makes the migration zero-downtime — first read after upgrade
seamlessly rewrites in encrypted form.

### What stays plaintext

Anonymous user preferences (`theme`, `lightMode`, `colorScheme`,
`lastSeenVersion`) remain plaintext — they are not PII and encrypting
them adds boot latency for no security gain.

### Threat model deltas

| Threat | Before | After |
| --- | --- | --- |
| XSS exfil of `localStorage` | Full token + PII dump | Empty / opaque ciphertext only |
| Stolen device, locked OS user | All cleartext readable | All encrypted; XSS from another origin still fails |
| Service-worker compromise | Full access | Same — SW shares the origin; this ADR does not solve it |
| Browser DevTools snooping | Trivial | Decryptable only with the live CryptoKey (still possible if attacker has full DevTools, but no offline copy) |

This ADR raises the bar for offline / passive attackers; it does **not**
mitigate live in-page XSS, which is addressed separately by the Trusted
Types policy plan (ADR-018).

## Alternatives considered

1. **Password-derived key (PBKDF2)** — rejected: requires user passphrase;
   poor UX for a single-user wedding planner.
2. **Service worker as crypto vault** — rejected: SW state is non-durable
   across browser restarts; `IndexedDB` non-extractable key is stronger.
3. **Move all secrets to httpOnly cookies** — rejected: GitHub Pages
   cannot set them; would require a separate origin.

## Consequences

- **`secure-storage.js` becomes mandatory** for the keys above; ESLint
  `no-restricted-globals` rule blocks `localStorage.setItem` for those
  specific keys.
- **All boot paths** that touch sensitive storage become async (already
  the case for IndexedDB consumers).
- **Tests** add a `crypto.subtle` happy-dom shim (`@peculiar/webcrypto`)
  and a fixture key for deterministic ciphertext.
- **Bundle**: zero — Web Crypto is built into every supported browser.

## Acceptance criteria for E0 (this ADR)

- [x] Decision document committed
- [x] Migration phases pinned to v11.11 → v12.0
- [ ] `scripts/check-plaintext-secrets.mjs` advisory script lands in v11.10.0
- [ ] `audit:plaintext-secrets` npm script wired (advisory)
