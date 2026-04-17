# ADR 008 — PII Classification Policy

**Status**: Accepted  
**Date**: 2025  
**Deciders**: Core team

## Context

The Wedding Manager collects personally identifiable information (PII) for
every guest: full name, phone number, email, dietary notes, accessibility
needs, and gift information.  Israeli Privacy Protection Law (5741-1981) and
GDPR (for EU guests) require that PII can be erased on request, that access
is logged, and that PII is not stored longer than necessary.

## Decision

We define a canonical list of PII columns in `src/services/gdpr-erasure.js`:

```js
export const PII_COLUMNS = [
  "first_name", "last_name", "phone", "email",
  "notes", "meal_notes", "accessibility", "gift",
];
```

Erasure (`eraseGuest`) sets every PII column to `NULL` and records the
operation in an `erasure_log` table.  The guest record skeleton (id, rsvp
status, table assignment, timestamps) is **retained** for statistical
integrity and audit trails.

Fields **not** classified as PII (and therefore retained after erasure):
`id · status · side · group · meal · count · table_id · created_at ·
updated_at · erased_at · event_id`

### Encryption at rest

For high-sensitivity fields (`phone`, `email`) stored in edge logs, we use
AES-GCM field-level encryption (`src/services/crypto.js`) with a per-event
key stored in Supabase Vault.  The guests table itself relies on Supabase's
transparent storage encryption (AES-256).

### Access logging

All admin reads of the guest list are logged via `createAuditPipeline`
(Sprint 88).  `guest.erase` is classified as `HIGH_SEVERITY` and triggers
an immediate flush to the audit log.

## Consequences

**Positive:**
- Clear, code-enforced definition of PII prevents accidental omissions.
- Single function to erase PII simplifies compliance requests.
- Non-PII fields retained enables ongoing analytics without re-identifying
  the erased guest.

**Negative:**
- We must keep `PII_COLUMNS` in sync with database schema — a migration that
  adds a new PII column must also update the constant.
- Field-level encryption adds latency (~1 ms per field) and requires key
  management.

## Alternatives Considered

| Option | Reason rejected |
|--------|-----------------|
| Delete the entire guest row | Breaks referential integrity; no audit trail |
| Anonymise (replace with placeholder) | More complex; placeholders could leak structure |
| Encrypt all fields | Breaks full-text search; significant key management overhead |
