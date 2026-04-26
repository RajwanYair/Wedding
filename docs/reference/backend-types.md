# Reference — `BACKEND_TYPE` Values

> **Diátaxis quadrant**: reference. **Source of truth**:
> [`src/core/config.js`](../../src/core/config.js).

`BACKEND_TYPE` selects the runtime persistence backend. This page
catalogues every supported value, its lifecycle status, and the
dispatch chain used by `services/backend.js`.

> **Migration owner**: [ADR-027](../adr/027-supabase-single-backend.md).

## Values

| Value | Status (v11.10.0) | Default for new installs | Removed in |
| --- | --- | --- | --- |
| `"supabase"` | ✅ Active | v11.11.x | — |
| `"sheets"` | 🟡 Legacy | (until v11.11.x) | v12.0.0 |
| `"memory"` | 🧪 Test-only | n/a | n/a |

### `"supabase"` — production

- **Storage**: Supabase Postgres.
- **Auth**: Supabase Auth (Google/Facebook/Apple OIDC + magic link).
- **Realtime**: Supabase Realtime (presence + broadcast).
- **RLS**: enabled on every domain table; `event_id` scoping enforced
  server-side.
- **Edge functions**: WABA proxy, push send, GDPR erasure, RSVP webhook.
- **Use when**: production. Default from v11.11.x onward.

### `"sheets"` — legacy

- **Storage**: Google Sheets API.
- **Auth**: separate Google OAuth flow.
- **Realtime**: none (polling).
- **RLS**: none (sheet share semantics only).
- **Edge functions**: none.
- **Use when**: legacy installs. Marked **Legacy** in Settings →
  Backend selector from v11.11.x; removed entirely in v12.0.0.

After v12.0.0 the Sheets surface persists only as **import/export
scripts**:

```bash
npm run sheets:import -- --url <google-sheet-url>
node scripts/sheets-export.mjs --event-id <id> --out events.csv
```

### `"memory"` — test-only

- **Storage**: in-process Map; lost on reload.
- **Auth**: bypassed (anonymous).
- **Use when**: Vitest unit tests, Playwright fixtures with
  `BACKEND_TYPE=memory`.
- Never exposed in the Settings UI.

## Dispatch chain

```text
Section
  └─→ Handler (action-registry → events.js)
        └─→ Repository (src/repositories/<domain>.js)
              └─→ services/backend.js
                    ├── supabase.upsert(domain, value)
                    ├── sheets.append(domain, value)        // legacy
                    └── inMemory.set(domain, value)         // tests
```

`services/backend.js` is the only module allowed to branch on
`BACKEND_TYPE`. Repository code is backend-agnostic.

## How to change the value

| Audience | Path |
| --- | --- |
| Developer (build-time default) | Edit `BACKEND_TYPE` in `src/core/config.js` |
| User (runtime override) | Settings → Backend selector → "Supabase" / "Sheets" |
| Test runner | Set `process.env.BACKEND_TYPE = "memory"` before importing |

The runtime override is persisted in `localStorage.backendType` and
takes precedence over the build-time constant
(`src/core/app-config.js#resolveBackendType`).

## Removal timeline

| Release | Action |
| --- | --- |
| v11.11.x | Default flips to `"supabase"`; "Sheets" marked Legacy |
| v11.12.x | One-shot Sheets → Supabase migration banner |
| v12.0.0 | `"sheets"` value removed; selector hidden |
| v13.0.0 | `BACKEND_TYPE` constant deleted; repositories assume Supabase |

## See also

- [ADR-027 — Supabase as single runtime backend](../adr/027-supabase-single-backend.md)
- [Integration guide — Supabase](../integrations/supabase.md)
- [`src/services/backend.js`](../../src/services/backend.js)
