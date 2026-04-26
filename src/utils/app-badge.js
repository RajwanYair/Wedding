/**
 * app-badge.js
 *
 * Thin wrapper around the App Badging API. No-ops on browsers that do not
 * support it (Safari iOS/macOS, older Firefox). All calls are guarded with
 * try/catch — badge updates must never throw into the main app flow.
 */

function hasBadgeApi() {
  return typeof navigator !== "undefined" && typeof navigator.setAppBadge === "function";
}

export async function updateBadge(count) {
  if (!hasBadgeApi()) return false;
  try {
    const n = Number(count);
    if (!Number.isFinite(n) || n <= 0) {
      await navigator.clearAppBadge();
    } else {
      await navigator.setAppBadge(Math.floor(n));
    }
    return true;
  } catch {
    return false;
  }
}

export async function clearBadge() {
  if (!hasBadgeApi()) return false;
  try {
    await navigator.clearAppBadge();
    return true;
  } catch {
    return false;
  }
}
