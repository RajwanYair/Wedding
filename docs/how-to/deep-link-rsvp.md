# How-to: Send a guest a deep-link RSVP URL

> Audience: couples / admins managing RSVP outreach
> Time: 2 minutes per guest

## Why

A deep link skips the phone-lookup step. The guest opens the URL, the
form is pre-filled with their name, and they only have to confirm
attendance + meal choice.

## Generate the link

1. Go to **Guests** → select the row → click **Copy RSVP link**.
2. The clipboard now has a URL of the shape:

   ```text
   https://rajwanyair.github.io/Wedding/?token=<opaque-token>#rsvp
   ```

3. Paste into WhatsApp, SMS, or email.

## What the link does

- The router reads `?token=<…>` on load (see [src/core/nav.js](../../src/core/nav.js)).
- `getGuestByToken(token)` looks up the guest in the local store.
- If the token is valid, the app stashes the guest in `sessionStorage`
  under `rsvp_token_guest` and navigates to `#rsvp`.
- The RSVP form auto-fills the name; phone is optional.

## Token rules

| Property | Value |
| --- | --- |
| Format | URL-safe base64, 16 bytes (≈22 chars) |
| Source | Crypto random per guest (ADR-006) |
| Lifetime | Indefinite — revocable by deleting the guest |
| One-shot? | No — guest can submit multiple times; latest wins |

## Limitations

- Tokens live in `sessionStorage` only after first use, so they cannot
  be shared between devices for the same guest **after** RSVP submission.
- If `BACKEND_TYPE=supabase` (ADR-027), token lookup falls back to
  Supabase RLS — make sure the `guests` table has an index on `token`.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Form shows blank | Token does not match any guest. Re-generate from Guests panel. |
| Wrong guest pre-filled | Two guests share a token. Re-generate one. |
| Lands on `#dashboard` | Section name typo in URL — must be `#rsvp`. |

## Related

- [ADR-006: Guest token design](../adr/006-guest-token-design.md)
- [ADR-025: pushState router migration](../adr/025-pushstate-router.md)
