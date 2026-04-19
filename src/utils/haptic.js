/**
 * src/utils/haptic.js — Haptic feedback via Web Vibration API (S23)
 *
 * Thin wrapper around `navigator.vibrate()` with standard patterns.
 * Safe to import everywhere — silently no-ops when the API is absent
 * (desktop, iOS Safari, Firefox for Android < 129).
 *
 * No `window.*` side-effects. ESM, zero runtime deps.
 */

// ── Feature detection ────────────────────────────────────────────────────

/**
 * Returns true when the Vibration API is available in this environment.
 * @returns {boolean}
 */
export function isVibrationSupported() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

// ── Patterns ──────────────────────────────────────────────────────────────

/** Standard pulse patterns (ms). */
export const HAPTIC = Object.freeze({
  /** Single short confirmation pulse — check-in success, RSVP submitted */
  SUCCESS:   [50],
  /** Double pulse — action toggle */
  DOUBLE:    [50, 80, 50],
  /** Error pattern — three short bursts */
  ERROR:     [80, 60, 80, 60, 80],
  /** Warning — single medium pulse */
  WARNING:   [120],
  /** Continuous scan-active pulse */
  SCAN:      [30, 120, 30],
});

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Trigger haptic feedback with the given vibration pattern.
 * No-ops silently when not supported.
 *
 * @param {number | number[]} pattern  Duration(s) in ms. Alternates on/off.
 * @returns {boolean}  `true` if the vibration was dispatched; `false` otherwise.
 */
export function vibrate(pattern = HAPTIC.SUCCESS) {
  if (!isVibrationSupported()) return false;
  try {
    return navigator.vibrate(pattern) !== false;
  } catch {
    return false;
  }
}

/**
 * Cancel any in-progress vibration.
 * @returns {boolean}
 */
export function cancelVibration() {
  return vibrate(0);
}
