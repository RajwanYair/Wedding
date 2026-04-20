# ADR-012: Event Bus for Cross-Module Communication

**Status:** Accepted
**Date:** 2025-01-01
**Deciders:** Engineering Team

## Context

Modules in different domains (sections, services, plugins) occasionally need to communicate events without explicit coupling. The current pattern of `data-action` DOM delegation is excellent for user interactions but is awkward for programmatic in-memory signalling (e.g., "a new guest was added", "sync completed").

## Decision

Introduce a singleton in-process event bus (`src/utils/event-bus.js`) exposing `on`, `once`, `off`, `emit`, `clearAll`, and `activeEvents`. The bus is a simple `Map<string, Set<handler>>` — no external library.

Rules for use:

- Use `data-action` for user-initiated DOM events (existing pattern, unchanged).
- Use the event bus only for programmatic module-to-module notifications.
- The store (`store.js`) remains the single source of truth for state; the bus carries signals, not data.

## Consequences

**Positive:**

- Decouples emitter and subscriber modules.
- Errors in one handler are caught and do not propagate to other handlers.
- `clearAll()` provides easy test isolation.

**Negative:**

- Two event systems now coexist; developers must choose deliberately.
- No persistent history — late subscribers miss past events.

## Alternatives Considered

| Option | Reason rejected |
|--------|----------------|
| Custom DOM `CustomEvent` dispatch | Requires DOM access in non-browser contexts |
| RxJS / EventEmitter | Runtime dependency |
| Extend store subscriptions | Store events are key-scoped; general signals don't map cleanly to store keys |
