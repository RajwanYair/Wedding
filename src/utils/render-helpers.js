/**
 * src/utils/render-helpers.js — UI state render primitives (Sprint 12 / Phase 6)
 *
 * Pure helpers that produce safe HTML strings for empty states, loading skeletons,
 * and error banners. All output is built from `textContent`-safe string operations
 * with no dynamic HTML injection.
 *
 * Usage:
 *   import { renderEmpty, renderLoading, renderError, renderCount } from "../utils/render-helpers.js";
 *   container.innerHTML = renderEmpty("no-guests-yet");   // i18n key
 */

import { t } from "../core/i18n.js";

// ── Empty state ───────────────────────────────────────────────────────────

/**
 * Build an empty-state placeholder string for a section or list.
 *
 * @param {string}  i18nKey            i18n key for the message (e.g. "no_guests_yet")
 * @param {object}  [opts]
 * @param {string}  [opts.icon]        Unicode emoji / icon character (default "📭")
 * @param {string}  [opts.actionKey]   Optional i18n key for a CTA label
 * @param {string}  [opts.action]      data-action value for the CTA button
 * @returns {string}  Safe HTML string
 */
export function renderEmpty(i18nKey, opts = {}) {
  const icon = opts.icon ?? "📭";
  const msg = t(i18nKey) || i18nKey;
  let html = `<div class="empty-state" role="status" aria-live="polite">
  <span class="empty-state__icon" aria-hidden="true">${_escText(icon)}</span>
  <p class="empty-state__text">${_escText(msg)}</p>`;
  if (opts.actionKey && opts.action) {
    const label = t(opts.actionKey) || opts.actionKey;
    html += `\n  <button class="btn btn-primary empty-state__cta" data-action="${_escAttr(opts.action)}">${_escText(label)}</button>`;
  }
  html += "\n</div>";
  return html;
}

// ── Loading skeleton ──────────────────────────────────────────────────────

/**
 * Build a loading skeleton placeholder.
 *
 * @param {number} [rows=3]  Number of skeleton rows to render
 * @param {object} [opts]
 * @param {string} [opts.variant]  "card" | "list" | "table" (default "list")
 * @returns {string}  Safe HTML string
 */
export function renderLoading(rows = 3, opts = {}) {
  const variant = opts.variant ?? "list";
  const rowHtml = Array.from({ length: rows }, (_, i) =>
    `  <div class="skeleton-row skeleton-row--${_escAttr(variant)}" aria-hidden="true">
    <div class="skeleton skeleton--line" style="width:${60 + (i % 3) * 15}%"></div>
    <div class="skeleton skeleton--line skeleton--short"></div>
  </div>`,
  ).join("\n");

  return `<div class="skeleton-container" role="status" aria-label="${_escAttr(t("loading") || "Loading…")}">
  <span class="sr-only">${_escText(t("loading") || "Loading…")}</span>
${rowHtml}
</div>`;
}

// ── Error state ───────────────────────────────────────────────────────────

/**
 * Build an error banner.
 *
 * @param {string} message  Error message (already localized or plain string)
 * @param {object} [opts]
 * @param {string} [opts.retryAction]  data-action for a "Retry" button
 * @returns {string}  Safe HTML string
 */
export function renderError(message, opts = {}) {
  let html = `<div class="error-state" role="alert" aria-live="assertive">
  <span class="error-state__icon" aria-hidden="true">⚠️</span>
  <p class="error-state__text">${_escText(message)}</p>`;
  if (opts.retryAction) {
    const retryLabel = t("retry") || "Retry";
    html += `\n  <button class="btn btn-secondary error-state__retry" data-action="${_escAttr(opts.retryAction)}">${_escText(retryLabel)}</button>`;
  }
  html += "\n</div>";
  return html;
}

// ── Count badge ───────────────────────────────────────────────────────────

/**
 * Build a small numeric badge string (e.g. for tabs, headings).
 *
 * @param {number} count
 * @param {object} [opts]
 * @param {string} [opts.label]  SR-only accessible label prefix
 * @returns {string}  Safe HTML string
 */
export function renderCount(count, opts = {}) {
  const n = Math.max(0, Math.floor(count));
  const label = opts.label ? `${_escText(opts.label)} ` : "";
  return `<span class="badge" aria-label="${label}${n}">${n > 999 ? "999+" : String(n)}</span>`;
}

// ── Internal escaping ─────────────────────────────────────────────────────

/** Escape text for safe injection into element content. */
function _escText(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape text for safe use inside an HTML attribute value (double-quoted). */
function _escAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
