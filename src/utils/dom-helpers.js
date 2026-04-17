/**
 * src/utils/dom-helpers.js — DOM manipulation helpers (Sprint 187)
 *
 * Pure DOM utilities — no state, no network, no storage.
 * All functions accept element references or selectors.
 */

/**
 * Safely query a single element, returning null on miss.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {Element|null}
 */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Safely query all matching elements.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {Element[]}
 */
export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

/**
 * Add one or more CSS classes to an element.
 * @param {Element} el
 * @param {...string} classes
 */
export function addClass(el, ...classes) {
  el.classList.add(...classes);
}

/**
 * Remove one or more CSS classes from an element.
 * @param {Element} el
 * @param {...string} classes
 */
export function removeClass(el, ...classes) {
  el.classList.remove(...classes);
}

/**
 * Toggle a CSS class on an element. Returns the new state.
 * @param {Element} el
 * @param {string} cls
 * @param {boolean} [force]
 * @returns {boolean}
 */
export function toggleClass(el, cls, force) {
  return el.classList.toggle(cls, force);
}

/**
 * Set `textContent` on an element safely (no innerHTML).
 * @param {Element} el
 * @param {string} text
 */
export function setText(el, text) {
  el.textContent = text;
}

/**
 * Set a data-* attribute.
 * @param {Element} el
 * @param {string} name  Without "data-" prefix
 * @param {string} value
 */
export function setData(el, name, value) {
  /** @type {HTMLElement} */ (el).dataset[name] = value;
}

/**
 * Get a data-* attribute value (or "" if absent).
 * @param {Element} el
 * @param {string} name  Without "data-" prefix
 * @returns {string}
 */
export function getData(el, name) {
  return /** @type {HTMLElement} */ (el).dataset[name] ?? "";
}

/**
 * Show an element by removing the `hidden` attribute / class.
 * @param {Element} el
 */
export function show(el) {
  /** @type {HTMLElement} */ (el).hidden = false;
  el.classList.remove("hidden");
}

/**
 * Hide an element by setting the `hidden` attribute.
 * @param {Element} el
 */
export function hide(el) {
  /** @type {HTMLElement} */ (el).hidden = true;
}

/**
 * Create an element with optional attributes and children.
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {(string|Element)[]} [children]
 * @returns {Element}
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const child of children) {
    if (typeof child === "string") el.appendChild(document.createTextNode(child));
    else el.appendChild(child);
  }
  return el;
}

/**
 * Remove all children from an element.
 * @param {Element} el
 */
export function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Return true when the element is currently visible in the viewport.
 * @param {Element} el
 * @returns {boolean}
 */
export function isVisible(el) {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
