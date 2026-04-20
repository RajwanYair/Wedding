/**
 * src/core/ui.js — UI primitives: toast + modal (S0 named-export module)
 *
 * Named-export version of ui.js primitives.
 * No window.* side effects.
 */

import { STORAGE_KEYS } from "./constants.js";
import { t } from "./i18n.js";
import {
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from "./storage.js";

// ── Toast ─────────────────────────────────────────────────────────────────

let _toastContainer = /** @type {HTMLElement | null} */ (null);
let _toastCount = 0;
const _TOAST_DURATION = 3000;

function _getContainer() {
  if (!_toastContainer) {
    _toastContainer = document.getElementById("toastContainer");
    if (!_toastContainer) {
      _toastContainer = document.createElement("div");
      _toastContainer.id = "toastContainer";
      _toastContainer.setAttribute("role", "region");
      _toastContainer.setAttribute("aria-live", "polite");
      _toastContainer.setAttribute("aria-atomic", "false");
      document.body.appendChild(_toastContainer);
    }
  }
  return _toastContainer;
}

/**
 * Show a stacking toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type]
 * @param {number} [duration]
 */
export function showToast(message, type = "info", duration = _TOAST_DURATION) {
  const container = _getContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  // S7.9: Use role="alert" + assertive for errors/warnings; status+polite for others
  const isUrgent = type === "error" || type === "warning";
  toast.setAttribute("role", isUrgent ? "alert" : "status");
  toast.setAttribute("aria-live", isUrgent ? "assertive" : "polite");
  toast.id = `toast-${++_toastCount}`;

  const msgEl = document.createElement("span");
  msgEl.className = "toast-message";
  msgEl.textContent = message;

  const progress = document.createElement("div");
  progress.className = "toast-progress";

  toast.appendChild(msgEl);
  toast.appendChild(progress);
  container.appendChild(toast);

  const remove = () => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove(), {
      once: true,
    });
  };

  toast.addEventListener("click", remove, { once: true });
  setTimeout(remove, duration);
}

// ── Modal ─────────────────────────────────────────────────────────────────

let _modalOpener = /** @type {HTMLElement | null} */ (null);

const _modalGlob = /** @type {Record<string, () => Promise<{ default: string }>>} */ (
  import.meta.glob("../modals/*.html", {
    query: "?raw",
    eager: false,
  })
);

/** @type {Map<string, () => Promise<{ default: string }>>} */
const _modalLoaders = new Map();
for (const [path, loader] of Object.entries(_modalGlob)) {
  // path => "../modals/guestModal.html" → "guestModal"
  const match = path.match(/\/([^/]+)\.html$/);
  if (match) _modalLoaders.set(match[1], /** @type {any} */ (loader));
}

/**
 * Lazy-load modal HTML into an empty shell div on first open.
 * @param {HTMLElement} modal
 * @param {string} modalId
 */
async function _ensureModalLoaded(modal, modalId) {
  if (modal.dataset.loaded === "1") return;
  const loader = _modalLoaders.get(modalId);
  if (!loader) {
    console.warn(`[ui] No modal template found for: ${modalId}`);
    return;
  }
  try {
    const { default: html } = await loader();
    modal.innerHTML = html; // safe: templates from src/modals/ (no user input)
    modal.dataset.loaded = "1";
    const { applyI18n } = await import("./i18n.js");
    applyI18n(modal);
  } catch {
    // template unavailable — modal will remain empty
  }
}

/**
 * Open a modal by ID, trapping focus inside it.
 * Lazy-loads modal HTML template on first open.
 * @param {string} modalId
 */
export async function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  await _ensureModalLoaded(modal, modalId);
  _modalOpener = /** @type {HTMLElement | null} */ (document.activeElement);
  modal.hidden = false;
  modal.classList.remove("auth-hidden");
  modal.setAttribute("aria-modal", "true");
  modal.removeAttribute("aria-hidden");
  const first = modal.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  /** @type {HTMLElement | null} */ (first)?.focus();
  _installFocusTrap(modal);
}

/**
 * Close a modal by ID, restoring focus to the element that opened it.
 * @param {string} modalId
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.hidden = true;
  modal.classList.add("auth-hidden");
  modal.setAttribute("aria-hidden", "true");
  modal.removeAttribute("aria-modal");
  _removeFocusTrap(modal);
  _modalOpener?.focus();
  _modalOpener = null;
}

// ── Focus Trap (Sprint 1: A11y) ───────────────────────────────────────────

/** @type {WeakMap<HTMLElement, (e: KeyboardEvent) => void>} */
const _trapListeners = new WeakMap();

/**
 * Install a keyboard focus trap on a modal element.
 * Tab/Shift+Tab cycle within the modal. Escape closes it.
 * @param {HTMLElement} modal
 */
function _installFocusTrap(modal) {
  if (_trapListeners.has(modal)) return;
  const handler = /** @param {KeyboardEvent} e */ (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal(modal.id);
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = /** @type {HTMLElement[]} */ ([
      ...modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ]);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else if (document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };
  _trapListeners.set(modal, handler);
  modal.addEventListener("keydown", handler);
}

/**
 * Remove the focus trap from a modal element.
 * @param {HTMLElement} modal
 */
function _removeFocusTrap(modal) {
  const handler = _trapListeners.get(modal);
  if (handler) {
    modal.removeEventListener("keydown", handler);
    _trapListeners.delete(modal);
  }
}

/**
 * Show a confirmation dialog using the native `confirm()` API.
 * (Replace with a custom modal in a future sprint.)
 * @param {string} messageKey  i18n key
 * @returns {boolean}
 */
export function confirmDialog(messageKey) {
  return confirm(t(messageKey, messageKey));
}

/**
 * Show a confirmation dialog and invoke a callback if confirmed.
 * Passes the resolved i18n message to the native confirm dialog.
 * @param {string} message  — already-translated string (or i18n key fallback)
 * @param {() => void} onConfirm  — callback invoked when user confirms
 * @returns {boolean}  true if confirmed
 */
export function showConfirmDialog(message, onConfirm) {
  const confirmed = confirm(message);
  if (confirmed) onConfirm();
  return confirmed;
}

// ── Theme ─────────────────────────────────────────────────────────────────

const THEMES = [
  "default",
  "rosegold",
  "gold",
  "emerald",
  "royal",
  "high-contrast",
];
let _themeIdx = 0;

/**
 * Cycle through the 6 design themes (applies a body class).
 */
export function cycleTheme() {
  _themeIdx = (_themeIdx + 1) % THEMES.length;
  const theme = THEMES[_themeIdx];
  document.body.className = document.body.className
    .replace(/\btheme-\S+/g, "")
    .trim();
  if (theme !== "default") document.body.classList.add(`theme-${theme}`);
  writeBrowserStorage(STORAGE_KEYS.THEME, theme);
}

/**
 * Toggle light/dark mode (adds/removes `.light-mode` on body).
 */
export function toggleLightMode() {
  document.body.classList.toggle("light-mode");
  writeBrowserStorage(
    STORAGE_KEYS.LIGHT_MODE,
    String(document.body.classList.contains("light-mode")),
  );
}

/**
 * Toggle mobile nav drawer (adds/removes `.nav-open` on body).
 */
export function toggleMobileNav() {
  document.body.classList.toggle("nav-open");
}

/**
 * Restore persisted theme + light-mode on startup.
 */
export function restoreTheme() {
  const theme = readBrowserStorage(STORAGE_KEYS.THEME, "default") ?? "default";
  const idx = THEMES.indexOf(theme);
  if (idx !== -1) {
    _themeIdx = idx;
    if (theme !== "default") document.body.classList.add(`theme-${theme}`);
  }
  const savedLight = readBrowserStorage(STORAGE_KEYS.LIGHT_MODE);
  if (savedLight === "true") {
    document.body.classList.add("light-mode");
  } else if (savedLight === null) {
    // F3.3 — Auto-detect system preference when no explicit choice was saved
    if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      document.body.classList.add("light-mode");
    }
  }
}

// ── Service Worker Update Banner ──────────────────────────────────────────

/** Reference to the waiting SW (set by initSW, used by applyUpdate) */
let _pendingSW = /** @type {ServiceWorker | null} */ (null);

/**
 * Tell the waiting SW to skip waiting (triggers controllerchange → reload),
 * or hard-reload if no SW is pending.
 */
export function applyUpdate() {
  if (_pendingSW) {
    _pendingSW.postMessage("SKIP_WAITING");
  } else {
    window.location.reload();
  }
}

/**
 * Show a persistent top banner prompting the user to reload for new content.
 * No-op if the banner is already visible.
 */
export function showUpdateBanner() {
  if (document.getElementById("updateBanner")) return;
  const banner = document.createElement("div");
  banner.id = "updateBanner";
  banner.className = "update-banner";

  const msg = document.createElement("span");
  msg.className = "update-banner-msg";
  msg.textContent = t("sw_update_msg");

  const btn = document.createElement("button");
  btn.className = "btn btn-primary update-banner-btn";
  btn.textContent = t("sw_update_btn");
  btn.addEventListener("click", () => applyUpdate());

  const dismiss = document.createElement("button");
  dismiss.className = "update-banner-dismiss";
  dismiss.textContent = "\u00d7";
  dismiss.setAttribute("aria-label", t("sw_update_dismiss_aria"));
  dismiss.addEventListener("click", () => banner.remove());

  banner.appendChild(msg);
  banner.appendChild(btn);
  banner.appendChild(dismiss);
  document.body.appendChild(banner);
}

/**
 * Register the service worker and wire update detection.
 * Shows the update banner when a new SW is waiting or when the SW broadcasts
 * UPDATE_AVAILABLE (stale-while-revalidate content change detected).
 * Auto-refreshes silently if the page has been open ≥ 5 minutes.
 */
export function initSW() {
  if (!("serviceWorker" in navigator)) return;

  const _pageOpenedAt = Date.now();
  const _AUTO_REFRESH_MS = 5 * 60 * 1000;
  let _swReg = /** @type {ServiceWorkerRegistration | null} */ (null);
  let _hiddenAt = 0;
  let _swRefreshing = false;

  /** Decide: silently reload (if page is old) or show the banner. */
  function _handleUpdate() {
    if (Date.now() - _pageOpenedAt >= _AUTO_REFRESH_MS) {
      applyUpdate();
    } else {
      showUpdateBanner();
    }
  }

  navigator.serviceWorker
    .register("./sw.js")
    .then((reg) => {
      _swReg = reg;
      if (reg.waiting) {
        _pendingSW = reg.waiting;
        _handleUpdate();
      }
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            _pendingSW = sw;
            _handleUpdate();
          }
        });
      });
      // Poll every 5 min so long-lived tabs pick up deploys
      setInterval(() => reg.update().catch(() => {}), _AUTO_REFRESH_MS);
    })
    .catch((err) => console.warn("SW registration failed:", err));

  // SW signals a content-level freshness change via postMessage
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "UPDATE_AVAILABLE") _handleUpdate();
    // Background Sync — SW notifies that rsvp-sync fired; flush the online queue (S18b)
    if (e.data?.type === "RSVP_SYNC_READY") {
      import("../services/sheets.js")
        .then(({ flushWriteQueue }) => flushWriteQueue?.())
        .catch(() => {});
    }
  });

  // When the tab comes back after ≥ 5 min hidden, re-check for updates
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      _hiddenAt = Date.now();
    } else if (_hiddenAt && Date.now() - _hiddenAt >= _AUTO_REFRESH_MS) {
      _swReg?.update().catch(() => {});
    }
  });

  // Once the new SW takes control, reload to serve fresh files
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (_swRefreshing) return;
    _swRefreshing = true;
    window.location.reload();
  });
}

// ── PWA Install Prompt ────────────────────────────────────────────────────

const _INSTALL_DISMISSED_KEY = STORAGE_KEYS.INSTALL_DISMISSED_UNTIL;
const _INSTALL_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const _INSTALL_DELAY_MS = 30_000; // show after 30 s of use

/**
 * Listen for the browser's `beforeinstallprompt` event, defer it, then show
 * a bottom banner after a short delay inviting the user to install the PWA.
 * - Skips if already running in standalone mode (already installed).
 * - Skips if the user dismissed within the last 30 days.
 * - Clicking "Install" triggers the native browser install dialog.
 * - Clicking × snoozes the banner for 30 days.
 */
export function initInstallPrompt() {
  // Already installed — nothing to do
  if (window.matchMedia("(display-mode: standalone)").matches) return;
  // User dismissed recently
  const until = Number(readBrowserStorage(_INSTALL_DISMISSED_KEY, "0") ?? 0);
  if (until > Date.now()) return;

  /** @type {any} */ let _deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredPrompt = e;

    setTimeout(() => {
      if (!_deferredPrompt) return;
      if (document.getElementById("installBanner")) return;

      const banner = document.createElement("div");
      banner.id = "installBanner";
      banner.className = "install-banner";
      banner.setAttribute("role", "complementary");
      banner.setAttribute("aria-label", t("install_banner_msg"));

      const icon = document.createElement("span");
      icon.className = "install-banner-icon";
      icon.textContent = "📲";

      const msg = document.createElement("span");
      msg.className = "install-banner-msg";
      msg.textContent = t("install_banner_msg");

      const btn = document.createElement("button");
      btn.className = "btn btn-primary install-banner-btn";
      btn.textContent = t("install_banner_btn");
      btn.addEventListener("click", async () => {
        banner.remove();
        _deferredPrompt.prompt();
        const { outcome } = await _deferredPrompt.userChoice;
        _deferredPrompt = null;
        if (outcome === "accepted") {
          removeBrowserStorage(_INSTALL_DISMISSED_KEY);
        }
      });

      const dismiss = document.createElement("button");
      dismiss.className = "install-banner-dismiss";
      dismiss.textContent = "\u00d7";
      dismiss.setAttribute("aria-label", t("install_banner_dismiss_aria"));
      dismiss.addEventListener("click", () => {
        banner.remove();
        _deferredPrompt = null;
        writeBrowserStorage(
          _INSTALL_DISMISSED_KEY,
          String(Date.now() + _INSTALL_SNOOZE_MS),
        );
      });

      banner.appendChild(icon);
      banner.appendChild(msg);
      banner.appendChild(btn);
      banner.appendChild(dismiss);
      document.body.appendChild(banner);
    }, _INSTALL_DELAY_MS);
  });
}

/**
 * Announce a message to screen readers via a dedicated aria-live region.
 * Creates the live region on first call. Polite for info, assertive for errors.
 *
 * @param {string} message      Text to announce
 * @param {'polite'|'assertive'} [politeness]  Default: 'polite'
 */
export function announce(message, politeness = "polite") {

  let region = /** @type {HTMLElement|null} */ (
    document.getElementById("ariaLiveRegion")
  );
  if (!region) {
    region = document.createElement("div");
    region.id = "ariaLiveRegion";
    region.setAttribute("aria-live", politeness);
    region.setAttribute("aria-atomic", "true");
    region.className = "u-visually-hidden";
    document.body.appendChild(region);
  } else {
    region.setAttribute("aria-live", politeness);
  }
  // Toggling content forces the browser to re-announce even identical text.
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
