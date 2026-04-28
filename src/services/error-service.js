/**
 * src/services/error-service.js — Unified error service (S189)
 *
 * Merged from:
 *   - error-monitor.js  (ADR-028 M1) — vendor-neutral transport / envelope
 *   - error-pipeline.js (S47)        — capture / store / summarise
 *   - error-proxy.js    (S156)       — GlitchTip / Sentry-compatible proxy
 */

import { storeGet, storeUpsert, storeSet } from "../core/store.js";
import { APP_VERSION } from "../core/config.js";

// ── Error monitor (merged from error-monitor.js, ADR-028 M1) ─────────────

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
 * Associate subsequent reports with an opaque user ID.
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
 * Replace the transport (Phase M2 / tests).
 * @param {(envelope: object) => void} fn
 */
export function configureTransport(fn) {
  if (typeof fn !== "function") {
    throw new TypeError("error-monitor.configureTransport: function required");
  }
  _transport = fn;
}

/**
 * Reset module state between tests.
 * @internal
 */
export function _resetForTests() {
  _user = null;
  _transport = _consoleTransport;
}

// ── Error pipeline (merged from error-pipeline.js, S47) ──────────────────

const MAX_STORED_ERRORS = 200;

/**
 * @typedef {import('../types').AppError} AppError
 */

function nowMs() {
  return Date.now();
}

/** @returns {AppError[]} */
function getAll() {
  return /** @type {AppError[]} */ (storeGet("appErrors") ?? []);
}

/**
 * Capture and store an error, enriched with context and version info.
 * @param {unknown} err
 * @param {Record<string, unknown>} [context]
 * @returns {AppError}
 */
export function captureError(err, context = {}) {
  const isError = err instanceof Error;
  const record = /** @type {AppError} */ ({
    id: `err_${nowMs()}_${Math.random().toString(36).slice(2, 7)}`,
    type: isError ? err.name || "Error" : typeof err,
    message: isError ? err.message : String(err),
    stack: isError ? err.stack : undefined,
    context: { ...context },
    version: APP_VERSION,
    ts: nowMs(),
  });

  storeUpsert("appErrors", record);

  const all = getAll();
  if (all.length > MAX_STORED_ERRORS) {
    const trimmed = all.sort((a, b) => b.ts - a.ts).slice(0, MAX_STORED_ERRORS);
    storeSet("appErrors", trimmed);
  }

  return record;
}

/**
 * Retrieve all stored errors, newest first.
 * @param {{ type?: string, since?: number }} [filter]
 * @returns {AppError[]}
 */
export function getErrors(filter = {}) {
  let errors = getAll().sort((a, b) => b.ts - a.ts);
  if (filter.type) errors = errors.filter((e) => e.type === filter.type);
  if (filter.since) errors = errors.filter((e) => e.ts >= filter.since);
  return errors;
}

/**
 * Remove all stored errors.
 */
export function clearErrors() {
  storeSet("appErrors", []);
}

/**
 * Get a grouped summary of stored errors.
 * @returns {{ total: number, byType: Record<string, number>, latest?: AppError }}
 */
export function getErrorSummary() {
  const errors = getAll();
  if (errors.length === 0) return { total: 0, byType: {} };

  /** @type {Record<string, number>} */
  const byType = {};
  for (const e of errors) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  }

  const sorted = [...errors].sort((a, b) => b.ts - a.ts);
  return { total: errors.length, byType, latest: sorted[0] };
}

/**
 * Get the count of errors captured since `since` (ms epoch).
 * @param {number} [since]  Defaults to last 60 seconds
 * @returns {number}
 */
export function getRecentErrorCount(since) {
  const cutoff = since ?? nowMs() - 60_000;
  return getAll().filter((e) => e.ts >= cutoff).length;
}

// ── Error proxy (merged from error-proxy.js, S156) ───────────────────────

/** @type {string} */
let _dsn = "";
/** @type {URL | null} */
let _endpoint = null;
/** @type {boolean} */
let _installed = false;

/**
 * Parse a Sentry-compatible DSN string.
 * @param {string} dsn
 * @returns {{ key: string, host: string, projectId: string, storeUrl: string } | null}
 */
export function parseDsn(dsn) {
  if (!dsn || typeof dsn !== "string") return null;
  try {
    const url = new URL(dsn);
    const key = url.username;
    const host = url.host;
    const projectId = url.pathname.replace(/^\/+/, "");
    if (!key || !host || !projectId) return null;
    const storeUrl = `${url.protocol}//${host}/api/${projectId}/store/?sentry_key=${key}&sentry_version=7`;
    return { key, host, projectId, storeUrl };
  } catch {
    return null;
  }
}

/**
 * Build a minimal Sentry-compatible error envelope payload.
 * @param {Error} error
 * @param {{ tags?: Record<string, string>, extra?: Record<string, unknown> }} [context]
 * @returns {object}
 */
export function buildErrorPayload(error, context = {}) {
  return {
    event_id: _uuid4(),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level: "error",
    logger: "wedding-manager",
    exception: {
      values: [
        {
          type: error.name || "Error",
          value: error.message || "Unknown error",
          stacktrace: error.stack
            ? { frames: _parseStack(error.stack) }
            : undefined,
        },
      ],
    },
    tags: context.tags ?? {},
    extra: context.extra ?? {},
    request: {
      url: globalThis.location?.href ?? "",
      headers: {
        "User-Agent": globalThis.navigator?.userAgent ?? "",
      },
    },
  };
}

/**
 * Send an error to the configured DSN endpoint.
 * No-op if DSN is not configured.
 * @param {Error} error
 * @param {{ tags?: Record<string, string>, extra?: Record<string, unknown> }} [context]
 * @returns {Promise<boolean>}
 */
export async function captureProxyError(error, context = {}) {
  if (!_endpoint) return false;
  try {
    const payload = buildErrorPayload(error, context);
    const resp = await fetch(_endpoint.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Install global error + unhandledrejection listeners.
 * @param {string} dsn
 * @returns {{ teardown: () => void }}
 */
export function installErrorProxy(dsn) {
  if (_installed) return { teardown: _noop };
  const parsed = parseDsn(dsn);
  if (!parsed) return { teardown: _noop };

  _dsn = dsn;
  _endpoint = new URL(parsed.storeUrl);
  _installed = true;

  const onError = (/** @type {ErrorEvent} */ e) => {
    if (e.error instanceof Error) captureProxyError(e.error);
  };
  const onRejection = (/** @type {PromiseRejectionEvent} */ e) => {
    const err = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
    captureProxyError(err);
  };

  globalThis.addEventListener("error", onError);
  globalThis.addEventListener("unhandledrejection", onRejection);

  return {
    teardown() {
      globalThis.removeEventListener("error", onError);
      globalThis.removeEventListener("unhandledrejection", onRejection);
      _installed = false;
      _dsn = "";
      _endpoint = null;
    },
  };
}

/**
 * Check if error proxy is active.
 * @returns {boolean}
 */
export function isErrorProxyActive() {
  return _installed && _endpoint !== null;
}

// ── Internal helpers ───────────────────────────────────────────────────────

function _noop() {}

function _uuid4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Parse a JS stack trace into Sentry-compatible frames.
 * @param {string} stack
 * @returns {Array<{ filename: string, lineno?: number, colno?: number, function?: string }>}
 */
function _parseStack(stack) {
  return stack
    .split("\n")
    .slice(1)
    .map((line) => {
      const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        return {
          function: match[1],
          filename: match[2],
          lineno: Number(match[3]),
          colno: Number(match[4]),
        };
      }
      const simpleMatch = line.match(/at\s+(.+):(\d+):(\d+)/);
      if (simpleMatch) {
        return {
          filename: simpleMatch[1],
          lineno: Number(simpleMatch[2]),
          colno: Number(simpleMatch[3]),
        };
      }
      return { filename: line.trim() };
    })
    .reverse(); // Sentry expects innermost frame first
}
