/**
 * src/utils/announcement-queue.js — ARIA live-region announcement queue (Sprint 205)
 *
 * Serialises screen-reader announcements to avoid interruptions.
 * DOM-independent queue logic; DOM injection is encapsulated in init().
 *
 * Zero dependencies.
 */

/** @type {string[]} */
const _queue = [];
let _busy = false;
let _delay = 150; // ms between announcements
let _live = null; // ARIA live region element

/**
 * Configure the announcement delay (ms).
 * @param {number} ms
 */
export function setAnnouncementDelay(ms) {
  _delay = ms;
}

/**
 * Queue an announcement for screen readers.
 * @param {string} message
 * @param {{ priority?: "polite"|"assertive" }} [opts]
 */
export function announce(message, opts = {}) {
  if (!message) return;
  const { priority = "polite" } = opts;
  _queue.push(JSON.stringify({ message, priority }));
  _flush();
}

function _flush() {
  if (_busy || !_queue.length) return;
  _busy = true;
  const raw = _queue.shift();
  const { message, priority } = JSON.parse(raw);
  if (_live) {
    _live.setAttribute("aria-live", priority);
    _live.textContent = "";
    // Force repaint to ensure screen reader picks up new content
    setTimeout(() => {
      if (_live) _live.textContent = message;
      setTimeout(() => {
        _busy = false;
        _flush();
      }, _delay);
    }, 20);
  } else {
    _busy = false;
    _flush();
  }
}

/**
 * Initialise the ARIA live region in the DOM (call once at app boot).
 * Creates a visually-hidden element and appends it to document.body.
 * @returns {() => void}  Cleanup function.
 */
export function initAnnouncements() {
  if (typeof document === "undefined") return () => {};
  const el = document.createElement("div");
  el.setAttribute("aria-live", "polite");
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("aria-relevant", "additions");
  el.className = "sr-only";
  el.id = "announcement-region";
  document.body.appendChild(el);
  _live = el;
  return () => {
    el.remove();
    _live = null;
  };
}

/**
 * Set a custom live region element (useful for tests).
 * @param {HTMLElement|null} el
 */
export function setLiveRegion(el) {
  _live = el;
}

/**
 * Clear all pending announcements.
 */
export function clearAnnouncements() {
  _queue.length = 0;
  _busy = false;
}

/**
 * Return current queue length (for testing / debugging).
 * @returns {number}
 */
export function pendingCount() {
  return _queue.length;
}
