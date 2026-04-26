# Explanation: CSP and Trusted Types

> Diátaxis: explanation. For the policy decision see
> [ADR-038](../adr/038-trusted-types-policy.md). For the audit script
> see [docs/reference/audit-scripts.md](../reference/audit-scripts.md).

## Why we care

XSS is the #1 historical attack class against single-page apps. We
take **two** independent layers of defence, on the assumption that
either one alone could be bypassed:

1. **Content Security Policy (CSP)** — the browser refuses to
   *execute* anything we did not whitelist. Tells the engine *where*
   code is allowed to come from.
2. **Trusted Types (TT)** — the browser refuses to *assign strings*
   to dangerous DOM sinks. Tells the engine *how* code is allowed to
   reach those sinks.

CSP without TT lets an attacker who finds a script-injection bug still
execute their script if the source matches an allowlisted origin.
TT without CSP lets the attacker exfiltrate data through `<img src>`,
`fetch`, or DOM-based redirects. We deploy both.

## Our CSP, in plain English

The `_headers` file ships the production policy. The relevant
fragments:

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'sha256-…' https://accounts.google.com https://connect.facebook.net https://appleid.cdn-apple.com;
  style-src  'self' 'unsafe-hashes' 'sha256-…';
  img-src    'self' data: https://lh3.googleusercontent.com;
  connect-src 'self' https://*.supabase.co https://api.green-api.com;
  frame-src  https://accounts.google.com;
  object-src 'none';
  base-uri   'self';
  require-trusted-types-for 'script';
  trusted-types wedding-sanitizer default;
```

Things to notice:

- **No `unsafe-inline` for scripts.** Every inline handler was
  removed during the v9.x migration to `data-action`.
- **No `unsafe-eval`.** Vite produces ES modules; we don't need it.
- **OAuth SDKs are pinned to vendor origins.** Google / Facebook /
  Apple SDKs are loaded only when a user clicks the corresponding
  sign-in button.
- **`require-trusted-types-for 'script'`** turns on TT enforcement
  for `innerHTML` / `outerHTML` / `Element.setAttribute('on*', …)` /
  `eval`-family / `Worker` constructors.
- **`trusted-types wedding-sanitizer default`** allow-lists exactly
  one named policy (`wedding-sanitizer`) plus the implicit `default`
  fallback.

## Why DOMPurify *and* Trusted Types

DOMPurify already strips XSS payloads from arbitrary HTML before we
hand it to the DOM. Why also Trusted Types?

| Risk                                            | DOMPurify alone | + Trusted Types |
| ----------------------------------------------- | --------------- | --------------- |
| Developer forgets to call `sanitize()`          | Vulnerable      | **Blocked**: assignment throws. |
| Library appended in the future skips DOMPurify  | Vulnerable      | **Blocked**: same. |
| Newly-discovered DOMPurify bypass               | Vulnerable      | Vulnerable      |

Trusted Types catches developer error; DOMPurify catches malicious
input. They are complementary.

## The `wedding-sanitizer` policy

Implementation lives in `src/utils/sanitize.js`:

```js
const policy =
  globalThis.trustedTypes?.createPolicy?.("wedding-sanitizer", {
    createHTML: (input) => DOMPurify.sanitize(input, sanitizeOpts),
    createScript: () => { throw new Error("scripts disallowed"); },
    createScriptURL: () => { throw new Error("script urls disallowed"); },
  });
```

Three rules:

1. **Single policy.** All HTML sinks go through this one chokepoint.
2. **Scripts are forbidden.** `createScript` and `createScriptURL`
   throw — we never need to construct executable code at runtime.
3. **Graceful fallback.** When `trustedTypes` is undefined (Safari
   today), we fall back to calling DOMPurify directly. CSP's
   `require-trusted-types-for` is a no-op there, so we keep parity
   with the rest of the stack.

## What this means for contributors

- Never assign a string to `innerHTML` / `outerHTML`. Use
  `setHTML(el, sanitize(html))` from `src/core/dom.js`.
- Never construct a `new Function(…)` or `setTimeout("…")` with a
  string. Pass functions.
- New third-party origins must be added to the CSP *before* you
  import the SDK.
- Run `npm run audit:trusted-types` locally to see flagged sinks.

## Failure modes

| Symptom                                                  | Likely cause                                  |
| -------------------------------------------------------- | --------------------------------------------- |
| `TypeError: Failed to execute 'innerHTML'`               | Direct string assignment; route through `setHTML`. |
| Console: `Refused to load the script ‘<url>’`            | New SDK origin missing from `script-src`.     |
| Safari renders fine, Chrome/Firefox blocks               | TT enforcement; check policy creation log.    |
| `Refused to apply inline style`                          | Migrate inline `style="…"` to a CSS class.    |

## See also

- [ADR-038 Trusted Types policy](../adr/038-trusted-types-policy.md)
- [docs/explanation/zero-runtime-deps.md](./zero-runtime-deps.md)
- [public/\_headers](../../public/_headers)
- [src/utils/sanitize.js](../../src/utils/sanitize.js)
