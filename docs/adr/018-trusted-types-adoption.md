# ADR-018 — Trusted Types Adoption Plan

> **Status:** Proposed · **Date:** 2026-04-29 · **Owners:** Security + Wedding-Designer · **Related:** ROADMAP §3.5 (CSP + Trusted Types), §4 P0 PII risks

## Context

The codebase already enforces `textContent`-only (lint rule + `audit:security` script
banning `innerHTML` with unsanitized data) and uses DOMPurify at every external boundary.
However, the runtime still allows DOM sinks (e.g. `Element.innerHTML`,
`Element.outerHTML`, `Document.write`) at the platform level. A single regression — a
new contributor importing a library that injects HTML — would bypass our static checks.

[Trusted Types](https://www.w3.org/TR/trusted-types/) lets the browser refuse any
unsanitized assignment to a DOM sink, providing a runtime backstop that complements
our static rules.

## Decision (Plan, not yet shipping)

Adopt Trusted Types in **three phases** over v11.7.0 → v12.1.0:

### Phase 1 — Report-only (target: v11.7.x)

- Inject the following CSP header (via `public/_headers` for GH Pages preview, and via
  the GitHub Pages `Pages-Headers` file once supported, or a Cloudflare worker if/when
  we front the domain):
  ```text
  Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; trusted-types default 'none'; report-uri /trusted-types-report
  ```
- Add an `npm run audit:trusted-types` script that greps for known sinks (`innerHTML`,
  `outerHTML`, `document.write`, `setAttribute('on...'`, `<script>` injection,
  `eval`-shaped APIs) and emits a report. Initially advisory in CI.
- Track violations through the existing monitoring breadcrumb buffer
  (`services/monitoring.js`).

### Phase 2 — Single trusted policy (target: v12.0.0)

- Introduce a single named policy `wedding-html` in `src/utils/sanitize.js` that wraps
  DOMPurify:
  ```js
  // src/utils/sanitize.js (sketch)
  const policy =
    typeof window !== "undefined" && window.trustedTypes?.createPolicy
      ? window.trustedTypes.createPolicy("wedding-html", {
          createHTML: (input) => DOMPurify.sanitize(input, baseConfig),
        })
      : null;
  export const trustedHtml = (input) =>
    policy ? policy.createHTML(input) : DOMPurify.sanitize(input, baseConfig);
  ```
- All callers that *must* set HTML (today already routed through `sanitize()`) move to
  `trustedHtml()` so the policy covers them.

### Phase 3 — Enforce (target: v12.1.0)

- Promote header to enforcing: `require-trusted-types-for 'script'; trusted-types
  wedding-html`.
- Lint rule (`eslint-plugin-security` or a custom rule) blocks any new `innerHTML`
  assignment outside `src/utils/sanitize.js`.

## Consequences

- A second runtime defence beyond static lint rules; one DOM-sink regression no longer
  becomes an XSS.
- `trustedHtml()` is the only authorised path for HTML strings → easier code review.
- One named policy keeps the surface auditable; allowing arbitrary policy creation is
  rejected.
- Tests need a `trustedTypes` shim (or feature-detect skip) under happy-dom; we add it
  to `tests/test-constants.mjs`.

## Alternatives Considered

- **Status quo (lint + DOMPurify only):** insufficient for a runtime backstop.
- **Multiple named policies:** harder to audit; rejected.
- **CSP `script-src` only:** does not cover DOM-sink injection from same-origin code.
