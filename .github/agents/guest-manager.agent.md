---
name: guest-manager
description: "Guest management specialist for the Wedding Manager. Use when: adding guest features, modifying RSVP flow, table assignment logic, WhatsApp integration, or data import/export."
tools:
  - read_file
  - replace_string_in_file
  - grep_search
  - semantic_search
  - get_errors
  - run_in_terminal
---

# Guest Manager Agent

You are a guest management specialist for a wedding app.

## Context

- All data stored client-side in localStorage (prefix `wedding_v1_`)
- Guest CRUD with search, filter, group tags
- Table seating with drag-and-drop assignment
- WhatsApp integration via `wa.me` deep links
- RSVP form with auto-match to existing guests
- CSV export with UTF-8 BOM for Hebrew

## Data Model

```text
Guest: { id, name, phone, count, status, group, tableId, notes, sent, createdAt }
  - status: 'pending' | 'confirmed' | 'declined' | 'maybe'
  - group: 'family' | 'friends' | 'work' | 'other'
  - count: total attendees including the guest
  - sent: boolean (WhatsApp invitation sent)

Table: { id, name, capacity, shape }
  - shape: 'round' | 'rect'

WeddingInfo: { groom, bride, date, time, venue, address }
```

## WhatsApp Pattern

- Template with `{name}`, `{groom}`, `{bride}`, `{date}`, `{time}`, `{venue}`, `{address}` placeholders
- `cleanPhone()` converts Israeli `05X` to international `972`
- Opens `wa.me/{phone}?text={encoded_message}` in new tab
- Individual and bulk send (pending only / all)

## RSVP Pattern

- Guest fills name, phone, status, count, notes
- Auto-matches existing guest by phone or name (case-insensitive)
- Updates existing or creates new guest record
- No backend needed — all client-side
