/**
 * src/core/nav.js — Tab navigation, hash router, swipe, pull-to-refresh
 *
 * S2.1  View Transitions API (graceful fallback)
 * S2.7  Swipe-left / swipe-right between sections
 * S2.8  Pull-to-refresh gesture -> triggers sync callback
 * Router: hash-based section routing with replaceState
 *
 * Named exports only — no window.* side effects.
 */

// ── State ─────────────────────────────────────────────────────────────────
import { SECTION_LIST } from "./constants.js";

/**
 * Navigable sections — imported from constants.js (single source of truth).
 * @type {readonly string[]}
 */
const _sections = SECTION_LIST;

/** @type {string} */
let _activeSection = "dashboard";

/** @type {ReturnType<typeof setTimeout> | null} */
let _swipeTimer = null;

// ── Helpers ───────────────────────────────────────────────────────────────
/**
 * Wrap a DOM mutation in document.startViewTransition when available (S2.1).
 * @param {() => void} fn
 */
function _withViewTransition(fn) {
  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(fn);
  } else {
    fn();
  }
}

/**
 * Navigate to a section by name. Updates URL hash and triggers delegation.
 * @param {string} name
 */
export function navigateTo(name) {
  if (!name) return;
  _activeSection = name;
  history.replaceState(null, "", `#${name}`);
  _withViewTransition(() => {
    const tab = document.querySelector(
      `[data-action="showSection"][data-action-arg="${CSS.escape(name)}"]`,
    );
    if (tab)
      tab.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
  });
}

/**
 * Return the currently active section name.
 * @returns {string}
 */
export function activeSection() {
  return _activeSection;
}

// ── Hash Router ───────────────────────────────────────────────────────────
/**
 * Initialise the hash router. Reads the current URL hash on startup and
 * navigates to the matching section. Listens for hashchange (back/forward).
 */
export function initRouter() {
  function _handleHash() {
    const hash = location.hash.slice(1).trim();
    const name = _sections.includes(hash) ? hash : "dashboard";
    _activeSection = name;
    const tab = document.querySelector(
      `[data-action="showSection"][data-action-arg="${CSS.escape(name)}"]`,
    );
    if (tab)
      tab.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
  }
  window.addEventListener("hashchange", _handleHash, { passive: true });
  _handleHash();
}

// ── Swipe gestures (S2.7) ─────────────────────────────────────────────────
/**
 * Enable swipe-left/right navigation between sections.
 * @param {HTMLElement} [container]
 */
export function initSwipe(container = document.body) {
  let startX = 0;
  let startY = 0;

  container.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true },
  );

  container.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 40) return;
      const dir = dx < 0 ? 1 : -1; // swipe left -> next; swipe right -> prev
      const idx = _sections.indexOf(_activeSection);
      const next = _sections[idx + dir];
      if (next) {
        if (_swipeTimer) clearTimeout(_swipeTimer);
        _swipeTimer = setTimeout(() => navigateTo(next), 0);
      }
    },
    { passive: true },
  );
}

// ── Pull-to-refresh (S2.8) ────────────────────────────────────────────────
/**
 * Enable pull-to-refresh gesture. Triggers onRefresh() when the user
 * drags down > 64px from the top of the page while already at scroll-top.
 *
 * CSS classes on body: ptr--pulling (dragging), ptr--refreshing (loading).
 *
 * @param {() => Promise<void>} onRefresh   Async callback to run on release
 * @param {HTMLElement} [container]
 */
export function initPullToRefresh(onRefresh, container = document.body) {
  const THRESHOLD = 64; // px pull-down to trigger refresh
  let _startY = 0;
  let _pulling = false;
  let _refreshing = false;

  container.addEventListener(
    "touchstart",
    (e) => {
      if (_refreshing) return;
      if (window.scrollY !== 0) return;
      _startY = e.touches[0].clientY;
      _pulling = false;
    },
    { passive: true },
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (_refreshing) return;
      const dy = e.touches[0].clientY - _startY;
      if (dy > 20 && window.scrollY === 0) {
        _pulling = true;
        const pct = Math.min(dy / THRESHOLD, 1);
        document.body.style.setProperty(
          "--ptr-pull",
          String(Math.round(pct * THRESHOLD)),
        );
        document.body.classList.toggle("ptr--pulling", pct >= 1);
      }
    },
    { passive: true },
  );

  container.addEventListener(
    "touchend",
    async () => {
      const pull = parseFloat(
        document.body.style.getPropertyValue("--ptr-pull") || "0",
      );
      document.body.style.removeProperty("--ptr-pull");
      document.body.classList.remove("ptr--pulling");
      if (!_pulling || pull < THRESHOLD) {
        _pulling = false;
        return;
      }
      _pulling = false;
      _refreshing = true;
      document.body.classList.add("ptr--refreshing");
      try {
        await onRefresh();
      } catch {
        // ignore
      }
      document.body.classList.remove("ptr--refreshing");
      _refreshing = false;
    },
    { passive: true },
  );
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────

/**
 * Register Alt+1 through Alt+9 keyboard shortcuts to jump to sections.
 * Works on desktop browsers; ignored when focus is in an input/textarea.
 *
 * Mapping: Alt+1 = _sections[0], Alt+2 = _sections[1], …, Alt+9 = _sections[8]
 *
 * @returns {() => void} Cleanup function that removes the listener.
 */
export function initKeyboardShortcuts() {
  /**
   * @param {KeyboardEvent} e
   */
  const handler = (e) => {
    // Skip if user is typing in an input/textarea/select/contenteditable
    const tag = /** @type {HTMLElement} */ (e.target).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (/** @type {HTMLElement} */ (e.target).isContentEditable) return;

    if (!e.altKey) return;

    const num = parseInt(e.key, 10);
    if (Number.isNaN(num) || num < 1 || num > 9) return;

    const target = _sections[num - 1];
    if (target) {
      e.preventDefault();
      navigateTo(target);
    }
  };

  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}

// ── Sprint 9: Keyboard Shortcuts Help Overlay ────────────────────────────

/**
 * Show/hide a keyboard shortcuts help overlay.
 * Triggered by `?` key (when not in an input field).
 * @returns {() => void} cleanup function
 */
export function initShortcutsHelp() {
  /** @param {KeyboardEvent} e */
  const handler = (e) => {
    const tag = /** @type {HTMLElement} */ (e.target).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (/** @type {HTMLElement} */ (e.target).isContentEditable) return;

    if (e.key === "?") {
      e.preventDefault();
      _toggleShortcutsOverlay();
    }
    if (e.key === "Escape") {
      const overlay = document.getElementById("shortcutsOverlay");
      if (overlay && !overlay.hidden) {
        overlay.hidden = true;
      }
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}

function _toggleShortcutsOverlay() {
  let overlay = document.getElementById("shortcutsOverlay");
  if (overlay) {
    overlay.hidden = !overlay.hidden;
    return;
  }
  overlay = document.createElement("div");
  overlay.id = "shortcutsOverlay";
  overlay.className = "shortcuts-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Keyboard shortcuts");

  const shortcuts = _sections.slice(0, 9).map(
    (s, i) => `<kbd>Alt+${i + 1}</kbd> ${s}`,
  );
  shortcuts.push("<kbd>?</kbd> Show this help");
  shortcuts.push("<kbd>Esc</kbd> Close overlay / modal");

  const inner = document.createElement("div");
  inner.className = "shortcuts-inner";
  const title = document.createElement("h3");
  title.textContent = "⌨️ Keyboard Shortcuts";
  inner.appendChild(title);
  const list = document.createElement("ul");
  list.className = "shortcuts-list";
  for (const s of shortcuts) {
    const li = document.createElement("li");
    li.innerHTML = s;
    list.appendChild(li);
  }
  inner.appendChild(list);
  const closeBtn = document.createElement("button");
  closeBtn.className = "btn btn-secondary u-mt-sm";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => { overlay.hidden = true; });
  inner.appendChild(closeBtn);
  overlay.appendChild(inner);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });
  document.body.appendChild(overlay);
}
