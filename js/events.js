// @ts-check
"use strict";
/* ── Event Delegation — Sprint 1.2 ──
 * Replaces all inline onclick/oninput/onchange/onkeydown handlers
 * with delegated listeners on `document`.
 *
 * HTML attributes:
 *   data-action="fnName"              — click handler
 *   data-action="fn1 fn2"             — multiple click handlers (sequential)
 *   data-action-arg="value"           — single string arg passed to first action
 *   data-action-self                  — only fires when click target === element
 *   data-on-input="fnName"            — delegated input event
 *   data-on-change="fnName"           — delegated change event
 *   data-on-enter="fnName"            — delegated Enter key handler
 */
(function () {
  /* ── Click delegation ── */
  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    /* data-action-self: overlay pattern — only trigger on direct click */
    if (el.hasAttribute("data-action-self") && e.target !== el) return;
    const actions = el.dataset.action.split(/\s+/);
    const arg = el.dataset.actionArg;
    for (let i = 0; i < actions.length; i++) {
      const fn = window[actions[i]];
      if (typeof fn === "function") {
        fn(i === 0 && arg !== undefined ? arg : undefined);
      }
    }
  });

  /* ── Input delegation ── */
  document.addEventListener("input", function (e) {
    const handler = e.target.dataset.onInput;
    if (!handler) return;
    const fn = window[handler];
    if (typeof fn === "function") fn(e);
  });

  /* ── Change delegation ── */
  document.addEventListener("change", function (e) {
    const handler = e.target.dataset.onChange;
    if (!handler) return;
    const fn = window[handler];
    if (typeof fn === "function") fn(e);
  });

  /* ── Enter key delegation ── */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    const handler = e.target.dataset.onEnter;
    if (!handler) return;
    const fn = window[handler];
    if (typeof fn === "function") fn(e);
  });
})();
