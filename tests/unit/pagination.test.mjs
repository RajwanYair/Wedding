/**
 * tests/unit/pagination.test.mjs — Sprint 14 pagination utilities
 */
import { describe, it, expect } from "vitest";
import {
  paginateArray,
  cursorPaginateArray,
  createPageState,
  buildPageButtons,
} from "../../src/utils/pagination.js";

// shared fixture
const makeItems = (n = 100) => Array.from({ length: n }, (_, i) => ({ id: `item-${i + 1}`, value: i + 1 }));

describe("paginateArray", () => {
  it("returns page 1 by default", () => {
    const { items, page, total, totalPages } = paginateArray(makeItems(100));
    expect(page).toBe(1);
    expect(items).toHaveLength(50);
    expect(total).toBe(100);
    expect(totalPages).toBe(2);
  });

  it("returns correct slice for page 2", () => {
    const { items, hasNext, hasPrev } = paginateArray(makeItems(100), { page: 2, pageSize: 50 });
    expect(items[0].value).toBe(51);
    expect(hasNext).toBe(false);
    expect(hasPrev).toBe(true);
  });

  it("clamps page below 1 to 1", () => {
    const { page } = paginateArray(makeItems(10), { page: 0, pageSize: 5 });
    expect(page).toBe(1);
  });

  it("clamps page above totalPages to totalPages", () => {
    const { page } = paginateArray(makeItems(10), { page: 99, pageSize: 5 });
    expect(page).toBe(2);
  });

  it("empty array returns page 1 with 0 items", () => {
    const result = paginateArray([]);
    expect(result.items).toHaveLength(0);
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  it("throws TypeError for non-array", () => {
    // @ts-ignore
    expect(() => paginateArray(null)).toThrow(TypeError);
  });

  it("throws RangeError for pageSize < 1", () => {
    expect(() => paginateArray([], { page: 1, pageSize: 0 })).toThrow(RangeError);
  });
});

describe("cursorPaginateArray", () => {
  it("returns first N items when no cursor given", () => {
    const { items, nextCursor, prevCursor } = cursorPaginateArray(makeItems(20), { limit: 5 });
    expect(items).toHaveLength(5);
    expect(items[0].id).toBe("item-1");
    expect(nextCursor).toBe("item-5");
    expect(prevCursor).toBeNull();
  });

  it("pages forward using cursor", () => {
    const all = makeItems(20);
    const { nextCursor } = cursorPaginateArray(all, { limit: 5 });
    const page2 = cursorPaginateArray(all, { cursor: nextCursor ?? undefined, limit: 5 });
    expect(page2.items[0].id).toBe("item-6");
  });

  it("returns null nextCursor on last page", () => {
    const { nextCursor } = cursorPaginateArray(makeItems(5), { limit: 10 });
    expect(nextCursor).toBeNull();
  });

  it("throws TypeError for non-array", () => {
    // @ts-ignore
    expect(() => cursorPaginateArray("bad")).toThrow(TypeError);
  });

  it("throws RangeError for limit < 1", () => {
    expect(() => cursorPaginateArray([], { limit: 0 })).toThrow(RangeError);
  });
});

describe("createPageState", () => {
  it("initialises with defaults", () => {
    const s = createPageState();
    expect(s.page).toBe(1);
    expect(s.pageSize).toBe(50);
    expect(s.total).toBe(0);
  });

  it("goto clamps to valid range", () => {
    const s = createPageState({ total: 100, pageSize: 10, page: 1 });
    s.goto(999);
    expect(s.page).toBe(10);
    s.goto(-5);
    expect(s.page).toBe(1);
  });

  it("next / prev navigate pages", () => {
    const s = createPageState({ total: 30, pageSize: 10, page: 1 });
    s.next();
    expect(s.page).toBe(2);
    s.prev();
    expect(s.page).toBe(1);
  });

  it("next stops at last page", () => {
    const s = createPageState({ total: 10, pageSize: 10, page: 1 });
    s.next();
    s.next(); // no-op
    expect(s.page).toBe(1);
  });
});

describe("buildPageButtons", () => {
  it("returns empty array for 1 total page", () => {
    expect(buildPageButtons({ page: 1, totalPages: 1 })).toHaveLength(0);
  });

  it("marks current page correctly", () => {
    const buttons = buildPageButtons({ page: 3, totalPages: 5 });
    const current = buttons.filter((b) => b.isCurrent);
    expect(current).toHaveLength(1);
    expect(current[0].page).toBe(3);
  });

  it("includes first and last page", () => {
    const buttons = buildPageButtons({ page: 5, totalPages: 10 });
    expect(buttons.some((b) => b.page === 1 && !b.isEllipsis)).toBe(true);
    expect(buttons.some((b) => b.page === 10 && !b.isEllipsis)).toBe(true);
  });

  it("adds ellipsis entries for large page ranges", () => {
    const buttons = buildPageButtons({ page: 1, totalPages: 20 });
    expect(buttons.some((b) => b.isEllipsis)).toBe(true);
  });
});
