# ADR-010: A/B Testing Strategy

**Status:** Accepted
**Date:** 2025-01-01
**Deciders:** Engineering Team

## Context

The Wedding Manager needs a lightweight mechanism to roll out features progressively and validate UI experiments (e.g., new RSVP flows, theme variants) without deploying separate builds.

## Decision

Implement client-side deterministic A/B assignment using a djb2 hash of `experiment:subject`.
No external SDK or server call is required. Assignment is sticky per session (same input = same output).
Feature flags (`feature-flags.js`) gate released features; the A/B utility (`ab-test.js`) governs
experiment exposure.

## Consequences

**Positive:**

- Zero runtime dependencies, consistent with ADR-001.
- Reproducible: same subject always receives the same variant.
- Testable: pure functions with no side effects.

**Negative:**

- No real-time operator control (change requires a code deploy).
- No server-side event collection — analytics must be wired separately.

## Alternatives Considered

| Option | Reason rejected |
|--------|----------------|
| LaunchDarkly / Statsig SDK | Vendor lock-in, runtime dependency, cost |
| Random assignment per visit | Not sticky, breaks UX consistency |
