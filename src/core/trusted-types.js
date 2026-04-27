/**
 * src/core/trusted-types.js — Trusted Types policy installer (S90)
 *
 * Browsers that support Trusted Types (Chromium-family) reject string
 * assignments to `Element.innerHTML`, `<script>.src`, `<iframe>.srcdoc`, etc.
 * once `require-trusted-types-for 'script'` is set in CSP. Policies registered
 * here mint typed strings via DOMPurify (strict, allowlist-based).
 *
 * Two named policies are exported:
 *   - `wedding-html` — sanitised HTML fragments (uses DOMPurify allowlist)
 *   - `default`     — last-resort policy; logs a warning and returns the input
 *
 * When the API is unavailable, `installTrustedTypesPolicy()` is a no-op and
 * returns `null`. Existing `el.innerHTML = sanitisedString` call-sites keep
 * working in browsers without TT enforcement.
 */

import DOMPurify from "dompurify";

/** Name used for the strict, sanitising policy. */
export const WEDDING_HTML_POLICY = "wedding-html";

/** @type {{ createHTML(s: string): unknown } | null} */
let _strictPolicy = null;

/** @type {{ createHTML(s: string): unknown } | null} */
let _defaultPolicy = null;

/**
 * Returns true when the current document supports Trusted Types.
 * @returns {boolean}
 */
export function isTrustedTypesSupported() {
  return typeof (/** @type {any} */ (globalThis).trustedTypes) !== "undefined";
}

/**
 * Install the named `wedding-html` and `default` policies. Idempotent — safe
 * to call multiple times. Returns the strict policy (or `null` when TT is not
 * available in the current environment).
 *
 * @returns {{ sanitize(html: string): string } | null}
 */
export function installTrustedTypesPolicy() {
  if (!isTrustedTypesSupported()) return null;
  /** @type {any} */
  const tt = /** @type {any} */ (globalThis).trustedTypes;
  if (!_strictPolicy && typeof tt.createPolicy === "function") {
    try {
      _strictPolicy = tt.createPolicy(WEDDING_HTML_POLICY, {
        /**
         * @param {string} html
         */
        createHTML(html) {
          return DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true, svg: true },
            FORBID_TAGS: ["script", "style"],
          });
        },
      });
    } catch {
      _strictPolicy = null;
    }
  }
  if (!_defaultPolicy && typeof tt.createPolicy === "function") {
    try {
      _defaultPolicy = tt.createPolicy("default", {
        /**
         * @param {string} html
         */
        createHTML(html) {
          // Default policy is a last-resort guard. It also runs the input
          // through DOMPurify so unscoped innerHTML assignments stay safe.
          return DOMPurify.sanitize(html);
        },
      });
    } catch {
      _defaultPolicy = null;
    }
  }
  if (!_strictPolicy) return null;
  return {
    sanitize(html) {
      // Use the strict policy and coerce back to a string for the call site.
      // The caller can still assign the raw return value to innerHTML and the
      // browser will accept it (as a TrustedHTML token).
      return /** @type {string} */ (
        /** @type {any} */ (_strictPolicy).createHTML(html)
      );
    },
  };
}

/**
 * Convenience: returns a TrustedHTML (browser) or sanitised string (fallback)
 * for direct assignment to `innerHTML`. (S90)
 *
 * @param {string} html
 * @returns {string}
 */
export function trustedHtml(html) {
  if (_strictPolicy) {
    return /** @type {string} */ (
      /** @type {any} */ (_strictPolicy).createHTML(html)
    );
  }
  return DOMPurify.sanitize(html);
}
