/**
 * src/services/session-security.js — Session timeout guard (Sprint 87)
 *
 * Creates a watcher that calls `onTimeout` after a period of inactivity.
 * Activity is tracked via `recordActivity()`.  Runs entirely in-memory
 * using setTimeout — no DOM deps (DOM-free for testing).
 */

/**
 * @typedef {{
 *   timeoutMs: number,
 *   warningMs?: number,
 *   onTimeout: () => void,
 *   onWarning?: () => void
 * }} SessionGuardOptions
 *
 * @typedef {{
 *   recordActivity(): void,
 *   destroy(): void,
 *   remainingMs(): number,
 *   reset(): void
 * }} SessionGuard
 */

/**
 * Create a session inactivity guard.
 *
 * @param {SessionGuardOptions} opts
 * @returns {SessionGuard}
 */
export function createSessionGuard(opts) {
  const { timeoutMs, warningMs, onTimeout, onWarning } = opts;
  if (timeoutMs < 1) throw new RangeError("timeoutMs must be >= 1");

  let lastActivity = Date.now();
  let timeoutHandle = null;
  let warningHandle = null;
  let destroyed = false;

  function clearTimers() {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    if (warningHandle !== null) {
      clearTimeout(warningHandle);
      warningHandle = null;
    }
  }

  function scheduleTimers() {
    if (destroyed) return;
    clearTimers();
    timeoutHandle = setTimeout(() => {
      if (!destroyed) onTimeout();
    }, timeoutMs);

    if (typeof warningMs === "number" && warningMs < timeoutMs && onWarning) {
      warningHandle = setTimeout(() => {
        if (!destroyed) onWarning();
      }, timeoutMs - warningMs);
    }
  }

  scheduleTimers();

  return {
    /** Call whenever the user performs an action. */
    recordActivity() {
      if (destroyed) return;
      lastActivity = Date.now();
      scheduleTimers();
    },

    /** Tear down all timers. */
    destroy() {
      destroyed = true;
      clearTimers();
    },

    /** Approximate remaining ms before timeout. */
    remainingMs() {
      return Math.max(0, lastActivity + timeoutMs - Date.now());
    },

    /** Reset the timer without recording a user gesture. */
    reset() {
      if (destroyed) return;
      lastActivity = Date.now();
      scheduleTimers();
    },
  };
}
