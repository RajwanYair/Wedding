/**
 * src/core/events.js — Event delegation hub (S0 named-export module)
 *
 * ES module version of js/events.js. Maps `data-action` attribute values
 * to handler functions. Handlers are registered here and dispatched from a
 * single document-level click listener.
 */

/** @type {Map<string, (el: HTMLElement, e: Event) => void>} */
const _handlers = new Map();

let _initialized = false;

/** @param {Event} e */
function _dispatch(e) {
  const target = /** @type {HTMLElement} */ (e.target);
  const el = target.closest("[data-action]");
  if (!el) return;
  const action = /** @type {HTMLElement} */ (el).dataset.action;
  if (!action) return;
  const fn = _handlers.get(action);
  if (fn) {
    try {
      fn(/** @type {HTMLElement} */ (el), e);
    } catch (err) {
      console.error(`[events] Handler "${action}" threw:`, err);
    }
  }
}

/**
 * Install the single document-level event listener (call once at startup).
 */
export function initEvents() {
  if (_initialized) return;
  _initialized = true;
  document.addEventListener("click", _dispatch);
  document.addEventListener("submit", (e) => {
    e.preventDefault();
    _dispatch(e);
  });
  // data-on-input: delegated input event (e.g. search boxes)
  document.addEventListener("input", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const action = target.dataset.onInput;
    if (!action) return;
    const fn = _handlers.get(action);
    if (fn) {
      try {
        fn(target, e);
      } catch (err) {
        console.error(`[events] Input handler "${action}" threw:`, err);
      }
    }
  });

  // data-on-change: delegated change event (e.g. file inputs, selects)
  document.addEventListener("change", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    // First try data-on-change attribute
    const onChangeAction = target.dataset.onChange;
    if (onChangeAction) {
      const fn = _handlers.get(onChangeAction);
      if (fn) {
        try {
          fn(target, e);
        } catch (err) {
          console.error(`[events] Change handler "${onChangeAction}" threw:`, err);
        }
        return;
      }
    }
    // Fall back to data-action delegation (for selects/checkboxes)
    _dispatch(e);
  });

  // data-on-enter: delegated keydown Enter (e.g. email input → add email)
  document.addEventListener("keydown", (e) => {
    if (/** @type {KeyboardEvent} */ (e).key !== "Enter") return;
    const target = /** @type {HTMLElement} */ (e.target);
    const action = target.dataset.onEnter;
    if (!action) return;
    e.preventDefault();
    const fn = _handlers.get(action);
    if (fn) {
      try {
        fn(target, e);
      } catch (err) {
        console.error(`[events] Enter handler "${action}" threw:`, err);
      }
    }
  });
}

/**
 * Register an action handler.
 * @param {string} action  Value of the `data-action` attribute
 * @param {(el: HTMLElement, e: Event) => void} fn
 */
export function on(action, fn) {
  _handlers.set(action, fn);
}

/**
 * Remove an action handler.
 * @param {string} action
 */
export function off(action) {
  _handlers.delete(action);
}
