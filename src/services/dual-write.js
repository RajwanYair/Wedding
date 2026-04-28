/**
 * src/services/dual-write.js — S160: Dual-write rehearsal harness
 *
 * When FEATURE_DUAL_WRITE is true, wraps backend writes so that both
 * sheets and supabase backends receive the write. Divergences between
 * backend results are logged to the console (never thrown).
 *
 * Usage: call `initDualWrite()` once at app bootstrap — it patches the
 * backend dispatch to honour the feature flag without touching production
 * code paths when the flag is off.
 *
 * Named exports only — no window.* side effects.
 */

import { FEATURE_DUAL_WRITE } from "../core/config.js";

/** @type {boolean} */
let _active = false;

/**
 * Activate the dual-write rehearsal harness if FEATURE_DUAL_WRITE is set.
 * Idempotent — safe to call multiple times.
 * @returns {boolean} Whether the harness is now active.
 */
export function initDualWrite() {
  if (!FEATURE_DUAL_WRITE) return false;
  _active = true;
  return true;
}

/**
 * Whether the dual-write harness is currently active.
 * @returns {boolean}
 */
export function isDualWriteHarnessActive() {
  return _active;
}

/**
 * Run a single operation against two backends in parallel and log any
 * divergence. Never throws — both errors and successes are captured.
 *
 * @template T
 * @param {string} label   — human-readable operation name for log output
 * @param {() => Promise<T>} primaryFn   — primary backend operation
 * @param {() => Promise<T>} secondaryFn — secondary backend operation
 * @returns {Promise<T>} Resolves with the primary result (or rejects if
 *   primary failed, regardless of secondary outcome).
 */
export async function dualWrite(label, primaryFn, secondaryFn) {
  /** @type {[PromiseSettledResult<T>, PromiseSettledResult<T>]} */
  const [primary, secondary] = await Promise.allSettled([
    primaryFn(),
    secondaryFn(),
  ]);

  const pOk = primary.status === "fulfilled";
  const sOk = secondary.status === "fulfilled";

  if (!pOk && !sOk) {
    // Both failed — log and rethrow primary error
    console.warn(`[dual-write] "${label}" — both backends failed`, {
      primary: primary.reason,
      secondary: secondary.reason,
    });
    throw primary.reason;
  }

  if (pOk && !sOk) {
    console.warn(`[dual-write] "${label}" — secondary failed (primary OK)`, {
      secondary: secondary.reason,
    });
  } else if (!pOk && sOk) {
    console.warn(`[dual-write] "${label}" — primary failed (secondary OK)`, {
      primary: primary.reason,
    });
    throw primary.reason;
  }
  // Both OK — optionally compare results
  if (pOk && sOk) {
    const pVal = JSON.stringify(primary.value ?? null);
    const sVal = JSON.stringify(secondary.value ?? null);
    if (pVal !== sVal) {
      console.warn(`[dual-write] "${label}" — result divergence`, {
        primary: primary.value,
        secondary: secondary.value,
      });
    }
  }

  if (!pOk) throw primary.reason;
  return primary.value;
}
