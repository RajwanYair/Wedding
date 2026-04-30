import { describe, it, expect } from "vitest";
import {
  diffLines,
  renderUnified,
  diffStats,
} from "../../src/utils/diff-text.js";

describe("diff-text", () => {
  it("identical inputs yield only equal ops", () => {
    const ops = diffLines("a\nb", "a\nb");
    expect(ops.every((o) => o.type === "equal")).toBe(true);
  });

  it("addition produces add op", () => {
    const ops = diffLines("a", "a\nb");
    expect(ops).toEqual([
      { type: "equal", value: "a" },
      { type: "add", value: "b" },
    ]);
  });

  it("removal produces remove op", () => {
    const ops = diffLines("a\nb", "a");
    expect(ops).toEqual([
      { type: "equal", value: "a" },
      { type: "remove", value: "b" },
    ]);
  });

  it("change becomes remove + add", () => {
    const ops = diffLines("a\nb\nc", "a\nx\nc");
    expect(ops).toEqual([
      { type: "equal", value: "a" },
      { type: "remove", value: "b" },
      { type: "add", value: "x" },
      { type: "equal", value: "c" },
    ]);
  });

  it("handles empty old text", () => {
    const ops = diffLines("", "a\nb");
    expect(diffStats(ops)).toEqual({ added: 2, removed: 0, equal: 0 });
  });

  it("handles empty new text", () => {
    const ops = diffLines("a\nb", "");
    expect(diffStats(ops)).toEqual({ added: 0, removed: 2, equal: 0 });
  });

  it("handles both empty", () => {
    expect(diffLines("", "")).toEqual([]);
  });

  it("handles CRLF input", () => {
    const ops = diffLines("a\r\nb", "a\r\nc");
    expect(diffStats(ops).removed).toBe(1);
    expect(diffStats(ops).added).toBe(1);
  });

  it("renderUnified prefixes lines correctly", () => {
    const ops = diffLines("a\nb", "a\nc");
    const out = renderUnified(ops);
    expect(out).toContain(" a");
    expect(out).toContain("-b");
    expect(out).toContain("+c");
  });

  it("diffStats aggregates ops", () => {
    const ops = [
      { type: "equal", value: "x" },
      { type: "add", value: "y" },
      { type: "remove", value: "z" },
      { type: "add", value: "w" },
    ];
    expect(diffStats(/** @type {any} */ (ops))).toEqual({
      added: 2,
      removed: 1,
      equal: 1,
    });
  });

  it("preserves line ordering via LCS", () => {
    const ops = diffLines("a\nb\nc\nd", "a\nc\nd");
    const removed = ops.filter((o) => o.type === "remove").map((o) => o.value);
    expect(removed).toEqual(["b"]);
  });
});
