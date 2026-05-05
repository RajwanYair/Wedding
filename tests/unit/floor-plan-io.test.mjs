// tests/unit/floor-plan-io.test.mjs — S629 floor-plan IO
import { describe, it, expect } from "vitest";
import {
  exportLayout,
  validateLayout,
  importLayout,
  toSvg,
} from "../../src/utils/floor-plan-io.js";

const room = { width: 800, height: 600 };
const items = [
  { id: "t1", type: "round-table", x: 100, y: 200, w: 80, h: 80, label: "Table 1" },
  { id: "d1", type: "dance-floor", x: 300, y: 100, w: 200, h: 150 },
];

describe("floor-plan-io", () => {
  describe("exportLayout", () => {
    it("produces a valid layout object", () => {
      const out = exportLayout("My Plan", room, items);
      expect(out.version).toBe(1);
      expect(out.name).toBe("My Plan");
      expect(out.items).toHaveLength(2);
      expect(out.exportedAt).toBeTruthy();
    });
    it("strips extra fields from items", () => {
      const extra = [{ id: "x", type: "bar", x: 0, y: 0, w: 50, h: 30, _custom: true }];
      const out = exportLayout("Test", room, extra);
      expect(out.items[0]).not.toHaveProperty("_custom");
    });
    it("handles null items", () => {
      const out = exportLayout("Empty", room, null);
      expect(out.items).toEqual([]);
    });
    it("defaults name when blank", () => {
      expect(exportLayout("", room, []).name).toBe("Untitled");
    });
  });

  describe("validateLayout", () => {
    it("passes valid layout", () => {
      const layout = exportLayout("Ok", room, items);
      expect(validateLayout(layout)).toEqual([]);
    });
    it("rejects null", () => {
      expect(validateLayout(null).length).toBeGreaterThan(0);
    });
    it("rejects missing room", () => {
      expect(validateLayout({ version: 1, name: "X", items: [] }).length).toBeGreaterThan(0);
    });
    it("rejects invalid item type", () => {
      const bad = { version: 1, name: "X", room, items: [{ id: "a", type: "fake", x: 0, y: 0, w: 10, h: 10 }] };
      expect(validateLayout(bad).some((e) => e.includes("invalid type"))).toBe(true);
    });
    it("rejects non-positive dimensions", () => {
      const bad = { version: 1, name: "X", room, items: [{ id: "a", type: "bar", x: 0, y: 0, w: 0, h: 10 }] };
      expect(validateLayout(bad).some((e) => e.includes("w must be positive"))).toBe(true);
    });
  });

  describe("importLayout", () => {
    it("imports valid layout", () => {
      const layout = exportLayout("Plan", room, items);
      const { ok, layout: result } = importLayout(layout);
      expect(ok).toBe(true);
      expect(result.name).toBe("Plan");
    });
    it("rejects invalid data", () => {
      const { ok, errors } = importLayout({ version: 0 });
      expect(ok).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("toSvg", () => {
    it("generates valid SVG string", () => {
      const svg = toSvg(room, items);
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("viewBox");
    });
    it("renders round tables as circles", () => {
      const svg = toSvg(room, [items[0]]);
      expect(svg).toContain("<circle");
    });
    it("renders rect items as rects", () => {
      const svg = toSvg(room, [items[1]]);
      expect(svg).toMatch(/<rect x="300"/);
    });
    it("escapes XML in labels", () => {
      const svg = toSvg(room, [{ id: "x", type: "bar", x: 0, y: 0, w: 50, h: 30, label: '<script>alert("xss")</script>' }]);
      expect(svg).toContain("&lt;script&gt;");
      expect(svg).not.toContain("<script>");
    });
    it("handles null items", () => {
      const svg = toSvg(room, null);
      expect(svg).toContain("<svg");
    });
  });
});
