/**
 * src/core/section-resolver.js — Section lifecycle management (Phase 6.3)
 *
 * Extracted from main.js to fulfill the ≤200 lines goal.
 * Owns the section module cache, section switching logic, and auth-gating.
 *
 * Public API:
 *  resolveSection(name)   — lazy-load + cache a section module
 *  switchSection(name)   — unmount current, inject template, mount next
 *  getActiveSection()    — current section name
 */

import { PUBLIC_SECTIONS } from "./constants.js";
import { injectTemplate } from "./template-loader.js";
import { storeSet } from "./store.js";
import { t } from "./i18n.js";
import { showToast, announce } from "./ui.js";
import { currentUser } from "../services/auth.js";

// ── Section module discovery ──────────────────────────────────────────────

/**
 * Vite glob: all section modules discovered at build time.
 * @type {Record<string, () => Promise<{mount?: Function, unmount?: Function}>>}
 */
const _sectionLoaders =
  /** @type {Record<string, () => Promise<{mount?: Function, unmount?: Function}>>} */ (
    import.meta.glob("../sections/*.js")
  );

/** Filename-to-section-ID aliases for mismatches. */
/** @type {Record<string, string>} */
const _SECTION_ALIASES = { "contact-collector": "contact-form" };

/** Section name → lazy loader */
/** @type {Record<string, () => Promise<{mount?: Function, unmount?: Function}>>} */
const _sectionByName = Object.fromEntries(
  Object.entries(_sectionLoaders).map(([path, loader]) => {
    const raw = path.replace("../sections/", "").replace(".js", "");
    const name = _SECTION_ALIASES[raw] ?? raw;
    return [name, loader];
  }),
);

/** Cache of resolved modules — avoids re-importing. */
/** @type {Map<string, {mount?: Function, unmount?: Function}>} */
const _loadedSections = new Map();

/** Name of the currently active/mounted section, or null. */
let _activeSection = /** @type {string | null} */ (null);

// ──────────────────────────────────────────────────────────────────────────

/**
 * Resolve a section module (lazy on first call, cached thereafter).
 * @param {string} name
 * @returns {Promise<{mount?: Function, unmount?: Function} | undefined>}
 */
export async function resolveSection(name) {
  if (_loadedSections.has(name)) return _loadedSections.get(name);
  const loader = _sectionByName[name];
  if (!loader) return undefined;
  const mod = await loader();
  _loadedSections.set(name, mod);
  return mod;
}

/** Return the name of the currently mounted section. */
export function getActiveSection() {
  return _activeSection;
}

/**
 * Eagerly preload section modules for the given names.
 * Called during bootstrap for the most common entry sections.
 * @param {string[]} names
 */
export function preloadSections(names) {
  Promise.all(names.map((n) => resolveSection(n))).catch(() => {});
}

/**
 * Unmount the current section, lazy-load template if needed, then mount new section.
 * Applies auth guard: non-public sections require admin login.
 * @param {string} name
 * @returns {Promise<void>}
 */
export async function switchSection(name) {
  // Auth guard
  if (!PUBLIC_SECTIONS.has(name)) {
    const user = currentUser();
    if (!user?.isAdmin) {
      if (_activeSection !== "landing") return switchSection("landing");
      return;
    }
  }

  if (_activeSection && _activeSection !== name) {
    _loadedSections.get(_activeSection)?.unmount?.();
    // Expenses is embedded in budget — unmount alongside it
    if (_activeSection === "budget") _loadedSections.get("expenses")?.unmount?.();
  }
  _activeSection = name;

  const container = /** @type {HTMLElement | null} */ (document.getElementById(`sec-${name}`));
  if (!container) {
    showToast(`Section not found: ${name}`, "error");
    return;
  }

  // Update active states on nav tabs
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    const active = /** @type {HTMLElement} */ (btn).dataset.tab === name;
    btn.classList.toggle("active", active);
    // aria-selected is only valid on role=tab/option/treeitem; bottom-nav uses
    // plain <button> without a role, so use aria-current=page there instead.
    if (btn.getAttribute("role") === "tab") {
      btn.setAttribute("aria-selected", String(active));
    } else if (active) {
      btn.setAttribute("aria-current", "page");
    } else {
      btn.removeAttribute("aria-current");
    }
  });

  // Show/hide section panes
  document.querySelectorAll(".section").forEach((sec) => {
    const isTarget = sec.id === `sec-${name}`;
    sec.classList.toggle("active", isTarget);
    sec.setAttribute("aria-hidden", String(!isTarget));
  });

  // Lazy-load template on first visit
  if (
    /** @type {HTMLElement} */ (container).dataset.template &&
    /** @type {HTMLElement} */ (container).dataset.loaded !== "1"
  ) {
    await injectTemplate(container, name);
  }

  // Mount section module (lazy-loaded on first visit)
  const mod = await resolveSection(name);
  mod?.mount?.(container);

  // Budget sub-section: mount expenses alongside
  if (name === "budget") {
    const expMod = await resolveSection("expenses");
    expMod?.mount?.(container);
  }

  // A11y: announce section change to screen readers
  announce(t(`nav_${name}`, name));

  storeSet("activeSection", name);
}
