/**
 * tests/unit/keyboard-nav.test.mjs — Sprint 202
 */

import { describe, it, expect } from "vitest";
import {
  prevIndex,
  nextIndex,
  firstIndex,
  lastIndex,
  gridNav,
  defaultKeyMap,
  keyToAction,
  typeAheadIndex,
} from "../../src/utils/keyboard-nav.js";

describe("prevIndex", () => {
  it("decrements normally", () => expect(prevIndex(3, 5)).toBe(2));
  it("wraps to last when at 0 (default)", () => expect(prevIndex(0, 5)).toBe(4));
  it("stays at 0 when wrap=false", () => expect(prevIndex(0, 5, { wrap: false })).toBe(0));
  it("returns -1 for empty list", () => expect(prevIndex(0, 0)).toBe(-1));
});

describe("nextIndex", () => {
  it("increments normally", () => expect(nextIndex(2, 5)).toBe(3));
  it("wraps to 0 at end (default)", () => expect(nextIndex(4, 5)).toBe(0));
  it("stays at last when wrap=false", () => expect(nextIndex(4, 5, { wrap: false })).toBe(4));
  it("returns -1 for empty list", () => expect(nextIndex(0, 0)).toBe(-1));
});

describe("firstIndex / lastIndex", () => {
  it("firstIndex returns 0", () => expect(firstIndex(5)).toBe(0));
  it("lastIndex returns total-1", () => expect(lastIndex(5)).toBe(4));
  it("firstIndex returns -1 for empty", () => expect(firstIndex(0)).toBe(-1));
  it("lastIndex returns -1 for empty", () => expect(lastIndex(0)).toBe(-1));
});

describe("gridNav", () => {
  // 3-col grid, 9 items: [0,1,2, 3,4,5, 6,7,8]
  it("moves right", () => expect(gridNav(4, 9, 3, "right")).toBe(5));
  it("moves left", () => expect(gridNav(4, 9, 3, "left")).toBe(3));
  it("moves up", () => expect(gridNav(4, 9, 3, "up")).toBe(1));
  it("moves down", () => expect(gridNav(4, 9, 3, "down")).toBe(7));
  it("clamps at boundary without wrap", () => expect(gridNav(2, 9, 3, "right")).toBe(3));
  it("returns -1 for empty grid", () => expect(gridNav(0, 0, 3, "down")).toBe(-1));
});

describe("keyToAction", () => {
  it("ArrowUp → up", () => expect(keyToAction("ArrowUp")).toBe("up"));
  it("ArrowDown → down", () => expect(keyToAction("ArrowDown")).toBe("down"));
  it("Enter → select", () => expect(keyToAction("Enter")).toBe("select"));
  it("Escape → escape", () => expect(keyToAction("Escape")).toBe("escape"));
  it("unknown key → null", () => expect(keyToAction("Tab")).toBeNull());
  it("custom keyMap overrides", () => {
    expect(keyToAction("k", { k: "up" })).toBe("up");
  });
});

describe("defaultKeyMap", () => {
  it("returns an object with ArrowUp", () => {
    expect(defaultKeyMap()).toHaveProperty("ArrowUp", "up");
  });
  it("returns an object with Home", () => {
    expect(defaultKeyMap()).toHaveProperty("Home", "first");
  });
});

describe("typeAheadIndex", () => {
  const labels = ["Apple", "Banana", "Avocado", "Cherry"];
  it("finds item starting with typed char after current", () => {
    expect(typeAheadIndex(labels, "a", 0)).toBe(2); // Avocado, wrapping past Apple
  });
  it("returns -1 if no match", () => {
    expect(typeAheadIndex(labels, "z", 0)).toBe(-1);
  });
  it("returns -1 for empty labels", () => {
    expect(typeAheadIndex([], "a", 0)).toBe(-1);
  });
  it("returns -1 for empty char", () => {
    expect(typeAheadIndex(labels, "", 0)).toBe(-1);
  });
  it("wraps around and finds earlier match", () => {
    expect(typeAheadIndex(labels, "a", 2)).toBe(0); // Apple after Avocado
  });
});
