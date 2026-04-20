/**
 * src/utils/a11y.js — Accessibility utilities
 *
 * S51: Media-query helpers, WCAG contrast checking, ARIA helpers.
 * All functions are pure or wrap Web APIs with clean abstractions.
 * No DOM mutation — see src/utils/focus-trap.js for focus management.
 */

// ── Media Query Helpers ───────────────────────────────────────────────────

/**
 * Returns true if the user prefers reduced motion.
 * @returns {boolean}
 */
export function isReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Returns true if the user prefers high contrast.
 * @returns {boolean}
 */
export function isHighContrast() {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-contrast: more)").matches;
}

/**
 * Returns true if the user prefers dark color scheme.
 * @returns {boolean}
 */
export function isDarkMode() {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Watches for prefers-reduced-motion changes and calls callback on change.
 * Returns a cleanup function to remove the listener.
 * @param {(reduced: boolean) => void} callback
 * @returns {() => void} cleanup
 */
export function watchMotionPreference(callback) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = (/** @type {MediaQueryListEvent} */ e) => callback(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/**
 * Watches for prefers-color-scheme changes and calls callback on change.
 * Returns a cleanup function to remove the listener.
 * @param {(dark: boolean) => void} callback
 * @returns {() => void} cleanup
 */
export function watchColorScheme(callback) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (/** @type {MediaQueryListEvent} */ e) => callback(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/**
 * Watches for prefers-contrast changes and calls callback on change.
 * Returns a cleanup function to remove the listener.
 * @param {(highContrast: boolean) => void} callback
 * @returns {() => void} cleanup
 */
export function watchContrastPreference(callback) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-contrast: more)");
  const handler = (/** @type {MediaQueryListEvent} */ e) => callback(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

// ── WCAG Contrast Utilities ────────────────────────────────────────────────

/**
 * Parses a 3- or 6-digit hex color string (with or without #) to [r, g, b].
 * @param {string} hex
 * @returns {[number, number, number]}
 */
function hexToRgb(hex) {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3
    ? h.split("").map(c => `${c}${c}`).join("")
    : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/**
 * Converts a sRGB channel (0–255) to its linearized form for luminance.
 * @param {number} c
 * @returns {number}
 */
function linearize(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Computes the relative luminance of a hex color per WCAG 2.x.
 * @param {string} hex
 * @returns {number} luminance in [0, 1]
 */
export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Computes the WCAG 2.x contrast ratio between two hex colors.
 * Ratio is in [1, 21].
 * @param {string} fg Foreground hex color
 * @param {string} bg Background hex color
 * @returns {number}
 */
export function computeContrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true if the fg/bg pair meets WCAG 2.1 AA normal-text threshold (4.5:1).
 * @param {string} fg
 * @param {string} bg
 * @returns {boolean}
 */
export function isWcagAA(fg, bg) {
  return computeContrastRatio(fg, bg) >= 4.5;
}

/**
 * Returns true if the fg/bg pair meets WCAG 2.1 AA large-text threshold (3:1).
 * @param {string} fg
 * @param {string} bg
 * @returns {boolean}
 */
export function isWcagAALarge(fg, bg) {
  return computeContrastRatio(fg, bg) >= 3.0;
}

/**
 * Returns true if the fg/bg pair meets WCAG 2.1 AAA threshold (7:1).
 * @param {string} fg
 * @param {string} bg
 * @returns {boolean}
 */
export function isWcagAAA(fg, bg) {
  return computeContrastRatio(fg, bg) >= 7.0;
}

/**
 * Returns the WCAG compliance level for a color pair.
 * @param {string} fg
 * @param {string} bg
 * @returns {"AAA" | "AA" | "AA-large" | "fail"}
 */
export function wcagLevel(fg, bg) {
  const ratio = computeContrastRatio(fg, bg);
  if (ratio >= 7.0) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3.0) return "AA-large";
  return "fail";
}

// ── ARIA Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the implicit ARIA landmark role for common HTML elements.
 * Returns null for elements with no implicit landmark role.
 * @param {string} tag lowercase element tag name
 * @returns {string | null}
 */
export function getImplicitAriaRole(tag) {
  /** @type {Record<string, string>} */
  const MAP = {
    a: "link",
    article: "article",
    aside: "complementary",
    button: "button",
    dialog: "dialog",
    footer: "contentinfo",
    form: "form",
    header: "banner",
    img: "img",
    input: "textbox",
    li: "listitem",
    main: "main",
    nav: "navigation",
    ol: "list",
    option: "option",
    select: "listbox",
    table: "table",
    td: "cell",
    textarea: "textbox",
    th: "columnheader",
    tr: "row",
    ul: "list",
  };
  return MAP[tag.toLowerCase()] ?? null;
}

/**
 * Builds an accessible label string, optionally appending a suffix.
 * @param {string} base Base label text
 * @param {string} [suffix] Optional suffix (e.g. count)
 * @returns {string}
 */
export function buildAriaLabel(base, suffix) {
  const text = base.trim();
  if (!suffix) return text;
  return `${text} ${suffix.trim()}`;
}

/**
 * Checks whether a touch target meets the 44×44 CSS px minimum.
 * Accepts a DOMRect or {width, height} object.
 * @param {{ width: number; height: number }} rect
 * @param {number} [minPx=44]
 * @returns {boolean}
 */
export function meetsMinTouchTarget(rect, minPx = 44) {
  return rect.width >= minPx && rect.height >= minPx;
}
