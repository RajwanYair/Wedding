/**
 * src/utils/toast.js — Toast notification queue (Sprint 12 / Phase 6)
 *
 * Provides a lightweight, accessible toast queue that:
 *  - Renders toasts in a portal container at top of DOM
 *  - Supports success, error, info, warning variants
 *  - Auto-dismisses after configurable duration (default 4 s)
 *  - Stacks up to MAX_VISIBLE visible at once; queues the rest
 *  - Uses role="alert" / aria-live for screen-reader accessibility
 *  - Zero CSS coupling — applies BEM class names only
 *
 * Usage:
 *   import { toast } from "../utils/toast.js";
 *   toast.success("Guest saved");
 *   toast.error("Save failed", { duration: 6000 });
 *   toast.info("Syncing…", { persistent: true, id: "sync" });
 *   toast.dismiss("sync");
 */

/** @typedef {"success"|"error"|"info"|"warning"} ToastVariant */

/** @typedef {{ id?: string, duration?: number, persistent?: boolean }} ToastOptions */

/** @typedef {{ id: string, message: string, variant: ToastVariant, opts: Required<ToastOptions> }} ToastItem */

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 4000;

/** @type {ToastItem[]} active visible toasts */
const _active = [];
/** @type {ToastItem[]} waiting to be shown */
const _queue = [];

/** @type {Map<string, ReturnType<typeof setTimeout>>} id -> timer */
const _timers = new Map();

/** @type {HTMLElement | null} lazily created portal element */
let _portal = null;

// ── Public API ────────────────────────────────────────────────────────────

export const toast = {
  /**
   * Show a success toast.
   * @param {string} message
   * @param {ToastOptions} [opts]
   */
  success(message, opts = {}) { _enqueue(message, "success", opts); },

  /**
   * Show an error toast.
   * @param {string} message
   * @param {ToastOptions} [opts]
   */
  error(message, opts = {}) { _enqueue(message, "error", opts); },

  /**
   * Show an informational toast.
   * @param {string} message
   * @param {ToastOptions} [opts]
   */
  info(message, opts = {}) { _enqueue(message, "info", opts); },

  /**
   * Show a warning toast.
   * @param {string} message
   * @param {ToastOptions} [opts]
   */
  warning(message, opts = {}) { _enqueue(message, "warning", opts); },

  /**
   * Dismiss a toast by its id.
   * @param {string} id
   */
  dismiss(id) { _dismiss(id); },

  /**
   * Dismiss all active and queued toasts.
   */
  clear() {
    [..._active].forEach((t) => _dismiss(t.id));
    _queue.length = 0;
  },

  /**
   * Returns the number of currently visible toasts (for testing).
   * @returns {number}
   */
  activeCount() { return _active.length; },

  /**
   * Returns the number of queued (hidden) toasts (for testing).
   * @returns {number}
   */
  queuedCount() { return _queue.length; },
};

// ── Internal ──────────────────────────────────────────────────────────────

/**
 * @param {string} message
 * @param {ToastVariant} variant
 * @param {ToastOptions} opts
 */
function _enqueue(message, variant, opts) {
  const id = opts.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const item = /** @type {ToastItem} */ ({
    id,
    message,
    variant,
    opts: {
      id,
      duration: opts.duration ?? DEFAULT_DURATION,
      persistent: opts.persistent ?? false,
    },
  });

  // If an active toast with same id exists, replace it
  const existingIdx = _active.findIndex((t) => t.id === id);
  if (existingIdx !== -1) {
    _dismiss(id, /* replace */ true);
  }

  if (_active.length < MAX_VISIBLE) {
    _show(item);
  } else {
    _queue.push(item);
  }
}

/** @param {ToastItem} item */
function _show(item) {
  _active.push(item);
  _renderToast(item);

  if (!item.opts.persistent) {
    const timer = setTimeout(() => _dismiss(item.id), item.opts.duration);
    _timers.set(item.id, timer);
  }
}

/**
 * @param {string} id
 * @param {boolean} [silent]  skip DOM remove animation for replace
 */
function _dismiss(id, silent = false) {
  const idx = _active.findIndex((t) => t.id === id);
  if (idx === -1) return;

  _active.splice(idx, 1);

  // Clear auto-dismiss timer
  const timer = _timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    _timers.delete(id);
  }

  // Remove DOM element
  if (!silent) {
    const el = _portal?.querySelector(`[data-toast-id="${CSS.escape(id)}"]`);
    if (el) {
      el.classList.add("toast--leaving");
      setTimeout(() => el.remove(), 300);
    }
  }

  // Promote next queued toast
  if (_queue.length > 0) {
    const next = /** @type {ToastItem} */ (_queue.shift());
    _show(next);
  }
}

/** @param {ToastItem} item */
function _renderToast(item) {
  const portal = _getPortal();
  const el = document.createElement("div");
  el.className = `toast toast--${item.variant}`;
  el.setAttribute("role", item.variant === "error" ? "alert" : "status");
  el.setAttribute("aria-live", item.variant === "error" ? "assertive" : "polite");
  el.setAttribute("data-toast-id", item.id);

  const text = document.createElement("span");
  text.className = "toast__message";
  text.textContent = item.message;
  el.appendChild(text);

  const closeBtn = document.createElement("button");
  closeBtn.className = "toast__close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => _dismiss(item.id));
  el.appendChild(closeBtn);

  portal.appendChild(el);
}

function _getPortal() {
  if (_portal) return _portal;
  _portal = document.createElement("div");
  _portal.id = "toast-portal";
  _portal.className = "toast-portal";
  _portal.setAttribute("aria-label", "Notifications");
  document.body.appendChild(_portal);
  return _portal;
}

/**
 * Reset internal state (for testing).
 * @internal
 */
export function _resetToastState() {
  toast.clear();
  _portal?.remove();
  _portal = null;
}
