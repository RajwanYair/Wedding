# Supabase Integration Guide

> **Wedding Manager** — Supabase backend setup and usage

## Overview

Supabase provides optional persistence, real-time sync, and auth for Wedding Manager. The app is fully functional without it (all data stored in `localStorage`). When Supabase is configured, data syncs bidirectionally with the cloud database.

---

## Architecture

```
Browser (localStorage)
       ↕  enqueueWrite / sheets-impl
   sheets.js (write queue)
       ↕
  sheets-impl.js
       ↕  REST API
    Supabase PostgREST
       ↕
   PostgreSQL tables
```

Data flow:
1. All reads come from the **reactive store** (localStorage-backed)
2. All writes go through `enqueueWrite(key, fn)` — debounced, deduped
3. `sheets-impl.js` calls Supabase REST API to sync changes
4. Real-time subscriptions via `presence.js` broadcast updates to other tabs/devices

---

## Setup

### 1. Create a Supabase project

1. Go to [app.supabase.com](https://app.supabase.com) → New Project
2. Note your project URL and anon key

### 2. Apply migrations

Apply all SQL files in `supabase/migrations/` in order (see [migrations.md](migrations.md)).

### 3. Configure GitHub Secrets

Add to your repository secrets (Settings → Secrets → Actions):

```
VITE_SUPABASE_URL       = https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY  = eyJ...
```

### 4. Configure in-app settings

In the deployed app → Settings section:
- Paste your Supabase URL and anon key
- These are stored in `localStorage` and used at runtime

---

## Row Level Security (RLS)

RLS is enabled on all tables. Policies (migration 002):

| Table | Anon | Authenticated |
|-------|------|---------------|
| guests | SELECT | SELECT, INSERT, UPDATE, DELETE |
| tables | SELECT | SELECT, INSERT, UPDATE, DELETE |
| vendors | — | SELECT, INSERT, UPDATE, DELETE |
| expenses | — | SELECT, INSERT, UPDATE, DELETE |
| rsvp_log | INSERT | SELECT, INSERT |
| config | SELECT | SELECT, UPDATE |
| gallery | SELECT | SELECT, INSERT, DELETE |
| contacts | — | INSERT (contact collector) |

Guest users (anonymous) can:
- Read public wedding info (config)
- Submit RSVP entries (rsvp_log insert)
- View gallery

Admin users (email allowlist) can do everything.

---

## Write Queue

Never call Supabase directly from section code. Always use the write queue:

```js
import { enqueueWrite } from "../services/sheets.js";

// ✅ Correct — debounced, fault-tolerant
enqueueWrite("guests", async () => { /* sync logic */ });

// ❌ Wrong — bypasses queue, no retry, no dedup
await supabaseFetch("/guests", { method: "PATCH", ... });
```

The queue:
- Debounces writes per key (300ms default)
- Retries up to 3× on network failure
- Falls back gracefully if Supabase is unreachable
- Stores pending writes in `offline-queue.js` for later flush

---

## Real-time Presence

`presence.js` uses Supabase Realtime channels to broadcast the active user count and push live updates across browser tabs. It does **not** sync guest data in real-time (that goes through the write queue).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Supabase not configured" in console | Set URL+key in Settings |
| Data not persisting across devices | Check anon key hasn't expired |
| RLS blocking guest RSVP | Verify migration 002 applied |
| Writes queued but never flushed | Check `wedding_v1_offline_queue` in localStorage |
