/**
 * src/utils/skeleton.js — Skeleton loading state utilities (Sprint 32)
 *
 * Provides functions to show/hide skeleton screen placeholders while sections
 * are loading data.  Framework-agnostic: operates on DOM elements directly.
 *
 * A "skeleton slot" is any element with the `data-skeleton` attribute.
 * Content elements inside the same container can carry `data-skeleton-hide`
 * to be hidden while the skeleton is visible.
 *
 * Usage:
 *   import { showSkeleton, hideSkeleton, createSkeletonRows } from "../utils/skeleton.js";
 *
 *   showSkeleton(container);          // show placeholders, hide real content
 *   hideSkeleton(container);          // hide placeholders, show real content
 *   createSkeletonRows(container, 5); // inject 5 generic skeleton row divs
 */

// ── Core API ──────────────────────────────────────────────────────────────

/**
 * Show skeleton placeholders within `container`. Any child with
 * `data-skeleton` is un-hidden; any child with `data-skeleton-hide` is hidden.
 *
 * @param {Element} container
 */
export function showSkeleton(container) {
  container.querySelectorAll("[data-skeleton]").forEach(
    /** @param {Element} el */ (el) => el.removeAttribute("hidden"),
  );
  container.querySelectorAll("[data-skeleton-hide]").forEach(
    /** @param {Element} el */ (el) => el.setAttribute("hidden", ""),
  );
  container.setAttribute("aria-busy", "true");
}

/**
 * Hide skeleton placeholders within `container`. Any child with
 * `data-skeleton` is hidden; any child with `data-skeleton-hide` is revealed.
 *
 * @param {Element} container
 */
export function hideSkeleton(container) {
  container.querySelectorAll("[data-skeleton]").forEach(
    /** @param {Element} el */ (el) => el.setAttribute("hidden", ""),
  );
  container.querySelectorAll("[data-skeleton-hide]").forEach(
    /** @param {Element} el */ (el) => el.removeAttribute("hidden"),
  );
  container.removeAttribute("aria-busy");
}

/**
 * Check whether a container is currently in skeleton (loading) state.
 * @param {Element} container
 * @returns {boolean}
 */
export function isSkeletonVisible(container) {
  return container.getAttribute("aria-busy") === "true";
}

// ── DOM injection helpers ──────────────────────────────────────────────────

/**
 * Inject `count` generic skeleton row `<div>` elements into `container`.
 * Existing `[data-skeleton]` children are removed first.
 *
 * @param {Element} container
 * @param {number} count  Number of rows to create
 * @param {{ className?: string }} [opts]
 */
export function createSkeletonRows(container, count, opts = {}) {
  // Remove existing injected skeletons
  container.querySelectorAll("[data-skeleton]").forEach(
    /** @param {Element} el */ (el) => el.remove(),
  );

  const className = opts.className ?? "skeleton-row";
  const frag = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.setAttribute("data-skeleton", "");
    row.className = className;
    row.setAttribute("aria-hidden", "true");
    frag.appendChild(row);
  }

  container.appendChild(frag);
}

/**
 * Remove all injected skeleton rows from `container`.
 * @param {Element} container
 */
export function clearSkeletonRows(container) {
  container.querySelectorAll("[data-skeleton]").forEach(
    /** @param {Element} el */ (el) => el.remove(),
  );
}

// ── runWithSkeleton ────────────────────────────────────────────────────────

/**
 * Wrap an async data-fetching operation with automatic skeleton show/hide.
 * Shows the skeleton before calling `fn`, hides it after (success or failure).
 *
 * @template T
 * @param {Element} container
 * @param {() => Promise<T>} fn  Async operation to run
 * @returns {Promise<T>}
 */
export async function runWithSkeleton(container, fn) {
  showSkeleton(container);
  try {
    return await fn();
  } finally {
    hideSkeleton(container);
  }
}
