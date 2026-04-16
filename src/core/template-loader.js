/**
 * src/core/template-loader.js — Lazy HTML template loader (S1.4)
 *
 * Loads section HTML templates from src/templates/*.html (as raw strings
 * via Vite's `?raw` import) and injects them into section container elements.
 *
 * Flow:
 *  1. showSection(name) calls injectTemplate(sectionEl, name)
 *  2. injectTemplate() checks data-loaded attribute — skips if already done
 *  3. Imports the template's HTML string (lazy, code-split by Vite)
 *  4. Sets container.innerHTML to the template content
 *  5. Calls refreshDomCache() so el.xxx re-resolves to injected elements
 *  6. Fires applyI18n() to translate injected content
 *  7. Fires the section's post-inject callback if registered
 *
 * Security: Only template files we control are loaded. Template HTML is
 * trusted (authored by us, not user input) — innerHTML is safe here.
 */

import { applyI18n } from "./i18n.js";

/**
 * Auto-discovered template loaders via import.meta.glob (F1.4).
 * Vite resolves all *.html files in src/templates/ at build time.
 * Filenames are mapped to section names (e.g. "guests.html" → "guests").
 * @type {Record<string, () => Promise<{ default: string }>>}
 */
const _rawGlob = import.meta.glob("../templates/*.html", {
  query: "?raw",
  eager: false,
});

/** @type {Map<string, () => Promise<{ default: string }>>} */
const _loaders = new Map();
for (const [path, loader] of Object.entries(_rawGlob)) {
  // path looks like "../templates/guests.html"
  const match = path.match(/\/([^/]+)\.html$/);
  if (match) _loaders.set(match[1], /** @type {any} */ (loader));
}

/** @type {Map<string, () => void>} section name → post-inject callback */
const _callbacks = new Map();

/**
 * Register a callback to fire after a section template is injected.
 * @param {string} sectionName
 * @param {() => void} fn
 */
export function onTemplateLoaded(sectionName, fn) {
  _callbacks.set(sectionName, fn);
}

/**
 * Inject the HTML template for the given section into its container element.
 * Skips injection if already done (data-loaded="1").
 *
 * @param {HTMLElement} container   The <div class="section" id="sec-xxx"> element
 * @param {string} sectionName      e.g. "guests"
 * @returns {Promise<void>}
 */
export async function injectTemplate(container, sectionName) {
  if (container.dataset.loaded === "1") return;

  const loader = _loaders.get(sectionName);
  if (!loader) {
    console.warn(`[template-loader] No template for section: ${sectionName}`);
    return;
  }

  try {
    const { default: html } = await loader();
    container.innerHTML = html; // safe: templates from src/templates/ (no user input)
    container.dataset.loaded = "1";

    // Re-apply i18n to newly injected content
    applyI18n(container);

    // Let the rest of the app know the DOM has changed
    container.dispatchEvent(
      new CustomEvent("templateloaded", {
        bubbles: true,
        detail: { sectionName },
      }),
    );

    // Fire post-inject callback
    _callbacks.get(sectionName)?.();
  } catch (err) {
    // Template file missing — not a fatal error; section will render empty
    console.warn(
      `[template-loader] Failed to load template: ${sectionName}`,
      err,
    );
  }
}

/**
 * Prefetch templates for sections that are likely to be visited soon.
 * Call on idle to avoid delaying the initial load.
 * @param {string[]} names
 */
export function prefetchTemplates(names) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => {
      names.forEach((n) => _loaders.get(n)?.());
    });
  }
}
