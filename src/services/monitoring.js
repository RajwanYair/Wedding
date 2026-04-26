/**
 * src/services/monitoring.js — Opt-in production monitoring (P0, ROADMAP §5 Phase A)
 *
 * Lightweight, transport-agnostic monitoring façade.
 *
 * - Zero runtime dependency: works without Sentry/Glitchtip installed.
 * - When `VITE_SENTRY_DSN` (or `VITE_GLITCHTIP_DSN`) is configured at build,
 *   `initMonitoring()` lazy-loads `@sentry/browser` (if available) and forwards
 *   captured errors to it.
 * - Pipes through `error-pipeline.captureError()` so local debug history is
 *   preserved either way.
 * - PII scrubber strips phone numbers, emails, and bearer tokens before send.
 *
 * Usage (in src/main.js):
 *   import { initMonitoring, captureException } from "./services/monitoring.js";
 *   await initMonitoring();
 *   try { ... } catch (e) { captureException(e, { section: "guests" }); }
 */

import { captureError } from "./error-pipeline.js";
import { APP_VERSION } from "../core/config.js";

// ── Constants ──────────────────────────────────────────────────────────────

/** Capture-rate limit: 1 sample per N ms per error type (anti-flood). */
const SAMPLE_WINDOW_MS = 1000;

/** Max breadcrumbs retained for context on the next exception. */
const MAX_BREADCRUMBS = 50;

// ── Module state ───────────────────────────────────────────────────────────

/** @type {{ init: Function, captureException: Function, addBreadcrumb: Function } | null} */
let _transport = null;

/** @type {boolean} */
let _initialized = false;

/** @type {Map<string, number>} */
const _lastSampleAt = new Map();

/**
 * @typedef {{ category?: string, message: string, level?: "info"|"warning"|"error", data?: Record<string, unknown>, ts: number }} Breadcrumb
 */
/** @type {Breadcrumb[]} */
const _breadcrumbs = [];

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Initialise monitoring. Safe to call multiple times.
 * @param {{ dsn?: string, sampleRate?: number, environment?: string }} [opts]
 * @returns {Promise<boolean>} true if a remote transport was wired
 */
export async function initMonitoring(opts = {}) {
  if (_initialized) return _transport != null;
  _initialized = true;

  const dsn =
    opts.dsn ??
    (typeof globalThis !== "undefined" && globalThis.process?.env?.VITE_SENTRY_DSN) ??
    (typeof import.meta !== "undefined" && /** @type {any} */ (import.meta).env?.VITE_SENTRY_DSN);

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
 * Capture core Web Vitals (LCP, INP, CLS) via PerformanceObserver and forward
 * them as breadcrumbs + remote `captureMessage` (when transport available).
 *
 * Zero-dependency reimplementation — does not pull `web-vitals` into the
 * bundle. Numbers match the Chrome User Experience Report definitions:
 *   - LCP: largest-contentful-paint entry, finalised on hidden/load.
 *   - INP: max interaction event duration (best-of approximation).
 *   - CLS: sum of layout-shift entries without recent input.
 *
 * Safe no-op in browsers without `PerformanceObserver`.
 * Returns a `cleanup` function to disconnect observers (used in tests).
 *
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

  /** @type {Record<string, number>} */
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

/**
 * Reset all module state. Tests only.
 */
export function _resetForTests() {
  _initialized = false;
  _transport = null;
  _lastSampleAt.clear();
  _breadcrumbs.length = 0;
}
