// @ts-check
/** tests/unit/command-palette-search.test.mjs — S600 */
import { describe, it, expect } from "vitest";
import {
  fuzzyScore,
  searchCommands,
  paletteReducer,
} from "../../src/utils/command-palette-search.js";

/** @type {import("../../src/utils/command-palette-search.js").Command[]} */
const cmds = [
  { id: "addg", label: "Add Guest", keywords: "rsvp invite", section: "Guests" },
  { id: "newt", label: "New Table", keywords: "seating", section: "Tables" },
  { id: "exp",  label: "Export CSV", keywords: "download backup", section: "Data" },
  { id: "set",  label: "Open Settings", keywords: "preferences", section: "App" },
];

describe("S600 command-palette-search", () => {
  it("fuzzyScore: prefix beats substring beats subsequence", () => {
    expect(fuzzyScore("Add Guest", "add")).toBeGreaterThan(fuzzyScore("Open Add", "add"));
    // Substring (idx>0) beats subsequence-only:
    expect(fuzzyScore("Open Add", "add")).toBeGreaterThan(fuzzyScore("Add Guest", "ag"));
  });

  it("fuzzyScore returns 0 when chars missing", () => {
    expect(fuzzyScore("hello", "xyz")).toBe(0);
  });

  it("fuzzyScore empty query returns 1", () => {
    expect(fuzzyScore("anything", "")).toBe(1);
  });

  it("searchCommands ranks prefix matches first", () => {
    const r = searchCommands(cmds, "add");
    expect(r[0].id).toBe("addg");
  });

  it("searchCommands matches keyword tokens", () => {
    const r = searchCommands(cmds, "seating");
    expect(r[0].id).toBe("newt");
  });

  it("searchCommands empty query returns all in order", () => {
    expect(searchCommands(cmds, "").map((c) => c.id)).toEqual(["addg", "newt", "exp", "set"]);
  });

  it("paletteReducer wraps up/down", () => {
    let s = { index: 0, total: 3 };
    s = paletteReducer(s, { type: "up" });
    expect(s.index).toBe(2);
    s = paletteReducer(s, { type: "down" });
    expect(s.index).toBe(0);
  });

  it("paletteReducer home/end + setTotal clamps", () => {
    let s = paletteReducer({ index: 5, total: 10 }, { type: "home" });
    expect(s.index).toBe(0);
    s = paletteReducer(s, { type: "end" });
    expect(s.index).toBe(9);
    s = paletteReducer(s, { type: "setTotal", total: 3 });
    expect(s).toEqual({ index: 2, total: 3 });
    s = paletteReducer(s, { type: "setTotal", total: 0 });
    expect(s).toEqual({ index: 0, total: 0 });
  });
});
