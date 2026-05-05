# Couple's Guide — Wedding Manager

> **Diátaxis type**: Tutorial + How-to
> Audience: the couple planning their wedding using Wedding Manager.
> Companion docs: [Planner Guide](planner-guide.md) · [Vendor Guide](vendor-guide.md) · [Locale Guide](../locale-guide.md)

This guide walks two people through the app from sign-in to the morning of the wedding.
It is intentionally light on screenshots; per-locale screenshots live in
[locale-guide.md](../locale-guide.md).

## Quick-start checklist

| Step | Section | Done? |
| ---- | ------- | ----- |
| Sign in as admin | Settings → User Access | ☐ |
| Set event date + venue | Settings → Event details | ☐ |
| Pick a theme | Settings → Themes | ☐ |
| Add 5 test guests | Guests → Add Guest | ☐ |
| Send a WhatsApp invite | WhatsApp | ☐ |
| Test the RSVP page | RSVP (public link) | ☐ |
| Assign first table | Tables | ☐ |

---

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
3. **Settings → Theme Marketplace** — browse and install community themes.
4. **Settings → Default info** — defaults that pre-fill new guests
   (e.g. dietary preference, side of family, transport hint).

## 3. Build the guest list

Three workflows, in order of effort:

1. **Manual** — Guests → "Add Guest" modal. Phone-first; the form auto-formats Israeli
   `05X` numbers into `+972...` as you type.
2. **Bulk paste** — Guests → "Import" → paste a column of phone numbers and names.
3. **Sheets/CSV import** — see [Operations: migrations](../operations/migrations.md).

For each guest you can set:

- Side (bride / groom / shared)
- Plus-one count
- Dietary preference (none / vegetarian / vegan / gluten-free / kosher / allergies)
- Accessibility notes
- Group / table assignment

### How to add a guest manually

1. Click "Add Guest" (or press `G` from anywhere).
2. Enter name and mobile number (Israeli 05X or international +972).
3. Set "Side" and optional dietary tag.
4. Click Save — the guest appears at the top of the list.

### How to filter the guest list

Use the top filter bar: Status (all / confirmed / declined / pending) · Side · Group.
The active filter is shown as a chip; click ✕ to clear.

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
2. Choose a floor-plan preset: **Banquet** (long rows), **Classroom**, or **Cocktail** (clusters).
3. Drag guests onto tables. The app warns about:
   - Capacity overflow.
   - Side-mixing rules (configurable via "Seating Constraints").
   - Conflict relationships (opt-in seating constraints).
4. Drag tables on the canvas to fine-tune the layout.
5. Export the floor plan as SVG (Tables → Export SVG).

## 6. Manage vendors & budget

1. Open **Vendors** section.
2. Add each vendor: name, category (catering / flowers / photography / music / venue / other), contract amount.
3. Record payments with date and amount — the app calculates outstanding balance.
4. Use **Vendor → Negotiate** to log offer/counter-offer rounds.
5. Use **Vendor → Payment Schedule** to generate installment dates.
6. Use **Vendor → Stripe Connect** to onboard a vendor for direct online payments.
7. Open **Expenses** for non-vendor expenses. Dashboard shows total, by-category breakdown.

## 7. Set up your gift registry

1. Open **Registry** section.
2. Paste links from any store. The app detects the store logo automatically.
3. Copy a deep-link (button next to each item) to share a direct product URL.
4. Optionally set an affiliate tag in the toolbar — it is appended to all deep-links.
5. Share the registry URL from Settings → Event details.

## 8. The morning of the wedding

1. **Check-in** section — kiosk-style list. Mark guests as arrived; live count by side.
2. **Day-of timeline** — milestones like "first dance 20:30".
3. The app works offline if your venue Wi-Fi flakes — pending writes sync when
   connectivity returns.

## 9. AI suggestions

The Dashboard shows live AI-powered suggestions (seating improvements, timing nudges,
budget alerts). Requires an AI proxy key — see [Settings → AI Proxy](../operations/cf-proxy-setup.md).

## 10. After the wedding

- **Settings → Export** — download a JSON archive of every guest, RSVP, table, vendor,
  and expense.
- **Settings → Erase data** — GDPR-grade hard delete (Settings → Danger Zone).

## Need help?

- File issues on [GitHub](https://github.com/RajwanYair/Wedding/issues).
- See the [Planner Guide](planner-guide.md) for multi-event / agency workflows.
- See [Operations: incident response](../operations/incident-response.md) for
  emergencies (lost data, blocked logins, guest cannot RSVP).
