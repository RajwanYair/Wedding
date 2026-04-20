/**
 * src/utils/app-badge.js — PWA App Badging API wrapper (Phase 4.2)
 *
 * Sets the app icon badge count (unread/pending RSVP) via the
 * Badging API (navigator.setAppBadge / navigator.clearAppBadge).
 *
 * Gracefully no-ops on unsupported browsers — no errors thrown.
 * Zero dependencies, no DOM access.
 */

/**
 * True when the Badging API is available in this environment.
 * @returns {boolean}
 */
export function isBadgingSupported() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.setAppBadge === "function"
  );
}

/**
 * Update the app icon badge to show `count`.
 * A count of 0 clears the badge automatically.
 * Does nothing when the Badging API is unavailable.
 *
 * @param {number} count  Non-negative integer to display on the badge
 */
export function updateBadge(count) {
  if (!isBadgingSupported()) return;
  const n = Math.max(0, Math.round(count));
  if (n === 0) {
    navigator.clearAppBadge?.().catch(() => {/* ignore */});
  } else {
    navigator.setAppBadge(n).catch(() => {/* ignore — badge is best-effort */});
  }
}

/**
 * Clear the app icon badge entirely.
 * Does nothing when the Badging API is unavailable.
 */
export function clearBadge() {
  if (!isBadgingSupported()) return;
  navigator.clearAppBadge?.().catch(() => {/* ignore */});
}
