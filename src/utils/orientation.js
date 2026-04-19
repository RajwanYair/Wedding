/**
 * src/utils/orientation.js — Screen Orientation API wrapper (S23g)
 *
 * Wraps `screen.orientation.lock()` / `unlock()` for viewport locking during
 * camera-based check-in mode. Safe to import everywhere — `isOrientationLockSupported()`
 * guards all actual API calls.
 *
 * Usage:
 *   await lockOrientation("portrait");   // lock before camera scan
 *   unlockOrientation();                  // release after scan ends
 *
 * No window.* side-effects. ESM. Zero runtime deps.
 */

// ── Feature detection ─────────────────────────────────────────────────────

/**
 * True when `screen.orientation.lock` is callable.
 * Requires HTTPS + browser support (Chrome Android 38+; not Safari).
 * @returns {boolean}
 */
export function isOrientationLockSupported() {
  const s = typeof globalThis !== "undefined" ? globalThis.screen : null;
  return (
    s != null &&
    s.orientation != null &&
    typeof s.orientation.lock === "function"
  );
}

// ── Orientation control ───────────────────────────────────────────────────

/**
 * Valid orientation lock type strings per the Screen Orientation API spec.
 * @typedef {"any"|"natural"|"landscape"|"portrait"|"portrait-primary"|"portrait-secondary"|"landscape-primary"|"landscape-secondary"} OrientationType
 */

/**
 * Lock the screen to the given orientation.
 * Resolves `true` on success, `false` when unsupported.
 * Rejects when the screen is not in a state that allows locking
 * (e.g. desktop, or permission denied by browser).
 *
 * @param {OrientationType} [type="portrait"]
 * @returns {Promise<boolean>}
 */
export async function lockOrientation(type = "portrait") {
  if (!isOrientationLockSupported()) {
    return false;
  }
  try {
    await globalThis.screen.orientation.lock(type);
    return true;
  } catch (err) {
    // NotSupportedError / SecurityError — not fatal
    console.warn("[orientation] lock failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Release the orientation lock, allowing the screen to rotate freely.
 * @returns {boolean} true if unlock was attempted, false if unsupported
 */
export function unlockOrientation() {
  if (!isOrientationLockSupported()) {
    return false;
  }
  globalThis.screen.orientation.unlock();
  return true;
}
