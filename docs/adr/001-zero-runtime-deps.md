# ADR-001: Zero Runtime Dependencies

**Status:** Accepted  
**Date:** 2025-01-15  
**Context:** Wedding Manager v5

## Decision

The application uses zero runtime dependencies. All code is vanilla HTML, CSS, and ES modules.
DevDependencies (ESLint, Stylelint, Vitest, Playwright, Vite) are used for tooling only.

## Rationale

- No supply-chain risk — no `node_modules` shipped to users
- Minimal bundle size (~30 KB gzip)
- Full control over behavior — no framework abstractions to debug
- Long-term maintainability — no breaking changes from upstream deps
- Educational value — demonstrates modern web platform capabilities

## Consequences

- More boilerplate for common patterns (DOM manipulation, state management)
- Must implement utilities that frameworks provide (routing, reactivity, i18n)
- Testing relies on Vitest + happy-dom rather than framework-specific tools

## Alternatives Considered

- **React/Vue/Svelte** — rejected due to bundle bloat and complexity for a single-page wedding app
- **Lit** — considered but rejected to maintain zero-deps principle
