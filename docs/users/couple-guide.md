# Couple's Guide — Wedding Manager

> Audience: the couple planning their wedding using Wedding Manager.
> Companion docs: [Planner Guide](planner-guide.md) · [Vendor Guide](vendor-guide.md) · [Locale Guide](../locale-guide.md)

This guide walks two people through the app from sign-in to the morning of the wedding.
It is intentionally light on screenshots; per-locale screenshots live in
[locale-guide.md](../locale-guide.md).

## 1. Sign in

| Provider | When to use |
| --- | --- |
| **Email allowlist** | The fastest path. The owner adds your email under Settings → User Access. |
| **Google / Facebook / Apple** | One-click for couples already in those ecosystems. |
| **Anonymous guest** | View-only; cannot edit guest list or RSVPs. |

Once signed in, your section nav shows up to 18 sections. Press `Alt + 1`–`Alt + 9` to
jump quickly between the first nine.

## 2. Set up your event

1. **Settings → Event details** — date, venue, hashtag, primary language.
2. **Settings → Themes** — pick one of the five built-in themes
   (`default`, `rosegold`, `gold`, `emerald`, `royal`).
3. **Settings → Default info** — defaults that pre-fill new guests
   (e.g. dietary preference, side of family, transport hint).

## 3. Build the guest list

Three workflows, in order of effort:

1. **Manual** — Guests → "Add Guest" modal. Phone-first; the form auto-formats Israeli
   `05X` numbers into `+972...` as you type.
2. **Bulk paste** — Guests → "Import" → paste a column of phone numbers and names.
3. **Sheets/CSV import** — see [Operations: migrations](operations/migrations.md).

For each guest you can set:

- Side (bride / groom / shared)
- Plus-one count
- Dietary preference (none / vegetarian / vegan / gluten-free / kosher / allergies)
- Accessibility notes
- Group / table assignment

## 4. Send invites & collect RSVPs

1. Open **WhatsApp** section.
2. Pick a template (Hebrew / English) and a guest filter (e.g. "all unsent").
3. Click "Open WhatsApp" — the app constructs a `wa.me` link per guest with their
   pre-filled greeting.
4. RSVP responses arrive via the **public RSVP page** (your guests follow the link in
   the WhatsApp message). Phone-first lookup: the guest types their number; the app
   recognises them, pre-fills the form, and asks the remaining questions.

## 5. Seat your tables

1. Open **Tables** section.
2. Drag guests onto tables. The app warns about:
   - Capacity overflow.
   - Side-mixing rules (configurable).
   - Conflict relationships (`seating-constraints.js`, opt-in).
3. AI seating suggestions arrive in v14.0.0 (see [ROADMAP](../../ROADMAP.md) Phase C2).

## 6. Track budget

1. Open **Vendors** + **Expenses**.
2. Each vendor has a contract amount, paid amount, and outstanding balance.
3. Dashboard tile shows total / paid / outstanding / payment-rate.

## 7. The morning of the wedding

1. **Check-in** section — kiosk-style list. Mark guests as arrived; live count by side.
2. **Day-of timeline** — milestones like "first dance 20:30".
3. The app works offline if your venue Wi-Fi flakes — pending writes sync when
   connectivity returns.

## 8. After the wedding

- **Settings → Export** — download a JSON archive of every guest, RSVP, table, vendor,
  and expense.
- **Settings → Erase data** — GDPR-grade hard delete (hard-delete edge function lands
  in Phase A7 of the [ROADMAP](../../ROADMAP.md)).

## Need help?

- File issues on [GitHub](https://github.com/RajwanYair/Wedding/issues).
- See the [Planner Guide](planner-guide.md) for multi-event / agency workflows.
- See [Operations: incident response](../operations/incident-response.md) for
  emergencies (lost data, blocked logins, guest cannot RSVP).
