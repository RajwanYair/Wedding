/**
 * src/utils/focus-trap.js — Sprint 144
 *
 * Lightweight focus trap utility for modals and dialogs.
 * No DOM side-effects at module-load — returns a cleanup function.
 * Pure logic; DOM interaction is injected via a tabbable-resolver.
 */

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

/**
 * Query all focusable elements within a container.
 * @param {Element} container
 * @returns {HTMLElement[]}
 */
export function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
    (el) => !/** @type {HTMLElement} */ (el).hidden,
  );
}

/**
 * Create a focus trap for the given container element.
 * Call the returned cleanup() function to release the trap.
 *
 * @param {Element} container
 * @param {{
 *   getFocusable?: (c: Element) => HTMLElement[],
 *   focusTrigger?: HTMLElement | null,
 * }} [opts]
 * @returns {{ activate: () => void, deactivate: () => void }}
 */
export function createFocusTrap(container, opts = {}) {
  const getFocusable = opts.getFocusable ?? getFocusableElements;
  let _active = false;

  /** @param {KeyboardEvent} e */
  function _handleKeyDown(e) {
    if (!_active || e.key !== "Tab") return;

    const elements = getFocusable(container);
    if (elements.length === 0) { e.preventDefault(); return; }

    const first = elements[0];
    const last  = elements[elements.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      _active = true;
      document.addEventListener("keydown", _handleKeyDown);
      const first = getFocusable(container)[0];
      first?.focus();
    },
    deactivate() {
      _active = false;
      document.removeEventListener("keydown", _handleKeyDown);
      opts.focusTrigger?.focus();
    },
  };
}
