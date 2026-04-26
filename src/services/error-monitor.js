/**
 * src/services/error-monitor.js — Vendor-neutral error transport (ADR-028 M1).
 *
 * Phase M1: console-only no-op transport with a stable public API.
 * Phase M2: switch transport to `navigator.sendBeacon` against an
 *           `/error-ingest` Supabase Edge Function (flag-gated).
 * Phase M3: replace `health.js` `error` listener; transport always on.
 *
 * Public API:
 *   - reportError(err, ctx?)        → void
 *   - setUser(user)                 → void
 *   - configureTransport(fn)        → void  (test/seam hook)
 *   - _resetForTests()              → void
 *
 * No vendor SDK. Bundle impact ≤ 1 KB gzip (ADR-001).
 */

const ENVELOPE_VERSION = 1;
const STACK_LIMIT_BYTES = 4 * 1024;

/** @type {{ id: string } | null} */
let _user = null;

/** @type {(envelope: object) => void} */
let _transport = _consoleTransport;

/**
 * Default transport — console only. Phase M1 default.
 * @param {object} envelope
 */
function _consoleTransport(envelope) {
  console.warn("[error-monitor]", envelope);
}

/**
 * Strip query strings that may carry tokens, truncate stack to budget.
 * @param {string} stack
 * @returns {string}
 */
function _sanitizeStack(stack) {
  if (typeof stack !== "string") return "";
  // Strip ?token=… style query strings.
  const stripped = stack.replace(/\?[^\s)]*/g, "");
  return stripped.length > STACK_LIMIT_BYTES
    ? `${stripped.slice(0, STACK_LIMIT_BYTES)}…[truncated]`
    : stripped;
}

/**
 * Strip secrets and untyped values from arbitrary context objects.
 * @param {unknown} ctx
 * @returns {Record<string, string|number|boolean>}
 */
function _sanitizeCtx(ctx) {
  if (!ctx || typeof ctx !== "object") return {};
  /** @type {Record<string, string|number|boolean>} */
  const out = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (/token|secret|password|auth/i.test(k)) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Report an error. Always non-throwing.
 * @param {Error|string|unknown} err
 * @param {Record<string, unknown>} [ctx]
 */
export function reportError(err, ctx = {}) {
  try {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Unknown error";
    const stack = err instanceof Error ? _sanitizeStack(err.stack ?? "") : "";
    const envelope = {
      v: ENVELOPE_VERSION,
      ts: Date.now(),
      msg: message,
      stack,
      ctx: _sanitizeCtx(ctx),
      ua: typeof navigator === "undefined" ? "" : navigator.userAgent,
      url: typeof location === "undefined" ? "" : location.href.split("?")[0],
      user: _user?.id ?? null,
    };
    _transport(envelope);
  } catch (_e) {
    // Never throw from the monitor itself.
  }
}

/**
 * Associate subsequent reports with an opaque user ID. The full user
 * object is *not* retained — only `id` is kept.
 * @param {{ id: string } | null} user
 */
export function setUser(user) {
  if (user === null) {
    _user = null;
    return;
  }
  if (!user || typeof user.id !== "string") {
    throw new TypeError("error-monitor.setUser: { id: string } required");
  }
  _user = { id: user.id };
}

/**
 * Replace the transport. Used by Phase M2 to swap in `sendBeacon`,
 * and by tests to assert envelope shape.
 * @param {(envelope: object) => void} fn
 */
export function configureTransport(fn) {
  if (typeof fn !== "function") {
    throw new TypeError("error-monitor.configureTransport: function required");
  }
  _transport = fn;
}

/**
 * @internal Reset module state between tests.
 */
export function _resetForTests() {
  _user = null;
  _transport = _consoleTransport;
}
