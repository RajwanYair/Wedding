/**
 * src/utils/token-gate.js — Token-gate utility (Sprint 37)
 *
 * Lightweight guards that control access to actions or DOM elements based on
 * a guest token validated through the guest-token service.
 *
 * All DOM-manipulating functions expect a browser context; the pure logic
 * helpers (`withTokenGate`, `requireToken`) are fully testable in Node.
 *
 * Usage:
 *   import { withTokenGate, gateElement, requireToken } from "../utils/token-gate.js";
 *
 *   // Only run a function when the token is valid
 *   const ran = withTokenGate("abc.def.ghi", () => submitRSVP());
 *
 *   // Hide an element for an invalid/expired token
 *   gateElement(document.getElementById("rsvp-form"), token);
 */

import { verifyToken, isRevoked } from "../services/guest-token.js";

// ── Token validation ───────────────────────────────────────────────────────

/**
 * Returns `true` when the token passes signature, expiry and revocation checks.
 *
 * @param {string | null | undefined} token
 * @returns {boolean}
 */
export function isTokenValid(token) {
  if (!token) return false;
  if (isRevoked(token)) return false;
  return verifyToken(token);
}

// ── Pure logic gates ───────────────────────────────────────────────────────

/**
 * Invoke `fn` only when the token is valid.  Returns the result of `fn` or
 * `undefined` when the token is invalid.
 *
 * @template T
 * @param {string | null | undefined} token
 * @param {() => T} fn
 * @returns {T | undefined}
 */
export function withTokenGate(token, fn) {
  if (!isTokenValid(token)) return undefined;
  return fn();
}

/**
 * Assert a token is valid; call `onFail` (default: no-op) when it is not.
 *
 * @param {string | null | undefined} token
 * @param {(token: string | null | undefined) => void} [onFail]
 * @returns {boolean}  `true` when token passes, `false` when it fails
 */
export function requireToken(token, onFail = () => {}) {
  if (!isTokenValid(token)) {
    onFail(token ?? null);
    return false;
  }
  return true;
}

/**
 * Run `fn` only if token is valid; wrap the result in a promise.
 * Rejects with a descriptive error when the token is invalid.
 *
 * @template T
 * @param {string | null | undefined} token
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
export function withTokenGateAsync(token, fn) {
  if (!isTokenValid(token)) {
    return Promise.reject(new Error("token-gate: invalid or expired token"));
  }
  return Promise.resolve(fn());
}

// ── DOM gates ──────────────────────────────────────────────────────────────

/**
 * Hide `el` (via `hidden` attribute) when the token is invalid.
 * Unhides it when the token becomes valid.
 *
 * @param {HTMLElement} el
 * @param {string | null | undefined} token
 */
export function gateElement(el, token) {
  if (isTokenValid(token)) {
    el.removeAttribute("hidden");
  } else {
    el.setAttribute("hidden", "");
  }
}

/**
 * Disable a form control when the token is invalid.
 *
 * @param {HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} el
 * @param {string | null | undefined} token
 */
export function gateControl(el, token) {
  if (isTokenValid(token)) {
    el.removeAttribute("disabled");
  } else {
    el.setAttribute("disabled", "");
  }
}

/**
 * Watch a token and call `onValid` / `onInvalid` callbacks immediately.
 * Returns a teardown function (no-op in this implementation — useful for
 * future interval-based refresh support).
 *
 * @param {string | null | undefined} token
 * @param {{ onValid?: () => void, onInvalid?: () => void }} callbacks
 * @returns {() => void}  cleanup function
 */
export function watchToken(token, { onValid = () => {}, onInvalid = () => {} } = {}) {
  if (isTokenValid(token)) {
    onValid();
  } else {
    onInvalid();
  }
  return () => {};
}
