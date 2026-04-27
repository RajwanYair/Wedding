/**
 * src/core/dialog.js — Native `<dialog>` modal helpers (S102).
 *
 * Roadmap §11 plans to retire the custom `.modal-overlay` system in favour of
 * the platform `<dialog>` element. This module is the migration target —
 * existing modals continue to use the legacy CSS overlay until each is
 * individually converted (S102/S103 second batch).
 *
 * The helpers are deliberately framework-free: they take an id, look up the
 * `<dialog>` element, and forward to `showModal()` / `close()`.
 */

/**
 * @param {string} id  DOM id of a `<dialog>` element.
 * @returns {HTMLDialogElement | null}
 */
function _resolveDialog(id) {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(id);
  if (!el) return null;
  if (typeof (/** @type {any} */ (el).showModal) !== "function") return null;
  return /** @type {HTMLDialogElement} */ (/** @type {unknown} */ (el));
}

/**
 * Returns true when the current document supports `<dialog>` `.showModal()`.
 * @returns {boolean}
 */
export function isDialogSupported() {
  if (typeof document === "undefined") return false;
  /** @type {any} */
  const proto = (/** @type {any} */ (globalThis).HTMLDialogElement)?.prototype;
  return typeof proto?.showModal === "function";
}

/**
 * Open a `<dialog>` element by id. Returns true on success.
 * @param {string} id
 * @returns {boolean}
 */
export function openDialog(id) {
  const d = _resolveDialog(id);
  if (!d) return false;
  if (d.open) return true;
  try {
    d.showModal();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close a `<dialog>` element by id. Returns true on success.
 * @param {string} id
 * @param {string} [returnValue]  Optional `returnValue` propagated to `close` event.
 * @returns {boolean}
 */
export function closeDialog(id, returnValue) {
  const d = _resolveDialog(id);
  if (!d) return false;
  if (!d.open) return true;
  try {
    if (typeof returnValue === "string") d.close(returnValue);
    else d.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Toggle a `<dialog>` element by id.
 * @param {string} id
 * @returns {boolean} Whether the dialog ended up open.
 */
export function toggleDialog(id) {
  const d = _resolveDialog(id);
  if (!d) return false;
  return d.open ? !closeDialog(id) : openDialog(id);
}

/**
 * Promise-based open: resolves with the `returnValue` once the dialog closes.
 * @param {string} id
 * @returns {Promise<string | null>}
 */
export function awaitDialogClose(id) {
  const d = _resolveDialog(id);
  if (!d) return Promise.resolve(null);
  return new Promise((resolve) => {
    const handler = () => {
      d.removeEventListener("close", handler);
      resolve(d.returnValue ?? null);
    };
    d.addEventListener("close", handler);
    if (!d.open) {
      try {
        d.showModal();
      } catch {
        d.removeEventListener("close", handler);
        resolve(null);
      }
    }
  });
}
