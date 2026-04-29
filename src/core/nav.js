/**
 * src/core/nav.js — Tab navigation, hash router, swipe, pull-to-refresh
 *
 * S2.1  View Transitions API (graceful fallback)
 * S252  View Transitions scoped to #main-content (header/nav stay stable)
 * S2.7  Swipe-left / swipe-right between sections
 * S2.8  Pull-to-refresh gesture -> triggers sync callback
 * Router: hash-based section routing with pushState (back/forward button supported)
 *
 * Named exports only — no window.* side effects.
 */

// ── State ─────────────────────────────────────────────────────────────────
import { SECTION_LIST } from "./constants.js";

// ADR-025 R1: re-export the new pushState router API so callers can migrate
// incrementally. `navigate()` writes pushState entries; `navigateTo()` (below)
// remains the legacy hash-based path. Both coexist until ADR-025 R3.
export {
  navigate,
  currentRoute,
  onRouteChange,
  initRouterListener,
} from "./router.js";

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
 * Public wrapper around `document.startViewTransition`. Sections and handlers
 * can use this to animate their own DOM mutations with the same fallback
 * (executes the callback synchronously when the API is unavailable). (S92)
 * @param {() => void} fn
 */
export function withViewTransition(fn) {
  _withViewTransition(fn);
}

/**
 * Returns true when the View Transitions API is available. (S92)
 * @returns {boolean}
 */
export function isViewTransitionSupported() {
  return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

/**
 * Navigate to a section by name. Pushes a history entry (back button works).
 * @param {string} name
 */
export function navigateTo(name) {
  if (!name) return;
  _activeSection = name;
  // pushState adds a history entry so browser back/forward works.
  // Guard against duplicate entries when re-navigating to the active section.
  if (location.hash !== `#${name}`) {
    history.pushState(null, "", `#${name}`);
  }
  _withViewTransition(() => {
    const tab = document.querySelector(
      `[data-action="showSection"][data-action-arg="${CSS.escape(name)}"]`,
    );
    if (tab) tab.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
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
 * navigates to the matching section. Listens for hashchange and popstate
 * so both hash-link navigation and browser back/forward work correctly.
 */
export function initRouter() {
  function _handleHash() {
    const hash = location.hash.slice(1).trim();
    const name = _sections.includes(hash) ? hash : "dashboard";
    _activeSection = name;
    _withViewTransition(() => {
      const tab = document.querySelector(
        `[data-action="showSection"][data-action-arg="${CSS.escape(name)}"]`,
      );
      if (tab) tab.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
  }
  window.addEventListener("hashchange", _handleHash, { passive: true });
  // popstate fires when the user navigates back/forward via History API.
  window.addEventListener("popstate", _handleHash, { passive: true });
  // ADR-025 R1: also wire the pushState router's popstate emitter so
  // `onRouteChange` subscribers fire on browser back/forward.
  import("./router.js").then(({ initRouterListener }) => initRouterListener());
  // Use replaceState only for initial load so we don't pollute history.
  history.replaceState(null, "", location.href);

  // Sprint 36: Handle ?token= deep links — navigate to rsvp section with token context
  const params = new URLSearchParams(location.search);

  // Sprint 5 (ROADMAP §6 Phase A6): ?guest=<id> opens edit-guest modal directly.
  // Allows shareable URLs like /#guests?... or /?guest=abc123 → guests section + modal.
  const deepGuestId = params.get("guest");
  if (deepGuestId) {
    location.hash = "#guests";
    // Defer modal open until after section mount + DOM settle.
    setTimeout(() => {
      const btn = document.createElement("button");
      btn.dataset.action = "openEditGuestModal";
      btn.dataset.actionArg = deepGuestId;
      document.body.appendChild(btn);
      btn.click();
      btn.remove();
    }, 250);
  }

  const deepToken = params.get("token");
  if (deepToken) {
    import("../services/guest-identity.js").then(({ getGuestByToken, recordIssuedToken }) => {
      const guest = getGuestByToken(deepToken);
      if (guest) {
        recordIssuedToken(guest.id, deepToken);
        // Store token context for rsvp section to pre-fill form
        sessionStorage.setItem(
          "rsvp_token_guest",
          JSON.stringify({
            id: guest.id,
            name: `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim(),
          }),
        );
        location.hash = "#rsvp";
      }
    });
  }

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
      startX = e.touches[0]?.clientX ?? 0;
      startY = e.touches[0]?.clientY ?? 0;
    },
    { passive: true },
  );

  container.addEventListener(
    "touchend",
    (e) => {
      const dx = (e.changedTouches[0]?.clientX ?? 0) - startX;
      const dy = (e.changedTouches[0]?.clientY ?? 0) - startY;
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
      _startY = e.touches[0]?.clientY ?? 0;
      _pulling = false;
    },
    { passive: true },
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (_refreshing) return;
      const dy = (e.touches[0]?.clientY ?? 0) - _startY;
      if (dy > 20 && window.scrollY === 0) {
        _pulling = true;
        const pct = Math.min(dy / THRESHOLD, 1);
        document.body.style.setProperty("--ptr-pull", String(Math.round(pct * THRESHOLD)));
        document.body.classList.toggle("ptr--pulling", pct >= 1);
      }
    },
    { passive: true },
  );

  container.addEventListener(
    "touchend",
    async () => {
      const pull = parseFloat(document.body.style.getPropertyValue("--ptr-pull") || "0");
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

  const shortcuts = _sections.slice(0, 9).map((s, i) => `<kbd>Alt+${i + 1}</kbd> ${s}`);
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
    li.innerHTML = s; // nosec: static kbd/section-name strings, no user input
    list.appendChild(li);
  }
  inner.appendChild(list);
  const closeBtn = document.createElement("button");
  closeBtn.className = "btn btn-secondary u-mt-sm";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => {
    overlay.hidden = true;
  });
  inner.appendChild(closeBtn);
  overlay.appendChild(inner);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });
  document.body.appendChild(overlay);
}

// ── Sprint 15: Command Palette Ctrl+K / Cmd+K trigger ───────────────────

/**
 * Register a keyboard listener that opens the command palette on Ctrl+K / Cmd+K.
 * @param {() => void} openFn  Callback invoked to open the command palette
 * @returns {() => void} cleanup function
 */
export function initCommandPaletteTrigger(openFn) {
  /** @param {KeyboardEvent} e */
  const handler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      openFn();
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}
