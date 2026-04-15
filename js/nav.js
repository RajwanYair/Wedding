// @ts-check
"use strict";

/* ── Navigation ── */
/* ── Navigation ── */

/** Wraps a DOM mutation in document.startViewTransition when available */
function _withViewTransition(fn) {
  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(fn);
  } else {
    fn();
  }
}

/* ── S1.4: Template loader — inject section content lazily ──────────────────
 * When index.html is reduced to a shell, each section div carries a
 * data-template="name" attribute. On first visit, the template HTML is
 * fetched from src/templates/<name>.html, injected, and DOM cache cleared.
 *
 * Subsequent visits skip the fetch (data-loaded="1" guard).
 */

/** @type {Map<string, Promise<void>>} in-flight fetches to prevent double load */
const _templateFetching = new Map();

/**
 * Inject the HTML template for a section if it hasn't been loaded yet.
 * @param {HTMLElement} sec  The section element with data-template attribute
 * @param {string} name      Section name (e.g. "guests")
 * @returns {Promise<void>}
 */
async function _loadSectionTemplate(sec, name) {
  if (sec.dataset.loaded === "1") return;
  if (_templateFetching.has(name)) return _templateFetching.get(name);

  const promise = (async () => {
    try {
      const base = document.querySelector("base")?.href || location.origin;
      const url = new URL(`./src/templates/${name}.html`, base).href;
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) return;
      const html = await resp.text();
      sec.innerHTML = html; // safe: templates from our own src/templates/
      sec.dataset.loaded = "1";
      // S1.6: Invalidate DOM cache so el.xxx re-resolves to injected elements
      if (typeof window.refreshDomCache === "function")
        window.refreshDomCache();
      // S1.7: Re-apply i18n to newly-injected content
      if (typeof window.applyI18n === "function") window.applyI18n();
      // Dispatch event so other modules can react
      sec.dispatchEvent(
        new CustomEvent("templateloaded", {
          bubbles: true,
          detail: { sectionName: name },
        }),
      );
    } catch (_e) {
      // Template fetch failed — section renders with skeleton only
    } finally {
      _templateFetching.delete(name);
    }
  })();

  _templateFetching.set(name, promise);
  return promise;
}

/**
 * Load the HTML template for modals lazily (same pattern as sections).
 * @param {string} modalId  e.g. "guestModal"
 * @returns {Promise<HTMLElement|null>}
 */
async function _loadModalTemplate(modalId) {
  const placeholder = document.getElementById(modalId);
  if (!placeholder) return null;
  if (!placeholder.dataset.modal || placeholder.dataset.loaded === "1")
    return placeholder;

  try {
    const base = document.querySelector("base")?.href || location.origin;
    const url = new URL(`./src/modals/${placeholder.dataset.modal}.html`, base)
      .href;
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) return placeholder;
    const html = await resp.text();
    const tmp = document.createElement("div");
    tmp.innerHTML = html; // safe: templates from our own src/modals/
    const modal = tmp.firstElementChild;
    if (modal) {
      placeholder.replaceWith(modal);
      if (typeof window.refreshDomCache === "function")
        window.refreshDomCache();
      if (typeof window.applyI18n === "function") window.applyI18n();
      return /** @type {HTMLElement} */ (modal);
    }
  } catch (_e) {
    /* ignore */
  }
  return placeholder;
}

/**
 * Ensure required modals are loaded before opening them.
 * @param {string} modalId
 */
async function ensureModalLoaded(modalId) {
  return _loadModalTemplate(modalId);
}

async function showSection(name) {
  // Block non-admin users from accessing admin-only sections (security guard)
  const adminOnly = [
    "dashboard",
    "guests",
    "tables",
    "invitation",
    "whatsapp",
    "budget",
    "analytics",
    "checkin",
    "settings",
  ];
  if (window._authUser && !window._authUser.isAdmin && adminOnly.includes(name))
    return;

  _withViewTransition(function () {
    document.querySelectorAll(".section").forEach(function (s) {
      s.classList.remove("active");
    });
    const sec = document.getElementById(`sec-${name}`);
    if (sec) sec.classList.add("active");
  });

  document.querySelectorAll(".nav-tab").forEach(function (tab) {
    tab.classList.toggle("active", tab.getAttribute("data-tab") === name);
  });

  // S1.4: Load section template if not yet injected, then render
  const _sec = document.getElementById(`sec-${name}`);
  if (_sec && _sec.dataset.template && _sec.dataset.loaded !== "1") {
    // Template not yet loaded — inject it, then re-render
    _loadSectionTemplate(_sec, name).then(function () {
      _renderSection(name);
    });
    /* update URL hash and bottom-nav before async template loads */
    window._routerPush(name);
    document.querySelectorAll(".bottom-nav-item").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === name);
    });
    return;
  }

  _renderSection(name);

  /* update URL hash */
  window._routerPush(name);

  /* sync bottom-nav active state */
  document.querySelectorAll(".bottom-nav-item").forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === name);
  });
}

/** Render the active section's content (called after template is ready). */
function _renderSection(name) {
  if (name === "whatsapp") {
    window.updateWaPreview();
    window.renderWaGuestList();
  }
  if (name === "tables") {
    window.renderTables();
    window.renderUnassignedGuests();
  }
  if (name === "budget") {
    window.renderBudget();
    window.renderExpenses();
  }
  if (name === "analytics") {
    window.renderAnalytics();
  }
  if (name === "timeline") {
    window.renderTimeline();
  }
  if (name === "invitation") {
    window.renderVenueMap();
  }
  if (name === "landing") {
    window.renderGuestLanding();
  }
  if (name === "checkin") {
    window.renderCheckin();
  }
  if (name === "gallery") {
    window.renderGallery();
  }
  if (name === "tablefinder") {
    /* no initial render needed — driven by user input */
  }
  if (name === "settings") {
    window.renderDataSummary();
    window.renderUserManager();
    window.renderSheetsSettings();
    window.renderRsvpQr();
    window.renderRegistrySettings();
    window.renderContactSettings();
    window.renderAuditLog();
    window.renderErrorLog();
    window.renderEmailSettings();
    window.renderPushSettings();
  }
  if (name === "contact-form") {
    window.renderContactForm();
  }
}

function toggleMobileNav() {
  const topNav = document.getElementById("navTabs");
  const btn = document.getElementById("btnMobileMore");
  if (!topNav) return;
  const isOpen = topNav.classList.toggle("mobile-nav-open");
  if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

/* ── S2.7: Swipe gesture navigation (mobile) ── */
(function _initSwipe() {
  const SWIPE_THRESHOLD = 60; // px
  const SWIPE_MAX_VERTICAL = 80; // px — ignore if scrolling vertically
  let _startX = 0;
  let _startY = 0;

  /** All navigable sections in display order */
  const _swipeSections = [
    "dashboard",
    "guests",
    "tables",
    "whatsapp",
    "analytics",
    "timeline",
    "budget",
    "settings",
  ];

  function _getActiveName() {
    const active = document.querySelector(".section.active");
    return active ? active.id.replace("sec-", "") : "";
  }

  document.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length !== 1) return;
      _startX = e.touches[0].clientX;
      _startY = e.touches[0].clientY;
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    function (e) {
      if (!e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - _startX;
      const dy = e.changedTouches[0].clientY - _startY;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_MAX_VERTICAL)
        return;

      const current = _getActiveName();
      const idx = _swipeSections.indexOf(current);
      if (idx === -1) return;

      if (dx < 0 && idx < _swipeSections.length - 1) {
        // Swipe left → next section
        window.showSection(_swipeSections[idx + 1]);
      } else if (dx > 0 && idx > 0) {
        // Swipe right → previous section
        window.showSection(_swipeSections[idx - 1]);
      }
    },
    { passive: true },
  );
})();
