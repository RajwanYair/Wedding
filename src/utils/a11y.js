/**
 * src/utils/a11y.js — Accessibility audit utilities (Sprint 34)
 *
 * Provides lightweight, zero-dependency helpers for auditing DOM accessibility
 * issues at runtime.  Designed for developer tooling and testing — not a
 * replacement for proper a11y tools (axe-core / Lighthouse).
 *
 * Usage:
 *   import { auditImages, auditForms, auditHeadings, auditAll } from "../utils/a11y.js";
 *
 *   const issues = auditAll(document.body);
 *   if (issues.length) console.warn("a11y issues:", issues);
 */

// ── Issue type ─────────────────────────────────────────────────────────────

/**
 * @typedef {{ rule: string, element: string, message: string }} A11yIssue
 */

// ── Image audit ────────────────────────────────────────────────────────────

/**
 * Find <img> elements that are missing `alt` attributes.
 * Images with empty alt (alt="") are treated as decorative and not flagged.
 *
 * @param {Element} root
 * @returns {A11yIssue[]}
 */
export function auditImages(root) {
  /** @type {A11yIssue[]} */
  const issues = [];
  root.querySelectorAll("img").forEach(
    /** @param {HTMLImageElement} img */ (img) => {
      if (!img.hasAttribute("alt")) {
        issues.push({
          rule: "img-alt",
          element: img.outerHTML.slice(0, 120),
          message: "<img> is missing the `alt` attribute",
        });
      }
    },
  );
  return issues;
}

// ── Form audit ─────────────────────────────────────────────────────────────

/**
 * Find form controls (<input>, <select>, <textarea>) that lack an associated
 * <label> (or aria-label / aria-labelledby).
 *
 * @param {Element} root
 * @returns {A11yIssue[]}
 */
export function auditForms(root) {
  /** @type {A11yIssue[]} */
  const issues = [];
  const formControls = /** @type {NodeListOf<HTMLElement>} */ (
    root.querySelectorAll("input, select, textarea")
  );

  formControls.forEach((el) => {
    const type = /** @type {HTMLInputElement} */ (el).type;
    if (type === "hidden" || type === "submit" || type === "button" || type === "reset") return;
    if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) return;

    const id = el.id;
    if (id && root.querySelector(`label[for="${id}"]`)) return;

    // Check if wrapped in a <label>
    if (el.closest("label")) return;

    issues.push({
      rule: "label-missing",
      element: el.outerHTML.slice(0, 120),
      message: `Form control is missing an associated label or aria-label`,
    });
  });

  return issues;
}

// ── Heading audit ─────────────────────────────────────────────────────────

/**
 * Check that heading levels (h1–h6) don't skip levels.
 * E.g. h1 → h3 without an h2 in between.
 *
 * @param {Element} root
 * @returns {A11yIssue[]}
 */
export function auditHeadings(root) {
  /** @type {A11yIssue[]} */
  const issues = [];
  const headings = /** @type {HTMLElement[]} */ (
    Array.from(root.querySelectorAll("h1,h2,h3,h4,h5,h6"))
  );

  let prevLevel = 0;
  for (const h of headings) {
    const level = parseInt(h.tagName.slice(1), 10);
    if (prevLevel > 0 && level > prevLevel + 1) {
      issues.push({
        rule: "heading-skip",
        element: h.outerHTML.slice(0, 120),
        message: `Heading level skipped: h${prevLevel} → h${level}`,
      });
    }
    prevLevel = level;
  }

  return issues;
}

// ── Interactive elements ───────────────────────────────────────────────────

/**
 * Find interactive elements (buttons, links) that lack accessible names.
 *
 * @param {Element} root
 * @returns {A11yIssue[]}
 */
export function auditInteractive(root) {
  /** @type {A11yIssue[]} */
  const issues = [];

  /** @param {Element} el */
  function hasAccessibleName(el) {
    if (el.hasAttribute("aria-label")) return true;
    if (el.hasAttribute("aria-labelledby")) return true;
    if (el.hasAttribute("title")) return true;
    const text = el.textContent ?? "";
    if (text.trim()) return true;
    const img = el.querySelector("img[alt]");
    if (img && /** @type {HTMLImageElement} */ (img).alt.trim()) return true;
    return false;
  }

  root.querySelectorAll("button, a").forEach((el) => {
    if (!hasAccessibleName(el)) {
      issues.push({
        rule: "interactive-name",
        element: el.outerHTML.slice(0, 120),
        message: `Interactive element has no accessible name`,
      });
    }
  });

  return issues;
}

// ── Colour-contrast placeholder ────────────────────────────────────────────

/**
 * Placeholder — contrast checking requires computed styles and is delegated
 * to external tools.  Returns empty array.
 *
 * @returns {A11yIssue[]}
 */
export function auditContrast() {
  // Deliberate no-op: contrast requires computed CSS values.
  return [];
}

// ── Combined audit ────────────────────────────────────────────────────────

/**
 * Run all audits and return collected issues.
 *
 * @param {Element} root
 * @returns {A11yIssue[]}
 */
export function auditAll(root) {
  return [
    ...auditImages(root),
    ...auditForms(root),
    ...auditHeadings(root),
    ...auditInteractive(root),
  ];
}
