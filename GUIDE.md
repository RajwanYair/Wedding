# Wedding Manager — User Guide

> Version 3.8.0 · Hebrew RTL · English toggle · RSVP · Tables · WhatsApp · Google Sheets sync

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Managing Guests](#managing-guests)
4. [Table Seating](#table-seating)
5. [RSVP Flow](#rsvp-flow)
6. [WhatsApp Messages](#whatsapp-messages)
7. [Vendors & Budget](#vendors--budget)
8. [Analytics](#analytics)
9. [Gallery](#gallery)
10. [Timeline & Checklist](#timeline--checklist)
11. [Settings](#settings)
12. [Offline Mode](#offline-mode)
13. [Admin Login](#admin-login)
14. [Troubleshooting](#troubleshooting)

---

## Getting Started

Open the app at **<https://rajwanyair.github.io/Wedding>** on any device (desktop or mobile).

- **Guests** see the RSVP landing page and can submit their attendance.
- **Admins** sign in (top-right corner ◾) to manage the full app.

No installation needed — the app works in any modern browser and runs offline once loaded.

---

## Dashboard

The **Dashboard** is the first tab after login. It shows:

| Card            | What it shows                                  |
| --------------- | ---------------------------------------------- |
| **Countdown**   | Days remaining until the wedding               |
| **Confirmed**   | Guests who replied YES                         |
| **Pending**     | Guests who haven't RSVPed yet                  |
| **Declined**    | Guests who replied NO                          |
| **Total seats** | Sum of `count + children` for confirmed guests |

Stats animate on scroll (S2.6). Click any stat card to jump to the Guests list filtered to that status.

---

## Managing Guests

### Add a guest

1. Click **הוסף אורח / Add Guest** (+ button).
2. Fill in First name, Last name, Phone, and Group.
3. Set expected attendance count (adults + children).
4. Click **שמור / Save**.

### Edit or delete

- Click the **edit** icon (✏️) on any guest row.
- Click the **delete** icon (🗑️) — you will be asked to confirm.

### Filter & sort

Use the filter bar above the guest list:

- **Status**: All · Confirmed · Pending · Declined · Maybe
- **Side**: Groom / Bride / Mutual
- **Group**: Family · Friends · Work · Other
- **Search**: Free-text search across name + phone

Click any column header to sort. Click again to reverse.

### Export

Click **ייצוא / Export** to download a CSV file of the current filtered list.

### Sync indicator

A subtle **amber border** on a guest row means the guest data is saved locally but not yet synced to Google Sheets. It clears automatically once sync completes.

---

## Table Seating

### Create a table

1. Go to the **Tables** tab.
2. Click **הוסף שולחן / Add Table**.
3. Set name, capacity, and shape (round / rectangular).

### Assign guests

- Drag a guest card and drop it on a table, or
- Click **שבץ אוטומטית / Auto-assign** to let the app assign all unassigned confirmed guests by group priority.

### View occupancy

Each table card shows: name · capacity · current fill · guests by group.

---

## RSVP Flow

### For guests (no login required)

1. Open the app link sent to you.
2. Enter your **phone number** — the app will find your invitation record.
3. Confirm or decline, select meal preference, add a note.
4. Submit — you'll see a confirmation screen.

### Phone-first lookup

The RSVP form uses phone-first lookup (`lookupRsvpByPhone`): entering your number pre-fills the form if you're already in the guest list. If not found, a blank form is offered.

### QR code

Generate a personal QR code from the Invitation tab and embed it in printed invitations or WhatsApp messages.

---

## WhatsApp Messages

1. Go to **Guests** tab.
2. Select one or more guests (checkbox column), or use **Select All**.
3. Click **WhatsApp** (💬 icon) to compose a message.
4. The app opens `wa.me/` links with pre-filled text in your phone's WhatsApp.

Phone numbers are automatically converted to international format (`+972…`).

---

## Vendors & Budget

### Add a vendor

1. Go to the **Vendors** tab.
2. Click **הוסף ספק / Add Vendor**.
3. Fill in category, name, contact, price, and amount paid.

### Budget view

The **Budget** tab shows:

- Total contracted cost
- Amount paid so far
- Remaining balance
- Category breakdown bar chart

### Expenses

Log ad-hoc expenses in the **Expenses** tab (separate from vendors).

---

## Analytics

The **Analytics** tab renders:

- **Guest status donut** — Confirmed / Pending / Declined / Maybe
- **Side bar chart** — Groom side vs Bride side vs Mutual
- **Group bar chart** — Family · Friends · Work · Other
- **Meal preference breakdown**
- **RSVP timeline** — response rate over time

Charts are drawn in SVG with no external dependencies.

---

## Gallery

Upload and preview wedding photos in the **Gallery** tab. Images are stored locally in the browser (localStorage, Base64). Use the **delete** button to remove items.

> **Tip**: For large galleries, use a cloud storage service and link URLs instead of embedding files.

---

## Timeline & Checklist

The **Timeline** tab provides a pre-built wedding planning checklist sorted by months before the event. Check items off as you complete them — progress is saved automatically.

---

## Settings

| Setting                 | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| **Wedding date**        | Used in the countdown and timeline                        |
| **Bride / Groom names** | Shown in the dashboard header                             |
| **Language**            | Hebrew (default) or English                               |
| **Theme**               | Purple (default) · Rose Gold · Gold · Emerald · Royal     |
| **Google Sheets sync**  | Enter your Apps Script Web App URL to enable two-way sync |
| **User Access**         | Add or remove admin email addresses                       |
| **Notification push**   | Subscribe to browser push notifications                   |

Changes are saved immediately.

---

## Offline Mode

The app works fully offline:

- All data is stored in the browser's `localStorage`.
- If you submit an RSVP or contact form while offline, it is queued and sent automatically when the connection restores (up to **5 retries** with exponential backoff).
- An **offline badge** (📵) appears in the top bar when you're disconnected, with a count of queued items.

---

## Admin Login

Admins can sign in via:

| Method              | How                                                   |
| ------------------- | ----------------------------------------------------- |
| **Google**          | Click "Sign in with Google"                           |
| **Facebook**        | Click "Sign in with Facebook"                         |
| **Apple**           | Click "Sign in with Apple"                            |
| **Email allowlist** | Enter an email pre-approved in Settings → User Access |

After login, the email is checked against the **admin allowlist** — unapproved emails are rejected even after successful OAuth.

Anonymous / guest users can access RSVP only.

---

## Troubleshooting

| Problem                    | Fix                                                                           |
| -------------------------- | ----------------------------------------------------------------------------- |
| App not loading            | Hard-refresh: Ctrl+Shift+R (Win) / Cmd+Shift+R (Mac)                          |
| Data missing after refresh | Check that localStorage is not in private/incognito mode                      |
| Sheets sync not working    | Verify `SHEETS_WEBAPP_URL` in Settings is the correct Apps Script URL         |
| WhatsApp link not opening  | Ensure the phone is connected to WhatsApp and the number is in `+972…` format |
| RSVP form not pre-filling  | Phone must match exactly (with or without leading 0 — both work)              |
| Amber border on guest row  | Data is pending Google Sheets sync — wait a few seconds                       |
| Offline badge shows (⏳)   | Queued items will sync automatically when back online                         |

---

_Made with ❤️ for the big day._
