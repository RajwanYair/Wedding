import { describe, it, expect, beforeEach } from "vitest";
import {
  createIndex,
  indexDocument,
  indexDocuments,
  removeDocument,
  searchIndex,
  rankResults,
  buildGuestIndex,
  buildVendorIndex,
  highlightMatches,
  normalizeSearchQuery,
} from "../../src/utils/search-index.js";

// ── Fixtures ──────────────────────────────────────────────────────────────

const GUESTS = [
  { id: "g1", name: "Alice Cohen", phone: "972501234567", tableId: "t1", group: "family" },
  { id: "g2", name: "Bob Levi", phone: "972509876543", tableId: "t2", group: "friends" },
  { id: "g3", name: "Alice Mizrahi", phone: "972521112222", tableId: "t1", group: "work" },
];

const VENDORS = [
  { id: "v1", name: "Floral Dreams", category: "flowers", contact: "florist@example.com", status: "signed" },
  { id: "v2", name: "Tasty Bites Catering", category: "catering", contact: "chef@example.com", status: "pending" },
];

// ── normalizeSearchQuery ──────────────────────────────────────────────────

describe("normalizeSearchQuery()", () => {
  it("lowercases", () => expect(normalizeSearchQuery("ALICE")).toBe("alice"));
  it("trims whitespace", () => expect(normalizeSearchQuery("  hello  ")).toBe("hello"));
  it("collapses internal spaces", () => expect(normalizeSearchQuery("alice   cohen")).toBe("alice cohen"));
  it("returns empty for null", () => expect(normalizeSearchQuery(null)).toBe(""));
  it("returns empty for empty string", () => expect(normalizeSearchQuery("")).toBe(""));
});

// ── createIndex ───────────────────────────────────────────────────────────

describe("createIndex()", () => {
  it("returns empty docs and tokens maps", () => {
    const idx = createIndex();
    expect(idx.docs.size).toBe(0);
    expect(idx.tokens.size).toBe(0);
  });
});

// ── indexDocument ─────────────────────────────────────────────────────────

describe("indexDocument()", () => {
  let idx;
  beforeEach(() => { idx = createIndex(); });

  it("adds document to docs map", () => {
    indexDocument(idx, { id: "g1", name: "Alice" });
    expect(idx.docs.has("g1")).toBe(true);
  });

  it("builds token entries", () => {
    indexDocument(idx, { id: "g1", name: "Alice Cohen" });
    expect(idx.tokens.has("alice")).toBe(true);
    expect(idx.tokens.has("cohen")).toBe(true);
  });

  it("re-indexes on duplicate id without duplicating tokens", () => {
    indexDocument(idx, { id: "g1", name: "Alice" });
    indexDocument(idx, { id: "g1", name: "Bob" });
    expect(idx.docs.get("g1").name).toBe("Bob");
    expect(idx.tokens.has("alice")).toBe(false);
    expect(idx.tokens.has("bob")).toBe(true);
  });

  it("ignores null doc", () => {
    indexDocument(idx, null);
    expect(idx.docs.size).toBe(0);
  });

  it("indexes only specified fields", () => {
    indexDocument(idx, { id: "g1", name: "Alice", notes: "VIP" }, ["name"]);
    expect(idx.tokens.has("alice")).toBe(true);
    expect(idx.tokens.has("vip")).toBe(false);
  });
});

// ── indexDocuments ────────────────────────────────────────────────────────

describe("indexDocuments()", () => {
  it("indexes multiple docs", () => {
    const idx = createIndex();
    indexDocuments(idx, GUESTS, ["name"]);
    expect(idx.docs.size).toBe(3);
  });

  it("handles non-array gracefully", () => {
    const idx = createIndex();
    indexDocuments(idx, null);
    expect(idx.docs.size).toBe(0);
  });
});

// ── removeDocument ────────────────────────────────────────────────────────

describe("removeDocument()", () => {
  it("removes doc from docs map", () => {
    const idx = buildGuestIndex(GUESTS);
    removeDocument(idx, "g1");
    expect(idx.docs.has("g1")).toBe(false);
  });

  it("cleans up exclusive tokens", () => {
    const idx = createIndex();
    indexDocument(idx, { id: "g1", name: "Xyzzy" });
    removeDocument(idx, "g1");
    expect(idx.tokens.has("xyzzy")).toBe(false);
  });

  it("does not remove token still referenced by other docs", () => {
    const idx = createIndex();
    indexDocument(idx, { id: "g1", name: "Alice" });
    indexDocument(idx, { id: "g2", name: "Alice Smith" });
    removeDocument(idx, "g1");
    expect(idx.tokens.get("alice").has("g2")).toBe(true);
  });

  it("ignores missing id gracefully", () => {
    const idx = buildGuestIndex(GUESTS);
    expect(() => removeDocument(idx, "nonexistent")).not.toThrow();
  });
});

// ── searchIndex ───────────────────────────────────────────────────────────

describe("searchIndex()", () => {
  let idx;
  beforeEach(() => { idx = buildGuestIndex(GUESTS); });

  it("returns empty for null index", () => expect(searchIndex(null, "alice")).toEqual([]));
  it("returns empty for empty query", () => expect(searchIndex(idx, "")).toEqual([]));

  it("finds exact name match", () => {
    const results = searchIndex(idx, "Alice");
    expect(results.map((r) => r.id)).toContain("g1");
    expect(results.map((r) => r.id)).toContain("g3");
    expect(results.map((r) => r.id)).not.toContain("g2");
  });

  it("finds partial token match via prefix", () => {
    const results = searchIndex(idx, "Coh");
    expect(results.map((r) => r.id)).toContain("g1");
  });

  it("returns higher score for more tokens matched", () => {
    const results = searchIndex(idx, "alice cohen");
    const g1 = results.find((r) => r.id === "g1");
    const g3 = results.find((r) => r.id === "g3");
    expect(g1.score).toBeGreaterThan(g3.score);
  });

  it("is case-insensitive", () => {
    const r1 = searchIndex(idx, "ALICE");
    const r2 = searchIndex(idx, "alice");
    expect(r1.map((r) => r.id)).toEqual(r2.map((r) => r.id));
  });
});

// ── rankResults ───────────────────────────────────────────────────────────

describe("rankResults()", () => {
  it("sorts by descending score", () => {
    const input = [
      { id: "a", score: 1, doc: {} },
      { id: "b", score: 3, doc: {} },
      { id: "c", score: 2, doc: {} },
    ];
    const ranked = rankResults(input);
    expect(ranked[0].id).toBe("b");
    expect(ranked[1].id).toBe("c");
  });

  it("stable-sorts by id when scores are equal", () => {
    const input = [
      { id: "z", score: 2, doc: {} },
      { id: "a", score: 2, doc: {} },
    ];
    const ranked = rankResults(input);
    expect(ranked[0].id).toBe("a");
  });

  it("returns empty for null", () => expect(rankResults(null)).toEqual([]));
  it("does not mutate input", () => {
    const input = [{ id: "x", score: 1, doc: {} }];
    rankResults(input);
    expect(input).toHaveLength(1);
  });
});

// ── buildGuestIndex ───────────────────────────────────────────────────────

describe("buildGuestIndex()", () => {
  it("creates index with all guests", () => {
    const idx = buildGuestIndex(GUESTS);
    expect(idx.docs.size).toBe(3);
  });

  it("search finds guests by name", () => {
    const idx = buildGuestIndex(GUESTS);
    const results = searchIndex(idx, "bob");
    expect(results[0].id).toBe("g2");
  });
});

// ── buildVendorIndex ──────────────────────────────────────────────────────

describe("buildVendorIndex()", () => {
  it("creates index with all vendors", () => {
    const idx = buildVendorIndex(VENDORS);
    expect(idx.docs.size).toBe(2);
  });

  it("search finds vendor by category", () => {
    const idx = buildVendorIndex(VENDORS);
    const results = searchIndex(idx, "catering");
    expect(results[0].id).toBe("v2");
  });
});

// ── highlightMatches ──────────────────────────────────────────────────────

describe("highlightMatches()", () => {
  it("wraps matching text in mark tags", () => {
    const result = highlightMatches("Alice Cohen", "alice");
    expect(result).toBe("<mark>Alice</mark> Cohen");
  });

  it("is case-insensitive", () => {
    const result = highlightMatches("ALICE cohen", "alice");
    expect(result).toContain("<mark>ALICE</mark>");
  });

  it("highlights multiple tokens", () => {
    const result = highlightMatches("Alice Cohen", "alice cohen");
    expect(result).toContain("<mark>");
    expect(result.match(/<mark>/g)).toHaveLength(2);
  });

  it("returns original text when query is empty", () => {
    expect(highlightMatches("hello", "")).toBe("hello");
  });

  it("returns empty string for null text", () => {
    expect(highlightMatches(null, "query")).toBe("");
  });
});
