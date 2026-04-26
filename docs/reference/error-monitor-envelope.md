# Reference: Error monitor envelope v1

> Diátaxis: reference. For the design rationale see
> [ADR-028](../adr/028-error-monitor.md). For the migration plan see
> [ADR-032](../adr/032-console-error-migration.md).

The error monitor (`src/services/error-monitor.js`) accepts errors via
`reportError(err, context)` and produces a stable envelope for downstream
sinks. This page documents envelope v1 exhaustively.

## Surface

```js
import { reportError } from "../services/error-monitor.js";

reportError(err, {
  source: "guests-section",
  op: "import-csv",
  // …additional context (see below)
});
```

`reportError` is synchronous and returns the envelope it produced. It never
throws; failures inside the monitor are routed to the allowlisted
`console.error` fallback (ADR-032).

## Envelope v1 schema

```ts
interface ErrorEnvelopeV1 {
  v: 1;                          // schema version
  id: string;                    // ULID-like, monotonic per session
  ts: number;                    // epoch ms (Date.now())
  level: "error" | "warn";       // currently always "error"
  msg: string;                   // err.message, truncated to 500 chars
  name: string;                  // err.name (e.g. "TypeError")
  stack: string | null;          // sanitized; absolute paths stripped
  source: string;                // required; module slug, kebab-case
  op: string;                    // required; verb, kebab-case
  context: Record<string, JSONValue>; // optional caller-supplied
  app: {
    version: string;             // package.json version at build time
    locale: string;              // active i18n locale
    online: boolean;             // navigator.onLine
  };
  user: {
    id: string | null;           // hashed; null for guests
    role: "admin" | "guest";
  };
}
```

### Field rules

| Field        | Required | Constraints                                                     |
| ------------ | -------- | --------------------------------------------------------------- |
| `v`          | yes      | always literal `1`                                              |
| `id`         | yes      | unique per envelope; sortable                                   |
| `ts`         | yes      | UTC epoch ms                                                    |
| `msg`        | yes      | max 500 chars; PII-stripped via `sanitize()`                    |
| `stack`      | no       | absolute paths replaced with `<src>/…`; max 4 KB                |
| `source`     | yes      | `[a-z][a-z0-9-]*`; matches the module name                      |
| `op`         | yes      | kebab-case verb (e.g. `import-csv`, `save-rsvp`)                |
| `context`    | no       | JSON-serializable; values >1 KB are truncated with `…`          |
| `app.locale` | yes      | BCP-47 (`he`, `en`, `ar`, `ru`)                                 |
| `user.id`    | no       | SHA-256 hex of email; never the email itself                    |

### PII guarantees

- `msg` and `stack` pass through `redactPII()` which strips email-like and
  phone-like substrings.
- `context` values are NOT redacted automatically; callers are responsible.
- `user.id` is always hashed; the raw email is never serialized.

## Sinks

The monitor fans out to all registered sinks in order. A sink failure is
caught and logged via the fallback path; it does not block other sinks.

| Sink           | When                                | Default |
| -------------- | ----------------------------------- | ------- |
| `console`      | dev only (`import.meta.env.DEV`)    | on      |
| `localStorage` | always; ring buffer of last 50      | on      |
| `supabase`     | when `services/supabase` is wired   | off     |

Add a sink with `addSink(fn)` where `fn(envelope) → void | Promise<void>`.

## Reading from the ring buffer

```js
import { getRecentErrors } from "../services/error-monitor.js";

const recent = getRecentErrors(); // ErrorEnvelopeV1[], up to 50, newest first
```

Used by the diagnostics modal in Settings.

## Versioning

Envelope v1 is frozen. Breaking shape changes ship a new ADR and bump `v`
to `2`; sinks must accept both during the transition window.
