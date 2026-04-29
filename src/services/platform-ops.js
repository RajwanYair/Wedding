/**
 * src/services/platform-ops.js — Platform operations: resilience + diagnostics (S273)
 *
 * Merged from:
 *   - resilience.js   (S258) — rate limiter, background sync, offline write queue
 *   - diagnostics.js  (S256) — deploy targets, Lighthouse CI, RLS audit, health monitor
 *
 * §1 Rate limiter:    createRateLimiter()
 * §2 Background Sync: isBackgroundSyncSupported, registerBackgroundSync, ensureBackgroundFlush
 * §3 Offline queue:   initOfflineQueue, enqueueOffline, flushOfflineQueue, getOfflineQueueCount, getQueueStats
 * §4 Deploy targets:  DEPLOY_TARGETS, getDeployButtons()
 * §5 Lighthouse CI:   buildLighthouseConfig(), getLighthouseLocales()
 * §6 RLS audit:       REQUIRED_RLS_TABLES, verifyRlsEnabled(), listPolicies(), verifySelectPolicies()
 * §7 Health monitor:  captureHealthError(), getHealthReport(), resetHealthState()
 *
 * Named exports only — no window.* side effects beyond queue badge + health listeners.
 */
/**
 * @typedef {{ limit: number, windowMs: number }} RateLimiterOptions
 * @typedef {{ allowed: boolean, remaining: number, resetAt: number }} ConsumeResult
 */

/**
 * Create a rate limiter using a sliding window token bucket.
 *
 * @param {RateLimiterOptions} opts
 * @returns {{ consume(key?: string): ConsumeResult, reset(key?: string): void, status(key?: string): ConsumeResult, clear(): void }}
 */
export function createRateLimiter({ limit, windowMs }) {
  if (limit < 1) throw new RangeError("limit must be >= 1");
  if (windowMs < 1) throw new RangeError("windowMs must be >= 1");

  /** @type {Map<string, { tokens: number, windowStart: number }>} */
  const buckets = new Map();
  const DEFAULT_KEY = "__default__";

  /**
   * @param {string} key
   */
  /** @returns {{ tokens: number, windowStart: number }} */
  function ensureBucket(/** @type {string} */ key) {
    if (!buckets.has(key)) {
      buckets.set(key, { tokens: limit, windowStart: Date.now() });
    }
    return /** @type {{ tokens: number, windowStart: number }} */ (buckets.get(key));
  }

  /**
   * @param {string} key
   */
  function tickBucket(key) {
    const b = ensureBucket(key);
    const now = Date.now();
    const elapsed = now - b.windowStart;
    if (elapsed >= windowMs) {
      // Full window elapsed — refill
      const windowsPassed = Math.floor(elapsed / windowMs);
      b.tokens = Math.min(limit, b.tokens + windowsPassed * limit);
      b.windowStart = now - (elapsed % windowMs);
    }
    return b;
  }

  return {
    /**
     * Try to consume one token. Returns { allowed, remaining, resetAt }.
     * @param {string} [key]
     */
    consume(key = DEFAULT_KEY) {
      const b = tickBucket(key);
      const resetAt = b.windowStart + windowMs;
      if (b.tokens > 0) {
        b.tokens--;
        return { allowed: true, remaining: b.tokens, resetAt };
      }
      return { allowed: false, remaining: 0, resetAt };
    },

    /**
     * Manually reset a bucket back to full.
     * @param {string} [key]
     */
    reset(key = DEFAULT_KEY) {
      buckets.set(key, { tokens: limit, windowStart: Date.now() });
    },

    /**
     * Current status without consuming a token.
     * @param {string} [key]
     * @returns {ConsumeResult}
     */
    status(key = DEFAULT_KEY) {
      const b = tickBucket(key);
      const resetAt = b.windowStart + windowMs;
      return { allowed: b.tokens > 0, remaining: b.tokens, resetAt };
    },

    /** Remove all buckets. */
    clear() {
      buckets.clear();
    },
  };
}


// ── §2–§3 — Background Sync + Offline Queue ─────────────────────────────

import { storeGet, storeSet } from "../core/store.js";
import { MAX_RETRIES, BACKOFF_BASE_MS } from "../core/config.js";
import { t } from "../core/i18n.js";
import { idbQueueRead, idbQueueWrite } from "../utils/idb-queue.js";

// ══════════════════════════════════════════════════════════════════════════
// §1 — Background Sync API wrapper (merged from background-sync.js, S89)
// ══════════════════════════════════════════════════════════════════════════

/** Default tag used by the SW to trigger a queue flush. */
export const BACKGROUND_SYNC_TAG = "write-sync";

/**
 * Returns true when the SyncManager API is available in the current browser.
 * @returns {boolean}
 */
export function isBackgroundSyncSupported() {
  if (typeof navigator === "undefined") return false;
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    typeof (/** @type {any} */ (window)).SyncManager !== "undefined" &&
    typeof navigator.serviceWorker.ready?.then === "function"
  );
}

/**
 * Register a Background Sync tag with the active Service Worker registration.
 * No-op when the API is unavailable; resolves to `false` instead of throwing.
 * @param {string} [tag=BACKGROUND_SYNC_TAG]
 * @returns {Promise<boolean>} `true` when registration succeeded
 */
export async function registerBackgroundSync(tag = BACKGROUND_SYNC_TAG) {
  if (!isBackgroundSyncSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    /** @type {{ sync?: { register: (tag: string) => Promise<void> } }} */
    const swr = /** @type {any} */ (reg);
    if (!swr.sync || typeof swr.sync.register !== "function") return false;
    await swr.sync.register(tag);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convenience helper: register Background Sync if supported, otherwise wire a
 * one-shot `online` listener that calls the supplied callback once.
 * @param {() => void} onTrigger
 * @param {string} [tag=BACKGROUND_SYNC_TAG]
 * @returns {Promise<"registered" | "fallback" | "noop">}
 */
export async function ensureBackgroundFlush(onTrigger, tag = BACKGROUND_SYNC_TAG) {
  const ok = await registerBackgroundSync(tag);
  if (ok) return "registered";
  if (typeof window === "undefined") return "noop";
  const handler = () => {
    window.removeEventListener("online", handler);
    try {
      onTrigger();
    } catch {
      /* never bubble */
    }
  };
  window.addEventListener("online", handler, { once: true });
  return "fallback";
}

// ══════════════════════════════════════════════════════════════════════════
// §2 — Offline write queue (merged from offline-queue.js, S203)
// ══════════════════════════════════════════════════════════════════════════

/** @type {{ type: string, payload: unknown, addedAt: string, retries: number }[]} */
let _queue = [];

/** Count of items dropped after exhausting MAX_RETRIES this session. */
let _exhaustedCount = 0;

/** @type {string | null} */
let _webAppUrl = null;

/** Cap backoff at 5 minutes */
const _MAX_DELAY_MS = 5 * 60_000;

/**
 * Initialise the offline queue. Loads persisted items (IDB first, store fallback)
 * and wires online/offline events.
 * @param {{ webAppUrl?: string, postFn?: (payload: unknown) => Promise<unknown> }} [opts]
 * @returns {void}
 */
export function initOfflineQueue(opts) {
  _webAppUrl = opts?.webAppUrl ?? null;
  _postFn = opts?.postFn ?? _defaultPost;

  // Load synchronously from store (localStorage) for immediate availability.
  _queue = /** @type {typeof _queue} */ (storeGet("offline_queue")) ?? [];

  // Async upgrade: attempt to load from IDB and prefer it if available.
  idbQueueRead()
    .then((idbItems) => {
      if (idbItems.length > 0) {
        _queue = /** @type {typeof _queue} */ (idbItems);
        _updateBadge();
      } else if (_queue.length > 0) {
        // Migrate existing localStorage items to IDB.
        idbQueueWrite(_queue).catch(() => {});
      }
    })
    .catch(() => {});

  _updateBadge();

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      _updateBadge();
      flushOfflineQueue();
    });
    window.addEventListener("offline", _updateBadge);
  }

  // Listen for RSVP_SYNC_READY from the Service Worker (Background Sync API).
  try {
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    if (sw && typeof sw.addEventListener === "function") {
      sw.addEventListener("message", (event) => {
        if (event.data?.type === "RSVP_SYNC_READY") {
          flushOfflineQueue();
        }
      });
    }
  } catch {
    // serviceWorker not available in this environment
  }
}

/** @type {(payload: unknown) => Promise<unknown>} */
let _postFn = _defaultPost;

/**
 * Default POST function using fetch.
 * @param {unknown} payload
 * @returns {Promise<unknown>}
 */
function _defaultPost(payload) {
  if (!_webAppUrl) return Promise.reject(new Error("No webapp URL"));
  return fetch(_webAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Queue a submission for later retry.
 * Registers the Background Sync tag so the Service Worker flushes the
 * queue automatically when connectivity is restored, even if the tab is closed.
 * @param {string} type - "rsvp" | "contact"
 * @param {unknown} payload
 */
export function enqueueOffline(type, payload) {
  _queue.push({
    type,
    payload,
    addedAt: new Date().toISOString(),
    retries: 0,
  });
  _persist();
  _updateBadge();
  _registerSyncTag();
}

/**
 * Register the Background Sync tag with the active Service Worker.
 * @returns {void}
 */
function _registerSyncTag() {
  try {
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    if (!sw || !sw.controller) return;
    sw.ready
      .then((reg) => {
        if (reg && "sync" in reg) {
          return /** @type {{ register: (tag: string) => Promise<void> }} */ (reg.sync).register(
            "rsvp-sync",
          );
        }
        return undefined;
      })
      .catch(() => {
        // Background Sync not supported or permission denied — ignore
      });
  } catch {
    // Navigator/serviceWorker not available in this environment
  }
}

/**
 * Flush the queue — send pending items. Called on "online" event.
 */
export function flushOfflineQueue() {
  if (!_webAppUrl || _queue.length === 0) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const pending = _queue.slice();
  _queue = [];
  _persist();

  let _sent = 0;
  /** @type {typeof pending} */
  const failed = [];

  function next() {
    if (pending.length === 0) {
      const requeue = failed.filter((item) => (item.retries ?? 0) < MAX_RETRIES);
      const exhausted = failed.filter((item) => (item.retries ?? 0) >= MAX_RETRIES);
      _exhaustedCount += exhausted.length;
      requeue.forEach((item) => {
        item.retries = (item.retries ?? 0) + 1;
      });

      if (requeue.length > 0) {
        _queue = [...requeue, ..._queue];
        _persist();
        const maxR = Math.max(...requeue.map((i) => i.retries));
        const delay = Math.min(BACKOFF_BASE_MS * 2 ** (maxR - 1), _MAX_DELAY_MS);
        setTimeout(flushOfflineQueue, delay);
      }
      _updateBadge();
      return;
    }

    const item = pending.shift();
    if (!item) {
      next();
      return;
    }
    _postFn(item.payload)
      .then(() => {
        _sent++;
        next();
      })
      .catch(() => {
        failed.push(item);
        next();
      });
  }

  next();
}

/**
 * Get the current queue length.
 * @returns {number}
 */
export function getOfflineQueueCount() {
  return _queue.length;
}

/**
 * Get a summary of queue health.
 * @returns {{ total: number, exhausted: number, oldestAddedAt: string | null }}
 */
export function getQueueStats() {
  const oldest =
    _queue.length > 0 ? _queue.reduce((a, b) => (a.addedAt < b.addedAt ? a : b)).addedAt : null;
  return { total: _queue.length, exhausted: _exhaustedCount, oldestAddedAt: oldest };
}

// ── Internal ──────────────────────────────────────────────────────────────

function _persist() {
  storeSet("offline_queue", _queue);
  idbQueueWrite(_queue).catch(() => {});
}

function _updateBadge() {
  if (typeof document === "undefined") return;
  const badge = document.getElementById("offlineBadge");
  if (!badge) return;
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const qCount = _queue.length;
  badge.style.display = isOffline || qCount > 0 ? "" : "none";
  if (isOffline) {
    badge.textContent = `📵 ${t("offline_badge_offline")}`;
  } else if (qCount > 0) {
    badge.textContent = `⏳ ${t("offline_badge_queued", { n: String(qCount) })}`;
  }
}



// ── §4–§7 — Diagnostics + deploy targets ─────────────────────────────────

// ── §1 — One-click deploy targets ─────────────────────────────────────────

/**
 * @typedef {{ key: string, name: string, icon: string, buildUrl: (repoUrl: string) => string }} DeployTarget
 */

/** @type {ReadonlyArray<DeployTarget>} */
export const DEPLOY_TARGETS = Object.freeze([
  {
    key: "vercel",
    name: "Vercel",
    icon: "▲",
    buildUrl: (repo) =>
      `https://vercel.com/new/clone?repository-url=${encodeURIComponent(repo)}`,
  },
  {
    key: "netlify",
    name: "Netlify",
    icon: "◆",
    buildUrl: (repo) =>
      `https://app.netlify.com/start/deploy?repository=${encodeURIComponent(repo)}`,
  },
  {
    key: "cloudflare",
    name: "Cloudflare Pages",
    icon: "☁",
    buildUrl: (repo) =>
      `https://dash.cloudflare.com/?to=/:account/pages/new/provider/gh&repository=${encodeURIComponent(repo)}`,
  },
  {
    key: "render",
    name: "Render",
    icon: "⬡",
    buildUrl: (repo) =>
      `https://render.com/deploy?repo=${encodeURIComponent(repo)}`,
  },
]);

/**
 * Build deploy-button data for the given repo URL.
 * @param {string} repoUrl
 * @returns {Array<{key: string, name: string, icon: string, url: string}>}
 */
export function getDeployButtons(repoUrl) {
  if (!repoUrl || typeof repoUrl !== "string") return [];
  return DEPLOY_TARGETS.map((t) => ({
    key: t.key,
    name: t.name,
    icon: t.icon,
    url: t.buildUrl(repoUrl),
  }));
}

// ── §2 — Lighthouse CI config builder ────────────────────────────────────

/**
 * @typedef {{ locale: string, url: string, formFactor?: string }} LighthouseLocaleConfig
 */

const DEFAULT_FORM_FACTOR = "mobile";
const DEFAULT_RUNS = 2;
const BASE_URL = "http://localhost/index.html";

/**
 * Build a Lighthouse CI config object for a specific locale.
 *
 * @param {string} locale — e.g. "he", "en", "ar", "ru"
 * @param {{ formFactor?: string, numberOfRuns?: number, baseUrl?: string }} [options]
 * @returns {{ ci: { collect: object, assert: object, upload: object } }}
 */
export function buildLighthouseConfig(locale, options = {}) {
  const formFactor = options.formFactor ?? DEFAULT_FORM_FACTOR;
  const numberOfRuns = options.numberOfRuns ?? DEFAULT_RUNS;
  const url = `${options.baseUrl ?? BASE_URL}?lang=${encodeURIComponent(locale)}`;

  return {
    ci: {
      collect: {
        staticDistDir: "dist",
        url: [url],
        numberOfRuns,
        settings: {
          onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
          formFactor,
          screenEmulation:
            formFactor === "mobile"
              ? { mobile: true, width: 390, height: 844, deviceScaleFactor: 3 }
              : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 },
          throttlingMethod: "simulate",
          extraHeaders: JSON.stringify({
            "Accept-Language": locale,
          }),
        },
      },
      assert: {
        assertions: {
          "categories:performance": ["error", { minScore: 0.8 }],
          "categories:accessibility": ["error", { minScore: 0.95 }],
          "categories:best-practices": ["error", { minScore: 0.9 }],
          "categories:seo": ["error", { minScore: 0.9 }],
        },
      },
      upload: {
        target: "temporary-public-storage",
      },
    },
  };
}

/**
 * Return the list of supported locales for Lighthouse CI audits.
 * @returns {ReadonlyArray<string>}
 */
export function getLighthouseLocales() {
  return Object.freeze(["he", "en", "ar", "ru"]);
}

// ── §3 — Row Level Security audit helpers ────────────────────────────────

/**
 * @typedef {import("@supabase/supabase-js").SupabaseClient} SupabaseClient
 * @typedef {{ tablename: string, rowsecurity: boolean }} RlsTableRow
 * @typedef {{ policyname: string, tablename: string, cmd: string, roles: string[], qual: string, with_check: string }} PolicyRow
 */

/** Tables that MUST have RLS enabled in production. */
export const REQUIRED_RLS_TABLES = [
  "guests",
  "tables",
  "vendors",
  "expenses",
  "contacts",
  "timeline",
  "rsvp_log",
  "events",
];

/**
 * Check whether RLS is enabled on every required table.
 *
 * @param {SupabaseClient} supabase
 * @returns {Promise<{ ok: boolean, missing: string[], tableStatus: Record<string, boolean> }>}
 */
export async function verifyRlsEnabled(supabase) {
  const { data, error } = await supabase.rpc("get_rls_status");
  if (error) throw error;

  /** @type {RlsTableRow[]} */
  const rows = data ?? [];
  /** @type {Record<string, boolean>} */
  const tableStatus = Object.fromEntries(rows.map((r) => [r.tablename, r.rowsecurity]));

  const missing = REQUIRED_RLS_TABLES.filter((t) => !tableStatus[t]);
  return { ok: missing.length === 0, missing, tableStatus };
}

/**
 * List all RLS policies for a given table.
 *
 * @param {SupabaseClient} supabase
 * @param {string} tableName
 * @returns {Promise<PolicyRow[]>}
 */
export async function listPolicies(supabase, tableName) {
  const { data, error } = await supabase.rpc("get_table_policies", {
    p_table: tableName,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * Check that every required table has at least one SELECT policy.
 *
 * @param {SupabaseClient} supabase
 * @returns {Promise<{ ok: boolean, unprotected: string[] }>}
 */
export async function verifySelectPolicies(supabase) {
  const results = await Promise.all(
    REQUIRED_RLS_TABLES.map(async (table) => {
      const policies = await listPolicies(supabase, table);
      const hasSelect = policies.some((p) => p.cmd === "SELECT" || p.cmd === "ALL");
      return { table, hasSelect };
    }),
  );

  const unprotected = results.filter((r) => !r.hasSelect).map((r) => r.table);

  return { ok: unprotected.length === 0, unprotected };
}

// ── §4 — App health monitor ───────────────────────────────────────────────

/** @type {{ msg: string, ts: string, context?: string }[]} */
const _errors = [];
const MAX_ERRORS_KEPT = 50;

/** @type {number} */
let _unhandledRejections = 0;

if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    _push(e.message ?? "Unknown error", "window.onerror");
  });
  window.addEventListener("unhandledrejection", (e) => {
    _unhandledRejections++;
    const msg = /** @type {any} */ (e.reason)?.message ?? String(e.reason);
    _push(msg, "unhandledRejection");
  });
}

/**
 * Capture an application-level error into the health monitor.
 * @param {Error | string} err
 * @param {string} [context]
 */
export function captureHealthError(err, context = "") {
  const msg = err instanceof Error ? err.message : String(err);
  _push(msg, context);
}

/**
 * Get the current health report for the session.
 *
 * @returns {{
 *   errors: number,
 *   recentErrors: { msg: string, ts: string, context?: string }[],
 *   unhandledRejections: number,
 *   offlineQueue: { total: number, exhausted: number, oldestAddedAt: string | null },
 *   status: "healthy" | "degraded" | "critical",
 *   warnings: string[]
 * }}
 */
// Test seam — allows overriding the queue-stats provider in unit tests.
// In production, this always points to the local getQueueStats.
/** @type {() => { total: number, exhausted: number, oldestAddedAt: string | null }} */
let _queueStatsFn = getQueueStats;

/**
 * Override the queue-stats getter. Test use only.
 * @param {() => { total: number, exhausted: number, oldestAddedAt: string | null }} fn
 * @internal
 */
export function _setQueueStatsFnForTests(fn) {
  _queueStatsFn = fn;
}

/** Returns a health report including error counts, offline queue stats, and warnings. */
export function getHealthReport() {
  const queue = _queueStatsFn();
  const warnings = /** @type {string[]} */ ([]);

  if (_errors.length > 5) warnings.push(`${_errors.length} errors this session`);
  if (queue.exhausted > 0) warnings.push(`${queue.exhausted} offline items exhausted (dropped)`);
  if (queue.total > 10) warnings.push(`Offline queue has ${queue.total} pending items`);

  let status = /** @type {"healthy" | "degraded" | "critical"} */ ("healthy");
  if (warnings.length > 0) status = "degraded";
  if (_errors.length > 10 || _unhandledRejections > 3) status = "critical";

  return {
    errors: _errors.length,
    recentErrors: _errors.slice(-10),
    unhandledRejections: _unhandledRejections,
    offlineQueue: queue,
    status,
    warnings,
  };
}

/**
 * Reset health state. Used for testing only.
 * @internal
 */
export function resetHealthState() {
  _errors.length = 0;
  _unhandledRejections = 0;
  _queueStatsFn = getQueueStats;
}

/** @param {string} msg @param {string} [context] */
function _push(msg, context = "") {
  _errors.push({ msg, ts: new Date().toISOString(), context });
  if (_errors.length > MAX_ERRORS_KEPT) _errors.shift();
}

