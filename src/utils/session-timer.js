/**
 * session-timer.js — Session timeout enforcement (Phase 1.4)
 *
 * Creates configurable session timers with warning + expiry callbacks.
 * Designed to enforce the 2-hour session rotation constant from config.js.
 *
 * Pure factory function — no module-level state; each call returns an
 * independent timer with its own lifecycle.
 *
 * @example
 *   const timer = createSessionTimer({
 *     timeoutMs: 2 * 60 * 60 * 1000,
 *     warningMs: 5 * 60 * 1000,
 *     onExpire: () => signOut(),
 *     onWarn:   () => showWarningBanner(),
 *   });
 *   timer.start();
 *   document.addEventListener('click', () => timer.reset());
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   timeoutMs: number,
 *   warningMs?: number,
 *   onExpire?: () => void,
 *   onWarn?:   () => void,
 * }} SessionTimerOptions
 *
 * @typedef {{
 *   start:         () => void,
 *   reset:         () => void,
 *   stop:          () => void,
 *   getRemainingMs: () => number,
 *   isExpired:     () => boolean,
 *   isRunning:     () => boolean,
 * }} SessionTimer
 */

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a session timer.
 * The timer does NOT start automatically — call `timer.start()`.
 *
 * @param {SessionTimerOptions} opts
 * @returns {SessionTimer}
 */
export function createSessionTimer(opts) {
  const { timeoutMs, warningMs, onExpire, onWarn } = opts;

  if (timeoutMs <= 0) throw new RangeError(`timeoutMs must be positive (got ${timeoutMs})`);
  if (warningMs !== undefined && warningMs >= timeoutMs) {
    throw new RangeError(`warningMs (${warningMs}) must be less than timeoutMs (${timeoutMs})`);
  }

  let _expiryId = null;
  let _warningId = null;
  let _startedAt = null;
  let _expired = false;

  function _clearTimers() {
    if (_expiryId !== null) { clearTimeout(_expiryId); _expiryId = null; }
    if (_warningId !== null) { clearTimeout(_warningId); _warningId = null; }
  }

  function _schedule() {
    _clearTimers();
    _startedAt = Date.now();
    _expired = false;

    _expiryId = setTimeout(() => {
      _expired = true;
      _expiryId = null;
      _warningId = null;
      onExpire?.();
    }, timeoutMs);

    if (warningMs !== undefined && warningMs > 0) {
      _warningId = setTimeout(() => {
        _warningId = null;
        onWarn?.();
      }, timeoutMs - warningMs);
    }
  }

  return {
    /** Start the timer. No-op if already running. */
    start() {
      if (_startedAt !== null && !_expired) return; // already running
      _schedule();
    },

    /** Reset the timer to the full duration (re-arms warning too). */
    reset() {
      if (_startedAt === null) return; // never started; ignore
      _schedule();
    },

    /** Stop the timer without triggering callbacks. */
    stop() {
      _clearTimers();
      _startedAt = null;
      _expired = false;
    },

    /**
     * Milliseconds remaining until expiry.
     * Returns 0 if expired or not running.
     */
    getRemainingMs() {
      if (_startedAt === null || _expired) return 0;
      const elapsed = Date.now() - _startedAt;
      return Math.max(0, timeoutMs - elapsed);
    },

    /** True if the timer has fired its expiry callback. */
    isExpired() { return _expired; },

    /** True if the timer is currently counting down. */
    isRunning() { return _startedAt !== null && !_expired; },
  };
}

// ---------------------------------------------------------------------------
// Activity-aware wrapper
// ---------------------------------------------------------------------------

/**
 * Create a session timer that automatically resets on user activity events.
 *
 * @param {SessionTimerOptions} opts
 * @param {string[]} [events]  DOM event names to listen on (defaults to click + keydown + touchstart)
 * @param {EventTarget} [target]  Event target (defaults to `window`)
 * @returns {{ timer: SessionTimer, destroy: () => void }}
 */
export function createActivityTimer(opts, events, target) {
  const _events = events ?? ['click', 'keydown', 'touchstart'];
  const _target = target ?? (typeof window !== 'undefined' ? window : null);
  const timer = createSessionTimer(opts);

  const _handler = () => timer.reset();

  if (_target) {
    for (const ev of _events) {
      _target.addEventListener(ev, _handler, { passive: true });
    }
  }

  timer.start();

  return {
    timer,
    destroy() {
      timer.stop();
      if (_target) {
        for (const ev of _events) {
          _target.removeEventListener(ev, _handler);
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format milliseconds as a human-readable countdown string (e.g. "1h 23m 45s").
 * @param {number} ms
 * @returns {string}
 */
export function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}
