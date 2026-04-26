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
 * Timeout + retry: Each template load has a 10 s timeout via AbortController.
 * On failure, up to 2 retries with exponential backoff (1 s → 2 s).
 *
 * Security: Only template files we control are loaded. Template HTML is
 * trusted (authored by us, not user input) — innerHTML is safe here.
 */

import { applyI18n } from "./i18n.js";
import { announce } from "./ui.js";

// ── Retry configuration ───────────────────────────────────────────────────
/** Maximum number of retry attempts after initial failure. */
export const TEMPLATE_MAX_RETRIES = 2;
/** Base delay in ms before first retry (doubles each attempt). */
export const TEMPLATE_RETRY_BASE_MS = 1_000;
/** Timeout per load attempt in ms. */
export const TEMPLATE_TIMEOUT_MS = 10_000;

/**
 * Auto-discovered template loaders via import.meta.glob (F1.4).
 * Vite resolves all *.html files in src/templates/ at build time.
 * Filenames are mapped to section names (e.g. "guests.html" → "guests").
 */
const _rawGlob = /** @type {Record<string, () => Promise<{ default: string }>>} */ (
  import.meta.glob("../templates/*.html", {
    query: "?raw",
    eager: false,
  })
);

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
 * Load a template with timeout and exponential-backoff retry.
 * @param {() => Promise<{ default: string }>} loader
 * @param {string} sectionName — for diagnostics only
 * @returns {Promise<string>} resolved HTML string
 */
async function _loadWithRetry(loader, sectionName) {
  let lastError;
  for (let attempt = 0; attempt <= TEMPLATE_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = TEMPLATE_RETRY_BASE_MS * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      const result = await Promise.race([
        loader(),
        new Promise((_r, reject) =>
          setTimeout(
            () => reject(new Error(`Template "${sectionName}" timed out`)),
            TEMPLATE_TIMEOUT_MS,
          ),
        ),
      ]);
      return /** @type {{ default: string }} */ (result).default;
    } catch (err) {
      lastError = err;
      console.warn(
        `[template-loader] Attempt ${attempt + 1}/${TEMPLATE_MAX_RETRIES + 1} failed for ${sectionName}`,
        err,
      );
    }
  }
  throw lastError;
}

/**
 * Inject the HTML template for the given section into its container element.
 * Skips injection if already done (data-loaded="1").
 * Includes timeout per attempt and up to TEMPLATE_MAX_RETRIES retry attempts
 * with exponential backoff.
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

  // Show skeleton placeholder while template loads
  container.classList.add("tpl-loading");
  container.setAttribute("aria-busy", "true");

  try {
    const html = await _loadWithRetry(loader, sectionName);
    container.innerHTML = html; // safe: templates from src/templates/ (no user input)
    container.dataset.loaded = "1";

    // Re-apply i18n to newly injected content
    applyI18n(container);

    // Announce to screen readers that the section is ready
    announce(`${sectionName} section loaded`, "polite");

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
    // All retries exhausted — section will render empty
    console.warn(`[template-loader] Failed to load template after retries: ${sectionName}`, err);
  } finally {
    container.classList.remove("tpl-loading");
    container.removeAttribute("aria-busy");
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
