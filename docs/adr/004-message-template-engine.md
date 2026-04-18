# ADR-004: Message Template Engine Design

**Status:** Accepted
**Date:** 2025-06-15
**Context:** Wedding Manager v6.5.0 — Sprint 41

## Problem

The app needs to send personalised WhatsApp, SMS, and email messages to guests.
Messages reference guest fields (name, table, meal preference) and vary by language.
A minimal, zero-runtime-dep solution is needed that supports:

- Variable interpolation (`{{firstName}}`, `{{tableName}}`)
- Conditional blocks (`{{#if tableId}}...{{/if}}`)
- A registry of named Hebrew built-in templates
- Extensibility — custom templates registered at runtime

## Decision

Implement `src/utils/message-templates.js` as a **Mustache-inspired micro-template engine** using regex-based interpolation.

### Key choices

| Aspect | Decision | Rationale |
|---|---|---|
| Syntax | `{{varName}}` interpolation; `{{#if var}}...{{/if}}` blocks | Familiar to devs; easy to author in JSON i18n strings |
| Escaping | Nothing — values are treated as plain text for WhatsApp/SMS | No HTML context; XSS risk is N/A for chat messages |
| Missing vars | Replaced with empty string (not an error) | Graceful degradation to readable message |
| Conditionals | Only `{{#if var}}` (no else, no nested) | YAGNI — wedding messages are simple |
| Registry | Module-level `Map`; pre-seeded with 5 Hebrew templates | Fast lookup; overridable without patching source |

### Built-in templates

- `rsvpConfirm` — confirmation message with guest name + table
- `rsvpDecline` — polite decline acknowledgement
- `rsvpReminder` — reminder with event date fallback
- `tableAssigned` — table assignment notification
- `generalInfo` — flexible catch-all template

## Consequences

**Positive:**
- Zero runtime deps maintained
- Templates are unit-testable strings
- Human-editable in i18n files or Settings UI

**Negative:**
- No loops, partials, or HTML escaping — advanced use cases not supported
- Template syntax not validated at registration time

## Alternatives Considered

- **Handlebars.js** — rich syntax; rejected (runtime dep + overkill for SMS/WA)
- **Template literals in code** — inflexible, no registry, cannot be user-edited
- **i18n interpolation only** — can't handle conditional blocks
