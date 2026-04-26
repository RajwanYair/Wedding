# Reference — Storage Keys

> **Audience**: developers debugging persistence, planning migrations, or
> implementing GDPR erasure. **Diátaxis**: _information-oriented_ — facts
> only, no narrative.

All Wedding Manager data persists in `localStorage` under the
`wedding_v1_` prefix. The canonical source is
[`src/core/constants.js`](../../src/core/constants.js) — this page is a
human-readable mirror.

> **Schema bump policy**: any breaking change to a value's shape requires
> bumping the prefix to `wedding_v2_` and writing a migration in
> `scripts/` (see [ADR-009](../adr/009-optimistic-updates.md) and the ops
> [migrations runbook](../operations/migrations.md)).

## Categories

| Category | Purpose | Cleared on logout? |
| --- | --- | --- |
| Domain data | Guests, tables, vendors, expenses, timeline | No (admin manages) |
| Auth | Supabase session, OAuth tokens | Yes |
| User preferences | Theme, language, color scheme | No |
| Diagnostics | Error queue, session id, sync state | No |
| Integrations | WhatsApp, Sheets, Push subscription | Partial (see entry) |

## Key catalogue

### Domain (store-driven)

These keys are owned by [`store.js`](../../src/core/store.js) — _never_
write to them directly. Use `storeSet(domain, value)` instead.

| Key | Domain | Type |
| --- | --- | --- |
| `wedding_v1_guests` | guests | `Guest[]` |
| `wedding_v1_tables` | tables | `Table[]` |
| `wedding_v1_vendors` | vendors | `Vendor[]` |
| `wedding_v1_expenses` | expenses | `Expense[]` |
| `wedding_v1_timeline` | timeline | `TimelineItem[]` |
| `wedding_v1_settings` | settings | `Settings` |
| `wedding_v1_messageTemplates` | message templates | `Template[]` |
| `wedding_v1_rsvpLog` | RSVP audit log | `RsvpLogEntry[]` |

> Concrete shapes live in [`src/types.d.ts`](../../src/types.d.ts).

### Auth & session

| Key | Purpose |
| --- | --- |
| `wedding_v1_supabase_session` | Supabase JWT bundle |
| `wedding_v1_supabase_auth` | OAuth provider state |
| `wedding_v1_revoked_tokens` | Server-revoked guest tokens (offline cache) |

### User preferences

| Key | Purpose |
| --- | --- |
| `wedding_v1_theme` | Active theme slug (`rosegold`, `gold`, …) |
| `wedding_v1_lightMode` | `light` / `dark` / `auto` |
| `wedding_v1_colorScheme` | OS-level scheme override |
| `wedding_v1_lastSeenVersion` | "What's new" banner gate |

### Diagnostics

| Key | Purpose |
| --- | --- |
| `wedding_v1_errors` | Buffered error queue (offline) |
| `wedding_v1_error_session_id` | Stable session id for grouping |
| `wedding_v1_idb_migrated` | One-shot IndexedDB migration flag |

### Integrations

| Key | Purpose |
| --- | --- |
| `wedding_v1_sheets_mirror` | Last-known Google Sheets snapshot |
| `wedding_v1_greenApiInstanceId` | WhatsApp Green API id |
| `wedding_v1_greenApiToken` | WhatsApp Green API token |
| `wedding_v1_wa_phone_number_id` | WhatsApp Business phone id |
| `wedding_v1_reminderQueue` | Pending guest reminder messages |
| `wedding_v1_push_sub` | Web Push subscription cache |
| `wedding_v1_install_dismissed_until` | PWA install banner suppress date |
| `wedding_v1_runtime_cfg` | Runtime feature-flag overrides |

## Reading & writing

```js
import { storeGet, storeSet } from "src/core/store.js";

const guests = storeGet("guests"); // never read localStorage directly
storeSet("guests", [...guests, newGuest]); // triggers subscribers + sync
```

For non-domain keys (preferences, diagnostics) use the helpers in
[`src/core/storage.js`](../../src/core/storage.js).

## GDPR erasure

The "Forget me" workflow ([ADR-008](../adr/008-pii-classification.md))
must remove every key in the **Domain** and **Auth** categories. Keys in
the **User preferences** category are anonymous and may be retained.

## See also

- [ADR-007 — event scoping](../adr/007-event-scoping.md)
- [ADR-008 — PII classification](../adr/008-pii-classification.md)
- [ADR-023 — org/team scoping](../adr/023-org-team-scoping.md) (proposes
  per-org namespace prefixes in v14)
