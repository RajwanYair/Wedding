/**
 * src/services/observability.js — Unified observability service (S226)
 *
 * Merged from:
 *   - error-service.js  (S189) — error capture / store / proxy
 *   - monitoring.js     (S78)  — PII-scrubbing transport façade / Web Vitals
 */

import { storeGet, storeUpsert, storeSet } from "../core/store.js";
import { APP_VERSION } from "../core/config.js";
import { logError } from "./compliance.js";

// ══════════════════════════════════════════════════════════════════════════
// §1 — Error monitor (merged from error-monitor.js, ADR-028 M1)
// ══════════════════════════════════════════════════════════════════════════

const ENVELOPE_VERSION = 1;
const STACK_LIMIT_BYTES = 4 * 1024;

/** @type {{ id: string } | null} */
let _user = null;

/** @type {(envelope: object) => void} */
let _monitorTransport = _consoleTransport;

/**
 * Default transport — console only.
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
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
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
    _monitorTransport(envelope);
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
  _monitorTransport = fn;
}

// ══════════════════════════════════════════════════════════════════════════
// §2 — Error pipeline (merged from error-pipeline.js, S47)
// ══════════════════════════════════════════════════════════════════════════

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

  // Forward to Supabase error_log when backend is configured (S231)
  logError(err, { context: JSON.stringify(context) });

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
  const since = filter.since;
  if (since !== undefined) errors = errors.filter((e) => e.ts >= since);
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

// ══════════════════════════════════════════════════════════════════════════
// §3 — Error proxy (merged from error-proxy.js, S156)
// ══════════════════════════════════════════════════════════════════════════

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
          stacktrace: error.stack ? { frames: _parseStack(error.stack) } : undefined,
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

// ══════════════════════════════════════════════════════════════════════════
// §4 — Monitoring façade (merged from monitoring.js, S78)
// ══════════════════════════════════════════════════════════════════════════

/** Capture-rate limit: 1 sample per N ms per error type (anti-flood). */
const SAMPLE_WINDOW_MS = 1000;

/** Max breadcrumbs retained for context on the next exception. */
const MAX_BREADCRUMBS = 50;

/** @type {{ init: Function, captureException: Function, addBreadcrumb: Function, captureMessage?: Function } | null} */
let _transport = null;

/** @type {boolean} */
let _monInitialized = false;

/** @type {Map<string, number>} */
const _lastSampleAt = new Map();

/**
 * @typedef {{ category?: string, message: string, level?: "info"|"warning"|"error", data?: Record<string, unknown>, ts: number }} Breadcrumb
 */
/** @type {Breadcrumb[]} */
const _breadcrumbs = [];

/**
 * Strip likely PII (emails, Israeli phone numbers, bearer tokens) from a string.
 * Pure — exported for tests.
 * @param {string} input
 * @returns {string}
 */
export function scrubPii(input) {
  if (typeof input !== "string") return input;
  return (
    input
      // emails
      .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[email]")
      // bearer tokens / JWTs
      .replace(/\b(?:eyJ|sk-|pk_|Bearer\s+)[A-Za-z0-9._-]{8,}\b/g, "[token]")
      // Israeli phones (+972 / 0XX) — keep last 2 digits for triage
      .replace(/(?:\+?972|0)[\s-]?\d{1,2}[\s-]?\d{3}[\s-]?(\d{2,4})/g, "[phone-***$1]")
  );
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {Record<string, unknown>}
 */
function scrubContext(ctx) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = typeof v === "string" ? scrubPii(v) : v;
  }
  return out;
}

/**
 * @param {string} type
 * @returns {boolean}
 */
function _shouldSample(type) {
  const now = Date.now();
  const last = _lastSampleAt.get(type) ?? 0;
  if (now - last < SAMPLE_WINDOW_MS) return false;
  _lastSampleAt.set(type, now);
  return true;
}

/**
 * Initialise monitoring. Safe to call multiple times.
 * @param {{ dsn?: string, sampleRate?: number, environment?: string }} [opts]
 * @returns {Promise<boolean>} true if a remote transport was wired
 */
export async function initMonitoring(opts = {}) {
  if (_monInitialized) return _transport != null;
  _monInitialized = true;

  // Honour user opt-out (localStorage flag set from Settings).
  try {
    if (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("wedding_v1_telemetry_opt_out") === "1"
    ) {
      return false;
    }
  } catch {
    /* private mode / disabled storage — fall through */
  }

  const _env = (typeof import.meta !== "undefined" && /** @type {any} */ (import.meta).env) ?? {};
  const _proc = (typeof globalThis !== "undefined" && globalThis.process?.env) ?? {};
  const dsn =
    opts.dsn ??
    _env.VITE_GLITCHTIP_DSN ??
    _proc.VITE_GLITCHTIP_DSN ??
    _env.VITE_SENTRY_DSN ??
    _proc.VITE_SENTRY_DSN;

  if (!dsn) return false;

  try {
    // Lazy import — keeps the dep optional at install time.
    const sentry = await import(/* @vite-ignore */ "@sentry/browser").catch(() => null);
    if (!sentry || typeof sentry.init !== "function") return false;
    sentry.init({
      dsn,
      tracesSampleRate: opts.sampleRate ?? 0.05,
      environment: opts.environment ?? "production",
      release: `wedding-manager@${APP_VERSION}`,
      beforeSend(
        /** @type {{ message?: string, exception?: unknown, extra?: Record<string, unknown> }} */ event,
      ) {
        if (event.message) event.message = scrubPii(event.message);
        if (event.extra) event.extra = scrubContext(event.extra);
        return event;
      },
    });
    _transport = /** @type {any} */ (sentry);
    return true;
  } catch {
    return false;
  }
}

/**
 * Capture an exception. Always recorded locally; forwarded to remote transport
 * when initialised. Rate-limited per error-type to avoid floods.
 * @param {unknown} err
 * @param {Record<string, unknown>} [context]
 */
export function captureException(err, context = {}) {
  const scrubbed = scrubContext(context);
  // Local pipeline first — never lose data even if remote fails.
  const record = captureError(err, scrubbed);
  if (!_transport) return;
  if (!_shouldSample(record.type)) return;
  try {
    _transport.captureException(err, {
      tags: { section: scrubbed.section, action: scrubbed.action },
      extra: { ...scrubbed, breadcrumbs: [..._breadcrumbs] },
    });
  } catch {
    // Swallow — remote transport must never break the app.
  }
}

/**
 * Record a breadcrumb (small contextual event) for the next exception.
 * @param {Breadcrumb | Omit<Breadcrumb, "ts">} crumb
 */
export function addBreadcrumb(crumb) {
  const enriched = /** @type {Breadcrumb} */ ({
    ts: Date.now(),
    level: "info",
    ...crumb,
    message: scrubPii(crumb.message ?? ""),
  });
  _breadcrumbs.push(enriched);
  if (_breadcrumbs.length > MAX_BREADCRUMBS) _breadcrumbs.shift();
  if (_transport && typeof _transport.addBreadcrumb === "function") {
    try {
      _transport.addBreadcrumb(enriched);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Returns the current breadcrumb buffer (for tests/diagnostics).
 * @returns {ReadonlyArray<Breadcrumb>}
 */
export function getBreadcrumbs() {
  return [..._breadcrumbs];
}

/**
 * Capture core Web Vitals (LCP, INP, CLS) via PerformanceObserver.
 * @returns {() => void}
 */
export function initWebVitals() {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
    return () => {};
  }

  /** @type {PerformanceObserver[]} */
  const observers = [];
  const safeObserve = (
    /** @type {PerformanceObserverInit} */ init,
    /** @type {(list: PerformanceObserverEntryList) => void} */ cb,
  ) => {
    try {
      const obs = new PerformanceObserver(cb);
      obs.observe(init);
      observers.push(obs);
    } catch {
      /* entry type not supported in this browser */
    }
  };

  /** @type {{ lcp: number, inp: number, cls: number }} */
  const metrics = { lcp: 0, inp: 0, cls: 0 };

  // LCP — keep updating; final value at hidden/pagehide.
  safeObserve({ type: "largest-contentful-paint", buffered: true }, (list) => {
    const entries = list.getEntries();
    const last = /** @type {any} */ (entries[entries.length - 1]);
    if (last) metrics.lcp = Math.round(last.renderTime || last.loadTime || last.startTime || 0);
  });

  // INP — best approximation: track the slowest event-timing duration.
  safeObserve({ type: "event", buffered: true, durationThreshold: 16 }, (list) => {
    for (const entry of list.getEntries()) {
      const d = /** @type {PerformanceEventTiming} */ (entry).duration;
      if (d > metrics.inp) metrics.inp = Math.round(d);
    }
  });

  // CLS — sum non-input layout shifts.
  safeObserve({ type: "layout-shift", buffered: true }, (list) => {
    for (const entry of list.getEntries()) {
      const e = /** @type {{ value: number, hadRecentInput?: boolean }} */ (
        /** @type {unknown} */ (entry)
      );
      if (!e.hadRecentInput) metrics.cls += e.value;
    }
  });

  const flush = () => {
    addBreadcrumb({
      category: "web-vitals",
      message: "page-vitals",
      level: "info",
      data: { lcp: metrics.lcp, inp: metrics.inp, cls: Number(metrics.cls.toFixed(4)) },
    });
    if (_transport && typeof _transport.captureMessage === "function") {
      try {
        _transport.captureMessage("web-vitals", {
          level: "info",
          extra: { lcp: metrics.lcp, inp: metrics.inp, cls: metrics.cls },
        });
      } catch {
        /* swallow */
      }
    }
  };

  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flush, { once: true });

  return () => {
    for (const o of observers) {
      try {
        o.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    document.removeEventListener("visibilitychange", onHide);
  };
}

// ══════════════════════════════════════════════════════════════════════════
// §5 — Internal helpers
// ══════════════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════════════
// §6 — Test reset (combines both _resetForTests)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Reset all module state. Tests only.
 */
export function _resetForTests() {
  // monitor reset
  _user = null;
  _monitorTransport = _consoleTransport;
  // proxy reset
  _installed = false;
  _dsn = "";
  _endpoint = null;
  // monitoring façade reset
  _monInitialized = false;
  _transport = null;
  _lastSampleAt.clear();
  _breadcrumbs.length = 0;
}
