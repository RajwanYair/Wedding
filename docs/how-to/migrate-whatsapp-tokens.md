# How-to: Migrate WhatsApp Green API credentials to encrypted storage (ADR-026 E1)

> Audience: maintainers cutting WhatsApp tokens over to `secure-storage.js`
> Phase: E1 (one storage key family at a time, zero-downtime)

## Scope of this recipe

E1 covers exactly three storage keys:

| Constant | localStorage key |
| --- | --- |
| `STORAGE_KEYS.GREEN_API_TOKEN` | `wedding_v1_greenApiToken` |
| `STORAGE_KEYS.GREEN_API_INSTANCE_ID` | `wedding_v1_greenApiInstanceId` |
| `STORAGE_KEYS.WA_PHONE_NUMBER_ID` | `wedding_v1_wa_phone_number_id` |

All three are read by [src/sections/whatsapp.js](src/sections/whatsapp.js) and listed in
[scripts/check-plaintext-secrets.mjs](scripts/check-plaintext-secrets.mjs).

## Pre-flight

1. Confirm `audit:plaintext-secrets` is currently green:

   ```pwsh
   npm run audit:plaintext-secrets
   ```

2. Confirm `secure-storage.js` API is loaded for the WhatsApp section.
3. Confirm the AES-GCM key in IndexedDB resolves on the target browsers (Safari 16+, Chrome 110+).

## Migration steps

1. **Add a write-shim** to `secure-storage.js`:

   ```js
   export async function setSecret(key, value) { /* envelope v1 */ }
   export async function getSecret(key) { /* returns plaintext or null */ }
   ```

2. **In `whatsapp.js`**, replace direct `localStorage.setItem(STORAGE_KEYS.GREEN_API_TOKEN, …)`
   calls with `await setSecret(STORAGE_KEYS.GREEN_API_TOKEN, value)`. Keep reads dual-path:

   ```js
   const token =
     (await getSecret(STORAGE_KEYS.GREEN_API_TOKEN)) ??
     localStorage.getItem(STORAGE_KEYS.GREEN_API_TOKEN);
   ```

3. **Run the dual-path migration on first read**: when the legacy plaintext value is hit,
   re-encrypt it via `setSecret`, then `localStorage.removeItem` the legacy key.
4. **Update `scripts/check-plaintext-secrets.mjs`** allowlist to include `src/sections/whatsapp.js`
   only on lines that perform the migration `removeItem` call.
5. **Add a unit test** that simulates a legacy plaintext value and asserts it is migrated and
   removed on first read.

## Rollback

The dual-read path means rollback is "ship a version that only reads plaintext". Encrypted
envelopes left behind will simply be ignored.

## Acceptance gate

- `npm run audit:plaintext-secrets` still green
- New test passes
- Manual smoke: open Settings → WhatsApp → save a token → reload → token still works

## Related

- [ADR-026: Encrypt tokens & PII at rest](../adr/026-encrypt-tokens-at-rest.md)
- [Reference: backend types](../reference/backend-types.md)
