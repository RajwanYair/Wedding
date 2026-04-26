# Tutorial — Your First Event

> **Audience**: New planners or couples opening Wedding Manager for the first
> time. **Goal**: take you from a fresh deployment to a confirmed RSVP in
> under 15 minutes. **Skill assumed**: comfortable with a web browser.

This tutorial is part of the [Diátaxis](https://diataxis.fr/) **tutorial**
quadrant — it is _learning-oriented_ and follows a fixed happy path. For
task-specific recipes see the [How-To](../how-to/) directory; for the
canonical key list see the [Reference](../reference/) directory.

## What you will build

By the end of this tutorial you will have:

1. Opened the deployed app and signed in as an admin.
2. Created a wedding event with a date, venue, and Hebrew/English names.
3. Added one guest by phone and verified the RSVP link works.
4. Submitted that RSVP from the guest's perspective.
5. Seen the dashboard update in real time.

> **Time**: ≤ 15 minutes. **Side effects**: a new wedding event in your
> deployment's storage. **Rollback**: open Settings → Reset to wipe.

## Step 1 — Open the app

Open <https://rajwanyair.github.io/Wedding> (or your own GitHub Pages URL).
The first time you visit, the service worker pre-caches assets so the next
load works offline.

You will land on either:

- **Landing screen** if you are not signed in (anonymous guest mode).
- **Dashboard** if you have a saved admin session.

## Step 2 — Sign in as admin

Click the **Sign in** button (top-right). Choose any of:

- **Email** — must match the deployment's `ADMIN_EMAILS` allowlist.
- **Google / Facebook / Apple** — must use an allow-listed email.

> If your email is not on the allowlist you will be returned to landing as a
> guest. Edit `ADMIN_EMAILS` in your deployment config and retry.

## Step 3 — Create the event

Open **Settings** → **Wedding info**. Fill in:

| Field | Example |
| --- | --- |
| Bride name (he / en) | רבקה / Rebecca |
| Groom name (he / en) | יצחק / Isaac |
| Date | 2026-08-12 |
| Venue | Eshkol Gardens |
| Ceremony time | 18:30 |

Click **Save**. The dashboard now shows a 0/0 RSVP funnel.

## Step 4 — Add your first guest

Open **Guests** → **+ Add guest**. Enter:

- Name: `Sarah Cohen`
- Phone: `054-123-4567`
- Side: bride
- Group: family

Click **Save**. The guest appears with a status of `pending`.

> Behind the scenes the phone is normalized via `cleanPhone()` to `+972541234567`.

## Step 5 — Send and submit the RSVP

In the guest list row, click **WhatsApp**. The app opens
`wa.me/972541234567` with a pre-filled invitation that includes the
deep-link `#rsvp?phone=972541234567`.

Open that link in a new tab. The RSVP form pre-populates from the phone
lookup. Pick **Confirmed**, choose 2 attendees, click **Submit**.

## Step 6 — Watch the dashboard update

Switch back to your admin tab and open **Dashboard**. The funnel now shows
`1 confirmed` and `2 attending`. The store fired a `guests` change which
re-rendered the chart automatically.

## What you have learned

- The RSVP loop end-to-end (admin → WhatsApp → guest → dashboard).
- That every `data-action` is a delegated event — no per-element listeners.
- That data is stored locally first (`wedding_v1_*`) and optionally synced
  to Supabase or Google Sheets.

## Where next

- **Need a different language?** [How-To: add a locale](../how-to/add-a-locale.md).
- **Want to know every storage key?** [Reference: storage keys](../reference/storage-keys.md).
- **Curious about architecture?** Read the ADR index in [`../adr/`](../adr/).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Sign in" returns to landing | Email not on allowlist | Edit `ADMIN_EMAILS` |
| RSVP form blank | Phone format mismatch | Use Israeli `05X-XXX-XXXX` |
| WhatsApp link 404s | Empty phone | Add a phone before clicking |
