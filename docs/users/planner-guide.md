# Planner Guide — Wedding Manager

> **Diátaxis type**: How-to + Reference
> Audience: wedding planners and agencies running multiple events through Wedding Manager.
> Companion docs: [Couple's Guide](couple-guide.md) · [Vendor Guide](vendor-guide.md)

This guide covers the planner-specific workflows: multi-event management, budget
tracking across events, vendor negotiation, payment schedules, analytics, and export.

---

## 1. Multi-event management

Wedding Manager supports multiple events per account through the `event_id` scope.

| Capability | Status |
| --- | --- |
| Switch between events | ✅ Header dropdown |
| Per-event guests / tables / vendors | ✅ Scoped by `event_id` |
| Per-event RSVP page | ✅ Public link per event |
| Cross-event vendor reuse | ⏳ v15.0.0 (ROADMAP §6 Phase D) |
| Org / team workspaces | ⏳ v15.0.0 |
| Role-based access | ⏳ v15.0.0 |

### How to switch events

1. Click the event name in the page header (top-left).
2. Select from the dropdown or click "New event".
3. All sections (guests, vendors, tables) reload for the selected event.

### Recommended naming convention

Use `<couple-surnames>-<ISO-date>`: e.g. `cohen-levy-2026-09-12`.
This sorts chronologically and disambiguates couples with the same first name.

---

## 2. Budget tracking

### Vendor budget

1. Open **Vendors** → each vendor has: category, contract amount, paid amount, outstanding.
2. Use **Vendor → Payment Schedule** to generate installment dates automatically.
3. Use **Vendor → Negotiate** to record offer/counter-offer negotiation rounds.
4. Dashboard tile: budget summary — total / paid / outstanding / payment rate.

### Expense tracking

1. Open **Expenses** section.
2. Add non-vendor expenses (e.g. invitations, décor purchases) by category.
3. Dashboard shows total and breakdown by category.

### Stripe Connect (online vendor payments)

1. In Vendors section, scroll to **Stripe Connect** panel.
2. Select a vendor and click "Setup Stripe" — generates an onboarding URL.
3. Once the vendor completes onboarding, their status shows "Active".
4. Use "Generate Receipt" to produce a PDF-style payment receipt.

---

## 3. Analytics & reporting

### Dashboard stats

The Dashboard section shows live tiles:

| Tile | Metric |
| ---- | ------ |
| Guests | total / confirmed / pending / declined / seated |
| RSVP funnel | invited → responded → confirmed |
| Tables | total / seated / available seats |
| Vendors | total cost / total paid / outstanding |
| Check-in | checked in / remaining on day-of |

### Exporting data

1. **Settings → Export** — full JSON archive: guests, RSVPs, tables, vendors, expenses.
2. **Guests → CSV export** — flat CSV for import into Excel / Sheets.
3. **Floor plan → SVG** — Tables → Export SVG for your venue layout.
4. **AI suggestions** — Dashboard shows AI-powered nudges; refresh with the "Refresh AI" button.

---

## 4. Check-in workflow (day-of)

1. Open **Check-in** on a tablet at the venue entrance.
2. Guests type their name or phone; click "Check in".
3. Live counter updates for both sides (bride / groom / shared).
4. At any time, export the current check-in state via Dashboard → Export.

---

## 5. AI features

The app includes an AI suggestions widget powered by the Cloudflare Worker proxy:

- **Seating suggestions** — flags potential table conflicts.
- **Budget nudges** — alerts when outstanding vendor payments approach the deadline.
- **RSVP follow-up** — suggests which guests haven't responded after N days.

Configure the AI proxy URL in Settings → AI Proxy. See
[CF Proxy Setup](../operations/cf-proxy-setup.md) for deployment.

---

## 6. Registry management

1. **Registry** section — add gift links from any store.
2. The app auto-detects the store and shows a badge (Amazon, IKEA, etc.).
3. Set an **affiliate tag** in the toolbar — appended to all deep-links automatically.
4. Use the **Copy deep-link** button to get a direct product URL (with tag applied).
5. Share the registry page URL from Settings → Event details.

---

## 7. Plugins

1. **Settings → Plugins** — browse installed plugins with risk badges.
2. Risk levels: Safe / Low / Medium / High — based on declared permissions.
3. Dangerous permissions are highlighted in red.
4. Disable or uninstall plugins without affecting core features.

---

## 8. Recommended planner checklist (per event)

| # | Task | When |
| - | ---- | ---- |
| 1 | Create event, set date + venue | Day 0 |
| 2 | Import guest list CSV | Week 1 |
| 3 | Send WhatsApp invites (batch 50) | Week 2 |
| 4 | Add all vendors + contract amounts | Week 2 |
| 5 | Assign tables — rough draft | Week 4 |
| 6 | Record first vendor payment | On payment |
| 7 | Finalize seating — AI review | 2 weeks before |
| 8 | Print floor plan SVG | 1 week before |
| 9 | Day-of: check-in tablet mode | Wedding day |
| 10 | Export archive + hand off | Day after |

---

## See also

- [Couple's Guide](couple-guide.md)
- [Vendor Guide](vendor-guide.md)
- [Operations runbooks](../operations/)
- [ROADMAP — Phase D](../../ROADMAP.md)
