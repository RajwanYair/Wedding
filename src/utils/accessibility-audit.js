/**
 * src/utils/accessibility-audit.js — Accessibility audit helpers (Sprint 117)
 *
 * DOM-free analysis functions for catching common a11y issues in structured
 * data before it reaches the template layer.  These validate labels,
 * contrast, form attributes, and ARIA role patterns.
 *
 * For runtime DOM auditing, use browser-based tooling (axe-core, etc.).
 * This module focuses on pure-data checks so they can be unit tested.
 */

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{ rule: string, severity: "error" | "warning", message: string, context?: string }} A11yIssue
 */

// ── Color contrast ────────────────────────────────────────────────────────

/**
 * Parse a hex color (#RGB or #RRGGBB) to [r, g, b] 0–255.
 * @param {string} hex
 * @returns {[number, number, number] | null}
 */
export function parseHexColor(hex) {
  const h = hex.replace("#", "");
  if (h.length === 3 && /^[0-9a-fA-F]{3}$/.test(h)) {
    return [
      parseInt(`${h[0]}${h[0]}`, 16),
      parseInt(`${h[1]}${h[1]}`, 16),
      parseInt(`${h[2]}${h[2]}`, 16),
    ];
  }
  if (h.length === 6 && /^[0-9a-fA-F]{6}$/.test(h)) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  return null;
}

/**
 * Calculate relative luminance (WCAG 2.x formula).
 * @param {[number,number,number]} rgb
 * @returns {number}
 */
export function relativeLuminance([r, g, b]) {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/**
 * Contrast ratio between two hex colors (WCAG 2.x).
 * @param {string} fg
 * @param {string} bg
 * @returns {number | null}   null if either color is unparseable
 */
export function contrastRatio(fg, bg) {
  const fgRgb = parseHexColor(fg);
  const bgRgb = parseHexColor(bg);
  if (!fgRgb || !bgRgb) return null;
  const L1 = relativeLuminance(fgRgb);
  const L2 = relativeLuminance(bgRgb);
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color pair meets WCAG AA for normal text (4.5:1) or large text (3:1).
 * @param {string}  fg
 * @param {string}  bg
 * @param {"AA" | "AAA"} [level="AA"]
 * @param {"normal" | "large"} [textSize="normal"]
 * @returns {boolean}
 */
export function meetsContrastRequirement(fg, bg, level = "AA", textSize = "normal") {
  const ratio = contrastRatio(fg, bg);
  if (ratio === null) return false;
  if (level === "AAA") return textSize === "large" ? ratio >= 4.5 : ratio >= 7;
  return textSize === "large" ? ratio >= 3 : ratio >= 4.5;
}

// ── Label auditing ────────────────────────────────────────────────────────

/**
 * Check a list of "form fields" (plain objects) for missing labels.
 *
 * @param {{ id?: string, label?: string, type?: string, ariaLabel?: string }[]} fields
 * @returns {A11yIssue[]}
 */
export function auditFormLabels(fields) {
  /** @type {A11yIssue[]} */
  const issues = [];
  for (const f of fields) {
    if (!f.label && !f.ariaLabel) {
      issues.push({
        rule:     "label-missing",
        severity: "error",
        message:  `Field "${f.id ?? "(no id)"}" has no label or aria-label`,
        context:  f.id,
      });
    }
  }
  return issues;
}

// ── Image alt text ────────────────────────────────────────────────────────

/**
 * Check image records for missing / empty alt text.
 * @param {{ src: string, alt?: string, decorative?: boolean }[]} images
 * @returns {A11yIssue[]}
 */
export function auditImageAlts(images) {
  /** @type {A11yIssue[]} */
  const issues = [];
  for (const img of images) {
    if (!img.decorative && !img.alt) {
      issues.push({
        rule:     "image-alt-missing",
        severity: "error",
        message:  `Image "${img.src}" is missing alt text`,
        context:  img.src,
      });
    }
    if (!img.decorative && img.alt?.trim() === "") {
      issues.push({
        rule:     "image-alt-empty",
        severity: "warning",
        message:  `Image "${img.src}" has empty alt text`,
        context:  img.src,
      });
    }
  }
  return issues;
}

// ── ARIA role validation ──────────────────────────────────────────────────

const VALID_ROLES = new Set([
  "button", "link", "dialog", "alertdialog", "alert", "status",
  "checkbox", "radio", "textbox", "listbox", "option", "combobox",
  "navigation", "main", "banner", "contentinfo", "complementary",
  "form", "region", "search", "article", "document", "note",
  "tab", "tablist", "tabpanel", "grid", "row", "cell", "columnheader",
  "rowheader", "gridcell", "table", "list", "listitem", "none", "presentation",
]);

/**
 * Validate that ARIA roles are from the allowed set.
 * @param {{ role: string, id?: string }[]} elements
 * @returns {A11yIssue[]}
 */
export function auditAriaRoles(elements) {
  /** @type {A11yIssue[]} */
  const issues = [];
  for (const el of elements) {
    if (!VALID_ROLES.has(el.role)) {
      issues.push({
        rule:     "aria-role-invalid",
        severity: "error",
        message:  `Invalid ARIA role "${el.role}"`,
        context:  el.id,
      });
    }
  }
  return issues;
}

// ── Aggregate audit ───────────────────────────────────────────────────────

/**
 * Run all available audits and return combined issues.
 * @param {{
 *   fields?: Parameters<typeof auditFormLabels>[0],
 *   images?: Parameters<typeof auditImageAlts>[0],
 *   roles?:  Parameters<typeof auditAriaRoles>[0],
 * }} data
 * @returns {A11yIssue[]}
 */
export function runA11yAudit({ fields = [], images = [], roles = [] } = {}) {
  return [
    ...auditFormLabels(fields),
    ...auditImageAlts(images),
    ...auditAriaRoles(roles),
  ];
}
