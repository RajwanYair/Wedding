// @ts-check
"use strict";

/* ── Hash Router (v1.15.0) ───────────────────────────────────────────────────
   Updates URL hash when sections change; restores section from URL on page load.
   Works seamlessly with the existing window.showSection() global scope.
   ─────────────────────────────────────────────────────────────────────────── */

const _ROUTER_VALID = [
  "dashboard",
  "guests",
  "tables",
  "invitation",
  "whatsapp",
  "rsvp",
  "budget",
  "analytics",
  "timeline",
  "settings",
  "landing",
  "checkin",
  "gallery",
  "tablefinder",
  "contact-form",
];

/**
 * Call once from app.js init() — after auth is set up.
 * Reads the current URL hash and navigates to that section if valid.
 * Registers a hashchange listener for back/forward browser navigation.
 */
function initRouter() {
  window.addEventListener("hashchange", _routerHandleHash);
  /* Only respect initial hash if the app hasn't already picked a section */
  const initialHash = window.location.hash.slice(1);
  if (initialHash && _ROUTER_VALID.includes(initialHash)) {
    window.showSection(initialHash);
  }
}

/**
 * Update the URL hash to reflect the current section.
 * Uses replaceState (not pushState) to avoid polluting browser history.
 * Called by window.showSection() in nav.js.
 */
function _routerPush(name) {
  const desired = `#${  name}`;
  if (window.location.hash !== desired) {
    history.replaceState(null, "", desired);
  }
}

/** Handle back/forward browser navigation via hash change */
function _routerHandleHash() {
  const hash = window.location.hash.slice(1);
  if (hash && _ROUTER_VALID.includes(hash)) {
    window.showSection(hash);
  }
}
