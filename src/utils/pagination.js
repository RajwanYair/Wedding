/**
 * src/utils/pagination.js — Pagination helpers (Sprint 14 / Phase 2-3)
 *
 * Provides:
 *  - paginateArray(items, opts): in-memory offset pagination
 *  - cursorPaginateArray(items, opts): cursor-based pagination
 *  - createPageState(total, pageSize): reactive page state helper
 *  - buildPageButtons(state): generate page button metadata
 *
 * Designed for large guest lists (500–2000+ items) where rendering
 * a full list on every store change is impractical.
 *
 * Usage:
 *   import { paginateArray, cursorPaginateArray } from "../utils/pagination.js";
 *   const {items, totalPages} = paginateArray(guests, { page: 1, pageSize: 50 });
 */

// ── Offset pagination ─────────────────────────────────────────────────────

/**
 * Paginate an array by offset/page number.
 *
 * @template T
 * @param {T[]} items             Full item array
 * @param {{ page: number, pageSize: number }} opts
 * @returns {{ items: T[], page: number, pageSize: number, total: number, totalPages: number, hasNext: boolean, hasPrev: boolean }}
 */
export function paginateArray(items, { page = 1, pageSize = 50 } = {}) {
  if (!Array.isArray(items)) throw new TypeError("paginateArray: items must be an array");
  if (pageSize < 1) throw new RangeError("paginateArray: pageSize must be >= 1");

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  return {
    items: items.slice(start, end),
    page: safePage,
    pageSize,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

// ── Cursor-based pagination ───────────────────────────────────────────────

/**
 * Paginate an array using an opaque cursor (item id or ISO date string).
 * Items are assumed to be sorted by the cursor field already.
 *
 * @template {{ id: string } & Record<string, unknown>} T
 * @param {T[]} items
 * @param {{ cursor?: string, limit?: number, direction?: "forward" | "backward" }} opts
 * @returns {{ items: T[], nextCursor: string | null, prevCursor: string | null, total: number }}
 */
export function cursorPaginateArray(items, { cursor, limit = 50, direction = "forward" } = {}) {
  if (!Array.isArray(items)) throw new TypeError("cursorPaginateArray: items must be an array");
  if (limit < 1) throw new RangeError("cursorPaginateArray: limit must be >= 1");

  const total = items.length;
  let startIdx = 0;

  if (cursor) {
    const cursorIdx = items.findIndex((item) => item.id === cursor);
    if (cursorIdx !== -1) {
      startIdx = direction === "backward"
        ? Math.max(0, cursorIdx - limit)
        : cursorIdx + 1;
    }
  }

  const sliced = items.slice(startIdx, startIdx + limit);
  const nextCursor = startIdx + sliced.length < total
    ? sliced[sliced.length - 1]?.id ?? null
    : null;
  const prevCursor = startIdx > 0
    ? items[startIdx - 1]?.id ?? null
    : null;

  return { items: sliced, nextCursor, prevCursor, total };
}

// ── Page state helper ─────────────────────────────────────────────────────

/**
 * Create a mutable page state object for use with paginateArray.
 *
 * @param {{ total?: number, pageSize?: number, page?: number }} [opts]
 * @returns {{ page: number, pageSize: number, total: number, goto(n: number): void, next(): void, prev(): void }}
 */
export function createPageState({ total = 0, pageSize = 50, page = 1 } = {}) {
  const state = {
    page,
    pageSize,
    total,

    /** Navigate to an absolute page number (1-based). */
    goto(n) {
      const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
      state.page = Math.max(1, Math.min(n, totalPages));
    },

    /** Move to the next page if available. */
    next() {
      const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
      if (state.page < totalPages) state.page++;
    },

    /** Move to the previous page if available. */
    prev() {
      if (state.page > 1) state.page--;
    },
  };
  return state;
}

// ── Page button metadata ──────────────────────────────────────────────────

/**
 * Generate page button metadata for a pagination control.
 * Uses a sliding window of ±2 pages around the current page.
 *
 * @param {{ page: number, totalPages: number }} state
 * @returns {{ page: number, label: string, isCurrent: boolean, isEllipsis: boolean }[]}
 */
export function buildPageButtons(state) {
  const { page, totalPages } = state;
  if (totalPages <= 1) return [];

  /** @type {{ page: number, label: string, isCurrent: boolean, isEllipsis: boolean }[]} */
  const buttons = [];
  const WINDOW = 2;

  /** @param {number} n */
  const push = (n) => buttons.push({ page: n, label: String(n), isCurrent: n === page, isEllipsis: false });
  const ellipsis = (n) => buttons.push({ page: n, label: "…", isCurrent: false, isEllipsis: true });

  push(1);
  if (page - WINDOW > 2) ellipsis(Math.floor((1 + page - WINDOW) / 2));
  for (let i = Math.max(2, page - WINDOW); i <= Math.min(totalPages - 1, page + WINDOW); i++) {
    push(i);
  }
  if (page + WINDOW < totalPages - 1) ellipsis(Math.floor((page + WINDOW + totalPages) / 2));
  if (totalPages > 1) push(totalPages);

  return buttons;
}
