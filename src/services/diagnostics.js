/**
 * src/services/diagnostics.js — S256 merged diagnostics + deploy helpers
 *
 * Merged from:
 *   - ci-helpers.js   (S152+S153) — one-click deploy targets + Lighthouse CI config
 *   - db-diagnostics.js (S82+S10) — RLS audit helpers + app health monitor
 *
 * §1 Deploy targets: DEPLOY_TARGETS constant + getDeployButtons()
 * §2 Lighthouse CI: buildLighthouseConfig() + getLighthouseLocales()
 * §3 RLS audit: verifyRlsEnabled(), listPolicies(), verifySelectPolicies()
 * §4 Health monitor: captureHealthError(), getHealthReport()
 *
 * Named exports only — no window.* side effects, no DOM, no store.
 */

import { getQueueStats } from "./resilience.js";

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
export function getHealthReport() {
  const queue = getQueueStats();
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
}

/** @param {string} msg @param {string} [context] */
function _push(msg, context = "") {
  _errors.push({ msg, ts: new Date().toISOString(), context });
  if (_errors.length > MAX_ERRORS_KEPT) _errors.shift();
}
