/**
 * src/utils/error-monitor.js — Global error monitoring (Sprint 9 DX)
 *
 * Captures unhandled errors & promise rejections into localStorage
 * (ring-buffer, max 50). Surfaced in Settings for admin debugging.
 */

import { STORAGE_KEYS } from "../core/constants.js";
import { readBrowserStorageJson, writeBrowserStorageJson } from "../core/storage.js";

const STORAGE_KEY = STORAGE_KEYS.ERRORS;
const MAX_ENTRIES = 50;

/** @type {Array<{ts:string, message:string, source:string, stack:string}>} */
let _errors = [];

/** Load previously stored errors from localStorage. */
function _load() {
  _errors = readBrowserStorageJson(STORAGE_KEY, []);
}

/** Persist current errors to localStorage. */
function _persist() {
  writeBrowserStorageJson(STORAGE_KEY, _errors);
}

/**
 * Record a client-side error.
 * @param {{ message?: string, source?: string, lineno?: number, colno?: number, stack?: string }} info
 */
function _record(info) {
  _errors.unshift({
    ts: new Date().toISOString(),
    message: String(info.message || "Unknown error").slice(0, 300),
    source: String(info.source || "").slice(0, 120),
    stack: String(info.stack || "").slice(0, 500),
  });
  if (_errors.length > MAX_ENTRIES) _errors.length = MAX_ENTRIES;
  _persist();
}

/**
 * Install global error + rejection handlers.
 * Returns a cleanup function.
 */
export function initErrorMonitor() {
  _load();

  /** @param {ErrorEvent} e */
  const onError = (e) => {
    _record({
      message: e.message,
      source: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack,
    });
  };

  /** @param {PromiseRejectionEvent} e */
  const onRejection = (e) => {
    const reason = e.reason;
    _record({
      message: reason?.message || String(reason),
      stack: reason?.stack,
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

/**
 * Return captured errors (newest first).
 * @returns {ReadonlyArray<{ts:string, message:string, source:string, stack:string}>}
 */
export function getClientErrors() {
  _load();
  return _errors;
}

/** Clear all stored errors. */
export function clearClientErrors() {
  _errors = [];
  _persist();
}
