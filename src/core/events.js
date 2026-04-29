/**
 * src/core/events.js — Event delegation hub (S0 named-export module)
 *
 * ES module version of js/events.js. Maps `data-action` attribute values
 * to handler functions. Handlers are registered here and dispatched from a
 * single document-level click listener.
 */

import { reportError } from "../services/observability.js";

/** @type {Map<string, (el: HTMLElement, e: Event) => void>} */
const _handlers = new Map();

/**
 * Action alias map (ADR-022 — namespace migration).
 * Maps a new namespaced action (e.g. `modal:close`) to an existing legacy
 * flat action (`closeModal`). Dispatch resolves through this map when a
 * direct handler is not found.
 * @type {Map<string, string>}
 */
const _aliases = new Map();

let _initialized = false;

/**
 * Resolve a handler, transparently following an alias if no direct handler
 * is registered. ADR-022 — supports namespaced action migration.
 * @param {string} action
 * @returns {((el: HTMLElement, e: Event) => void) | undefined}
 */
function _resolve(action) {
  const direct = _handlers.get(action);
  if (direct) return direct;
  const aliasTarget = _aliases.get(action);
  if (aliasTarget) return _handlers.get(aliasTarget);
  return undefined;
}

/** @param {Event} e */
function _dispatch(e) {
  const target = /** @type {HTMLElement} */ (e.target);
  const el = target.closest("[data-action]");
  if (!el) return;
  const action = /** @type {HTMLElement} */ (el).dataset.action;
  if (!action) return;
  const fn = _resolve(action);
  if (fn) {
    try {
      fn(/** @type {HTMLElement} */ (el), e);
    } catch (err) {
      reportError(err, { source: "events", action });
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
    const fn = _resolve(action);
    if (fn) {
      try {
        fn(target, e);
      } catch (err) {
        reportError(err, { source: "events", action });
      }
    }
  });

  // data-on-change: delegated change event (e.g. file inputs, selects)
  document.addEventListener("change", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    // First try data-on-change attribute
    const onChangeAction = target.dataset.onChange;
    if (onChangeAction) {
      const fn = _resolve(onChangeAction);
      if (fn) {
        try {
          fn(target, e);
        } catch (err) {
          reportError(err, { source: "events", action: onChangeAction });
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
    const fn = _resolve(action);
    if (fn) {
      try {
        fn(target, e);
      } catch (err) {
        reportError(err, { source: "events", action });
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

/**
 * Register a new namespaced action that dispatches to an existing legacy
 * action's handler. ADR-022 — namespace migration.
 *
 * Both names continue to work; the new name does not require its own handler.
 * Multiple aliases per target are allowed. Calling `alias()` again with the
 * same `newName` overwrites the previous mapping.
 *
 * @param {string} newName     e.g. "modal:close"
 * @param {string} originalName e.g. "closeModal"
 */
export function alias(newName, originalName) {
  if (!newName || !originalName) {
    throw new TypeError("events.alias: both newName and originalName are required");
  }
  _aliases.set(newName, originalName);
}

/**
 * Test seam — clear the alias map. Not exported in production index.
 * @returns {void}
 */
export function _resetAliasesForTests() {
  _aliases.clear();
}
