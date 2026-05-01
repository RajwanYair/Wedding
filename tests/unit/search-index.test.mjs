/**
 * tests/unit/search-index.test.mjs — S109 Cmd-K search index.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

vi.mock("../../src/core/store.js", () => ({
  storeGet: vi.fn((key) => {
    if (key === "guests") {
      return [
        { id: "g1", name: "Dana Cohen", phone: "972500000001" },
        { id: "g2", name: "Yossi Levi", phone: "972500000002" },
      ];
    }
    if (key === "tables") {
      return [{ id: "t1", name: "Bride Family", capacity: 10 }];
    }
    if (key === "vendors") {
      return [{ id: "v1", name: "DJ Mike", category: "music" }];
    }
    return [];
  }),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (key) => key.replace("nav_", ""),
}));

vi.mock("../../src/core/constants.js", () => ({
  SECTION_LIST: ["dashboard", "guests", "tables"],
}));

describe("S109 — search-index", () => {
  it("buildSearchIndex includes sections, guests, tables, vendors", async () => {
    const { buildSearchIndex } = await import("../../src/services/analytics.js");
    const idx = buildSearchIndex();
    expect(idx.length).toBe(5 + 3 + 2 + 1 + 1); // 5 commands + 3 sections + 2g + 1t + 1v
    expect(idx.find((e) => e.id === "section:dashboard")?.type).toBe("section");
    expect(idx.find((e) => e.id === "guest:g1")?.label).toBe("Dana Cohen");
  });

  it("searchIndex ranks prefix matches above substring matches", async () => {
    const { buildSearchIndex, searchIndex } = await import(
      "../../src/services/analytics.js"
    );
    const idx = buildSearchIndex();
    const res = searchIndex(idx, "Dana");
    expect(res[0]?.id).toBe("guest:g1");
  });

  it("searchIndex returns full list when query empty", async () => {
    const { buildSearchIndex, searchIndex } = await import(
      "../../src/services/analytics.js"
    );
    const idx = buildSearchIndex();
    expect(searchIndex(idx, "").length).toBe(idx.length);
  });

  it("searchIndex matches via hint (phone/category)", async () => {
    const { buildSearchIndex, searchIndex } = await import(
      "../../src/services/analytics.js"
    );
    const idx = buildSearchIndex();
    const res = searchIndex(idx, "972500000002");
    expect(res[0]?.id).toBe("guest:g2");
  });

  it("searchIndex respects limit", async () => {
    const { buildSearchIndex, searchIndex } = await import(
      "../../src/services/analytics.js"
    );
    const idx = buildSearchIndex();
    expect(searchIndex(idx, "", 2).length).toBe(2);
  });
});
