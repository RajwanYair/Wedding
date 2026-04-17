/**
 * tests/unit/virtual-list.test.mjs — Sprint 14 virtual list viewport
 */
import { describe, it, expect } from "vitest";
import { createVirtualViewport } from "../../src/utils/virtual-list.js";

const makeItems = (n = 100) =>
  Array.from({ length: n }, (_, i) => ({ id: `row-${i + 1}`, value: i + 1 }));

describe("createVirtualViewport", () => {
  it("throws for invalid itemHeight", () => {
    expect(() => createVirtualViewport([], { itemHeight: 0, windowHeight: 500 })).toThrow(RangeError);
  });

  it("throws for invalid windowHeight", () => {
    expect(() => createVirtualViewport([], { itemHeight: 50, windowHeight: 0 })).toThrow(RangeError);
  });

  it("returns all items when total height fits in window", () => {
    const vl = createVirtualViewport(makeItems(5), { itemHeight: 50, windowHeight: 500, overscan: 0 });
    vl.scrollTo(0);
    const { items, offsetY, totalHeight } = vl.getViewport();
    expect(items).toHaveLength(5);
    expect(offsetY).toBe(0);
    expect(totalHeight).toBe(250);
  });

  it("windows a subset for large lists", () => {
    const vl = createVirtualViewport(makeItems(200), { itemHeight: 50, windowHeight: 200, overscan: 0 });
    vl.scrollTo(0);
    const { items, totalHeight } = vl.getViewport();
    expect(items.length).toBeLessThan(200);
    expect(totalHeight).toBe(10000);
  });

  it("scrollTo changes the visible window", () => {
    const vl = createVirtualViewport(makeItems(100), { itemHeight: 50, windowHeight: 200, overscan: 0 });
    vl.scrollTo(0);
    const before = vl.getViewport();
    vl.scrollTo(500); // 10 rows down
    const after = vl.getViewport();
    expect(after.startIndex).toBeGreaterThan(before.startIndex);
    expect(after.offsetY).toBeGreaterThan(before.offsetY);
  });

  it("scrollTo negative value clamps to 0", () => {
    const vl = createVirtualViewport(makeItems(20), { itemHeight: 50, windowHeight: 200, overscan: 0 });
    vl.scrollTo(-100);
    const { offsetY } = vl.getViewport();
    expect(offsetY).toBe(0);
  });

  it("setItems replaces items and resets scroll", () => {
    const vl = createVirtualViewport(makeItems(50), { itemHeight: 50, windowHeight: 200, overscan: 0 });
    vl.scrollTo(1000);
    vl.setItems(makeItems(10));
    const { totalHeight, items } = vl.getViewport();
    expect(totalHeight).toBe(500);
    expect(items.length).toBeLessThanOrEqual(10);
  });

  it("setItems throws for non-array", () => {
    const vl = createVirtualViewport(makeItems(10), { itemHeight: 50, windowHeight: 200 });
    // @ts-ignore
    expect(() => vl.setItems("bad")).toThrow(TypeError);
  });

  it("overscan adds extra rows above and below viewport", () => {
    const vl0 = createVirtualViewport(makeItems(100), { itemHeight: 50, windowHeight: 200, overscan: 0 });
    const vl3 = createVirtualViewport(makeItems(100), { itemHeight: 50, windowHeight: 200, overscan: 3 });
    vl0.scrollTo(500);
    vl3.scrollTo(500);
    const v0 = vl0.getViewport();
    const v3 = vl3.getViewport();
    expect(v3.items.length).toBeGreaterThan(v0.items.length);
  });
});
