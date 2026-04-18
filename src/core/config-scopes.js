/**
 * src/core/config-scopes.js — Layered runtime config system (Sprint 57)
 *
 * Config is read from three layers in priority order:
 *   1. RUNTIME scope — saved to localStorage by admins at runtime
 *   2. BUILD scope — injected at build time (from config.js / import.meta.env)
 *   3. DEFAULTS scope — hardcoded fallbacks
 *
 * Runtime config persists to localStorage under the `wedding_v1_runtime_cfg`
 * key and is readable by all sessions on the same device.
 *
 * Usage:
 *   import { getConfig, setRuntimeConfig, resetRuntimeConfig } from "./config-scopes.js";
 *   const lang = getConfig("defaultLang");        // reads all three layers
 *   setRuntimeConfig("defaultLang", "en");        // overrides at runtime
 *   resetRuntimeConfig("defaultLang");            // clear override
 */

import { STORAGE_KEYS } from "./constants.js";

/** Storage key for persisted runtime overrides. */
const RUNTIME_KEY = STORAGE_KEYS.RUNTIME_CONFIG;

/**
 * Default values for all known config keys.
 * @type {Record<string, unknown>}
 */
const DEFAULTS = {
  defaultLang: "he",
  defaultTheme: "default",
  maxGuestsPerTable: 12,
  rsvpDeadlineDays: 30,
  enableAnalytics: false,
  enablePresence: true,
  enableOfflineQueue: true,
  enableAutoBackup: false,
  autoBackupIntervalMs: 3_600_000, // 1 hour
  maxConcurrentRequests: 4,
};

// ── RUNTIME layer ─────────────────────────────────────────────────────────

/**
 * Read all runtime overrides from localStorage.
 * @returns {Record<string, unknown>}
 */
function readRuntime() {
  try {
    const raw = localStorage.getItem(RUNTIME_KEY);
    if (!raw) return {};
    return /** @type {Record<string, unknown>} */ (JSON.parse(raw));
  } catch {
    return {};
  }
}

/**
 * Write runtime overrides back to localStorage.
 * @param {Record<string, unknown>} cfg
 */
function writeRuntime(cfg) {
  try {
    localStorage.setItem(RUNTIME_KEY, JSON.stringify(cfg));
  } catch {
    // storage may be full/unavailable — silently ignore
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Read a config value, trying RUNTIME → BUILD → DEFAULTS in that order.
 *
 * The BUILD layer is populated lazily from `window.__WEDDING_CONFIG__` if that
 * global is present (injected by inject-config.mjs at deploy time).
 *
 * @param {string} key
 * @returns {unknown}
 */
export function getConfig(key) {
  // 1 — runtime override
  const runtime = readRuntime();
  if (Object.hasOwn(runtime, key)) return runtime[key];

  // 2 — build-time / deploy-time inject (window.__WEDDING_CONFIG__)
  const buildCfg =
    typeof globalThis !== "undefined" &&
    /** @type {Record<string, Record<string, unknown>>} */ (globalThis).__WEDDING_CONFIG__;
  if (buildCfg && Object.hasOwn(buildCfg, key)) return buildCfg[key];

  // 3 — defaults
  return DEFAULTS[key];
}

/**
 * Persist a runtime config override to localStorage.
 * @param {string} key
 * @param {unknown} value
 */
export function setRuntimeConfig(key, value) {
  const cfg = readRuntime();
  cfg[key] = value;
  writeRuntime(cfg);
}

/**
 * Remove a specific runtime override, falling back to BUILD / DEFAULTS.
 * @param {string} key
 */
export function resetRuntimeConfig(key) {
  const cfg = readRuntime();
  delete cfg[key];
  writeRuntime(cfg);
}

/**
 * Remove ALL runtime overrides.
 */
export function clearRuntimeConfig() {
  try {
    localStorage.removeItem(RUNTIME_KEY);
  } catch {
    // ignore
  }
}

/**
 * Return a snapshot of all three config layers merged in priority order.
 * @returns {Record<string, unknown>}
 */
export function getConfigSnapshot() {
  const buildCfg =
    typeof globalThis !== "undefined" &&
    /** @type {Record<string, Record<string, unknown>>} */ (globalThis).__WEDDING_CONFIG__;
  return {
    ...DEFAULTS,
    ...(buildCfg ?? {}),
    ...readRuntime(),
  };
}

/** @returns {string[]} All known default config keys */
export function listConfigKeys() {
  return Object.keys(DEFAULTS);
}
