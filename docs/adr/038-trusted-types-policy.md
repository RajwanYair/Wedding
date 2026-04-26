# ADR-038 — Trusted Types policy in production CSP

- Status: Proposed
- Date: 2026-04
- Related: ROADMAP §3.5, ADR-008 (PII classification)

## Context

The app's primary defence against XSS is "no `innerHTML` with unsanitized
data". This is enforced by code review and a security scan
(`scripts/security-scan.mjs`). Both are *advisory*: a careless `el.innerHTML
= userInput` can ship.

Modern browsers offer **Trusted Types**, a CSP-driven contract that
forbids string-to-DOM sinks unless the string passes through a registered
policy. With Trusted Types active, `el.innerHTML = "<b>x</b>"` throws at
runtime; only `el.innerHTML = policy.createHTML("<b>x</b>")` is allowed.

This makes the existing rule structurally enforced instead of
human-enforced.

## Decision

Adopt a single Trusted Types policy named `wedding-sanitizer` that wraps
DOMPurify, and ship it under a strict production CSP.

### Policy

```js
// src/services/trusted-types.js (new)
if (window.trustedTypes?.createPolicy) {
  window.trustedTypes.createPolicy("wedding-sanitizer", {
    createHTML: (input) => DOMPurify.sanitize(input),
    createScript: () => { throw new Error("createScript blocked"); },
    createScriptURL: () => { throw new Error("createScriptURL blocked"); },
  });
}
```

### CSP

Add to `public/_headers` (Cloudflare) and the `<meta http-equiv>` we
ship in `index.html`:

```
Content-Security-Policy: …existing… ;
  require-trusted-types-for 'script';
  trusted-types wedding-sanitizer dompurify;
```

The `dompurify` policy slot is required because DOMPurify itself
registers a policy of that name when running under Trusted Types.

### Phasing

| Phase | Scope                                              | Gate                   |
| ----- | -------------------------------------------------- | ---------------------- |
| TT0   | This ADR + `audit:trusted-types` advisory          | advisory               |
| TT1   | Ship `trusted-types.js` policy module              | advisory; CSP-Report-Only |
| TT2   | Migrate every `innerHTML` to the policy            | advisory               |
| TT3   | Flip CSP from `Report-Only` to enforced            | enforce                |

## Consequences

Positive:

- XSS-via-innerHTML becomes a runtime crash, not a silent compromise.
- Catches third-party regressions (e.g. a DOMPurify upgrade that misses
  a sink).
- Aligns with the project's "secure-by-construction" posture.

Negative:

- Browsers without Trusted Types (Safari at the time of writing) skip
  the contract entirely — we still depend on the no-innerHTML rule
  there. Rule of thumb: belt **and** braces.
- One more global to feature-detect.

## Non-goals

- Replacing DOMPurify. The policy delegates to it; DOMPurify stays the
  sanitizer.
- Adding policies for inline event handlers (`on*=` attributes) — we
  already forbid them via CSP `script-src 'self'`.

## Rollout

- This release ships the ADR + the `audit:trusted-types` advisory.
- TT1–TT3 land one phase per release.
