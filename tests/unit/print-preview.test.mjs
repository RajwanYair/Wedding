/**
 * tests/unit/print-preview.test.mjs — Sprint 149 print preview + section picker
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const _store = new Map();
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: (k) => _store.get(k) ?? null,
  writeBrowserStorageJson: (k, v) => {
    _store.set(k, JSON.parse(JSON.stringify(v)));
  },
}));
vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: (k, v) => {
    _store.set(k, v);
  },
  storeSubscribe: () => () => {},
}));
vi.mock("../../src/core/i18n.js", () => ({
  t: (k) => k,
}));

beforeEach(() => {
  _store.clear();
});

const { buildPreviewHtml, executePrint, PRINT_TEMPLATES } =
  await import("../../src/services/export.js");

describe("PrintPreview (Sprint 149)", () => {
  describe("PRINT_TEMPLATES", () => {
    it("has 5 templates", () => {
      expect(PRINT_TEMPLATES).toHaveLength(5);
    });

    it("includes guests, seating, vendors, budget, timeline", () => {
      const keys = PRINT_TEMPLATES.map((t) => t.key);
      expect(keys).toContain("guests");
      expect(keys).toContain("seating");
      expect(keys).toContain("vendors");
      expect(keys).toContain("budget");
      expect(keys).toContain("timeline");
    });
  });

  describe("buildPreviewHtml", () => {
    it("returns no-data for empty guests store", () => {
      const html = buildPreviewHtml("guests");
      expect(html).toContain("<p>");
    });

    it("renders guest table when guests exist", () => {
      _store.set("guests", [
        { firstName: "Alice", lastName: "B", status: "confirmed", phone: "054" },
      ]);
      const html = buildPreviewHtml("guests");
      expect(html).toContain("<table>");
      expect(html).toContain("Alice");
    });

    it("renders vendor table when vendors exist", () => {
      _store.set("vendors", [{ name: "DJ Pro", category: "music", price: 5000, paid: 2000 }]);
      const html = buildPreviewHtml("vendors");
      expect(html).toContain("DJ Pro");
      expect(html).toContain("5,000");
    });

    it("renders budget with gifts", () => {
      _store.set("budget", [{ name: "Custom", amount: 1000 }]);
      _store.set("guests", [{ firstName: "Bob", lastName: "C", gift: 500 }]);
      const html = buildPreviewHtml("budget");
      expect(html).toContain("Custom");
      expect(html).toContain("Bob");
    });

    it("renders no-data for unknown section", () => {
      const html = buildPreviewHtml("nonexistent");
      expect(html).toContain("<p>");
    });
  });

  describe("executePrint", () => {
    it("calls opener with print-ready HTML", () => {
      const mockWin = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        print: vi.fn(),
      };
      const opener = vi.fn().mockReturnValue(mockWin);
      _store.set("guests", [{ firstName: "Test", lastName: "G", status: "pending" }]);
      const result = executePrint("guests", opener);
      expect(result.ok).toBe(true);
      expect(opener).toHaveBeenCalledWith("", "_blank");
      expect(mockWin.document.write).toHaveBeenCalled();
    });
  });
});
