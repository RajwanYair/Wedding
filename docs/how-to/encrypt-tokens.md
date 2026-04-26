# How-To — Migrate a Storage Key to Encrypted-at-Rest

> **Audience**: contributors implementing ADR-026 phases E1–E4.
> **Prerequisites**: working repo, lint + test green, familiarity with
> `src/services/secure-storage.js` and the `wedding_v1_*` storage scheme.

This guide walks through the standard migration recipe for moving a
single storage key from plaintext `localStorage` to AES-GCM encrypted
storage. Use it for every key in the **Critical** and **High** tiers
listed in [ADR-026](../adr/026-encrypt-tokens-at-rest.md).

## When to use this recipe

Use it when:

- ADR-026 lists the key as Critical or High sensitivity.
- The current write path is `localStorage.setItem(key, value)` or
  `storage.set(key, value)`.
- You can update _every_ read site in the same change set.

Do **not** use it for anonymous user preferences (`theme`, `lightMode`,
`colorScheme`) — those stay plaintext (ADR-026 §"What stays plaintext").

## Recipe

### 1. Locate every read and write

```bash
# Find every reference to the storage key.
git grep -n 'wedding_v1_supabase_session'
```

You will typically see:

- 1 site that defines the constant (`src/core/constants.js`).
- 1 write site (login).
- 1 read site (boot / refresh).
- Maybe 1 delete site (logout).

### 2. Wrap the write through `secure-storage`

```js
// before
import { STORAGE_KEYS } from "../core/constants.js";
localStorage.setItem(STORAGE_KEYS.SUPABASE_SESSION, JSON.stringify(session));

// after
import { secureStorage } from "../services/secure-storage.js";
import { STORAGE_KEYS } from "../core/constants.js";
await secureStorage.set(STORAGE_KEYS.SUPABASE_SESSION, session);
```

`secureStorage.set()` handles JSON-encoding internally and emits a v1
envelope `{ v, iv, ct }`.

### 3. Wrap the read with a backwards-compatible shim

```js
async function loadSession() {
  // First, try the encrypted path.
  const encrypted = await secureStorage.get(STORAGE_KEYS.SUPABASE_SESSION);
  if (encrypted) return encrypted;

  // Fallback: legacy plaintext value still in localStorage.
  const legacy = localStorage.getItem(STORAGE_KEYS.SUPABASE_SESSION);
  if (!legacy) return null;
  let parsed;
  try {
    parsed = JSON.parse(legacy);
  } catch {
    return null;
  }

  // Re-write encrypted, remove legacy, return value.
  await secureStorage.set(STORAGE_KEYS.SUPABASE_SESSION, parsed);
  localStorage.removeItem(STORAGE_KEYS.SUPABASE_SESSION);
  return parsed;
}
```

This is the **zero-downtime migration shim** — first read after upgrade
seamlessly rewrites in encrypted form and clears the legacy slot.

### 4. Update the delete path

```js
await secureStorage.remove(STORAGE_KEYS.SUPABASE_SESSION);
localStorage.removeItem(STORAGE_KEYS.SUPABASE_SESSION); // belt + braces
```

### 5. Add a unit test

Create `tests/unit/services/secure-<key>.test.mjs`:

```js
import { describe, it, expect, beforeEach } from "vitest";
import { secureStorage } from "../../../src/services/secure-storage.js";
import { STORAGE_KEYS } from "../../../src/core/constants.js";

describe("supabase session secure migration", () => {
  beforeEach(async () => {
    localStorage.clear();
    await secureStorage.clear();
  });

  it("rewrites a legacy plaintext session as encrypted on first read", async () => {
    const legacy = { access_token: "abc", refresh_token: "def" };
    localStorage.setItem(STORAGE_KEYS.SUPABASE_SESSION, JSON.stringify(legacy));

    const out = await loadSession();
    expect(out).toEqual(legacy);

    expect(localStorage.getItem(STORAGE_KEYS.SUPABASE_SESSION)).toBeNull();
    const encrypted = await secureStorage.get(STORAGE_KEYS.SUPABASE_SESSION);
    expect(encrypted).toEqual(legacy);
  });
});
```

### 6. Run the audit

```bash
npm run audit:plaintext-secrets
```

The script prints `✅ no plaintext writes` once the migration is
complete for that key. Until then, the violation row identifies any
remaining call sites.

### 7. Run the full pipeline

```bash
npm run lint && npm test && npm run build
```

All three must exit 0 before merging.

## Common pitfalls

- **Synchronous read paths**: `secureStorage.get()` is async because Web
  Crypto + IndexedDB are async. Refactor any sync caller to `await`.
- **Boot ordering**: the secure store needs the master key. Make sure
  `secureStorage.init()` is awaited before any consumer reads.
- **Tests without a Web Crypto shim**: happy-dom 12+ ships
  `crypto.subtle`. Older versions need `@peculiar/webcrypto` polyfill.
- **Forgetting the legacy fallback**: a hard-cutover release breaks
  every existing user's login until they sign in again. Always ship the
  shim first.

## See also

- [ADR-026 — Encrypt tokens at rest](../adr/026-encrypt-tokens-at-rest.md)
- [Reference — Storage keys](../reference/storage-keys.md)
- [`src/services/secure-storage.js`](../../src/services/secure-storage.js)
