/**
 * tests/unit/bulk-select.test.mjs — Sprint 106
 */

import { describe, it, expect, vi } from "vitest";
import { createBulkSelection } from "../../src/utils/bulk-select.js";

describe("createBulkSelection — basic selection", () => {
  it("starts empty", () => {
    const s = createBulkSelection(["a", "b", "c"]);
    expect(s.count()).toBe(0);
    expect(s.isEmpty()).toBe(true);
  });

  it("select / deselect individual id", () => {
    const s = createBulkSelection(["a", "b"]);
    s.select("a");
    expect(s.isSelected("a")).toBe(true);
    s.deselect("a");
    expect(s.isSelected("a")).toBe(false);
  });

  it("toggle switches selection state", () => {
    const s = createBulkSelection(["a", "b"]);
    s.toggle("a");
    expect(s.isSelected("a")).toBe(true);
    s.toggle("a");
    expect(s.isSelected("a")).toBe(false);
  });

  it("ignores select for id not in pool", () => {
    const s = createBulkSelection(["a"]);
    s.select("unknown");
    expect(s.count()).toBe(0);
  });
});

describe("createBulkSelection — selectAll / deselectAll / invert", () => {
  it("selectAll selects entire pool", () => {
    const s = createBulkSelection(["a", "b", "c"]);
    s.selectAll();
    expect(s.count()).toBe(3);
    expect(s.isAllSelected()).toBe(true);
  });

  it("deselectAll clears all", () => {
    const s = createBulkSelection(["a", "b"]);
    s.selectAll();
    s.deselectAll();
    expect(s.isEmpty()).toBe(true);
  });

  it("invert flips selection", () => {
    const s = createBulkSelection(["a", "b", "c"]);
    s.select("a");
    s.invert();
    expect(s.isSelected("a")).toBe(false);
    expect(s.isSelected("b")).toBe(true);
    expect(s.isSelected("c")).toBe(true);
  });
});

describe("createBulkSelection — selectRange", () => {
  it("selects contiguous range by array order", () => {
    const s = createBulkSelection(["a", "b", "c", "d", "e"]);
    s.selectRange("b", "d");
    expect(s.getSelected().sort()).toEqual(["b", "c", "d"]);
  });

  it("selectRange works in reverse order", () => {
    const s = createBulkSelection(["a", "b", "c", "d"]);
    s.selectRange("d", "b");
    expect(s.getSelected().sort()).toEqual(["b", "c", "d"]);
  });

  it("ignores unknown id in range", () => {
    const s = createBulkSelection(["a", "b"]);
    s.selectRange("a", "z");  // z not in pool
    expect(s.count()).toBe(0);
  });
});

describe("createBulkSelection — setItems", () => {
  it("removes selected ids not in new pool", () => {
    const s = createBulkSelection(["a", "b", "c"]);
    s.selectAll();
    s.setItems(["a", "b"]);
    expect(s.getSelected().includes("c")).toBe(false);
  });
});

describe("createBulkSelection — onChange callback", () => {
  it("fires onChange on select", () => {
    const cb = vi.fn();
    const s = createBulkSelection(["a", "b"], { onChange: cb });
    s.select("a");
    expect(cb).toHaveBeenCalledWith(["a"]);
  });

  it("fires onChange on deselectAll", () => {
    const cb = vi.fn();
    const s = createBulkSelection(["a"], { onChange: cb });
    s.selectAll();
    s.deselectAll();
    expect(cb).toHaveBeenCalledTimes(2);
  });
});

describe("createBulkSelection — indeterminate state", () => {
  it("isIndeterminate when some (not all) selected", () => {
    const s = createBulkSelection(["a", "b", "c"]);
    s.select("a");
    expect(s.isIndeterminate()).toBe(true);
    expect(s.isAllSelected()).toBe(false);
  });

  it("not indeterminate when all selected", () => {
    const s = createBulkSelection(["a", "b"]);
    s.selectAll();
    expect(s.isIndeterminate()).toBe(false);
  });
});
