/**
 * src/core/sync.js — Thin re-export bridge for the write-queue API.
 *
 * Sections import sync primitives from here so they do NOT depend on the
 * services layer directly. Actual implementation lives in services/sheets.js;
 * this bridge lets `scripts/arch-check.mjs` (ROADMAP §3.3 / Phase B9)
 * pass without every section reaching into a service directly.
 *
 * Usage:
 *   import { enqueueWrite, syncStoreKeyToSheets } from "../core/sync.js";
 */
export {
  enqueueWrite,
  syncStoreKeyToSheets,
  appendToRsvpLog,
  queueSize,
  queueKeys,
  onSyncStatus,
} from "../services/sheets.js";
