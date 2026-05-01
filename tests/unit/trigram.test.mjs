import { describe, it, expect } from "vitest";
import { ngrams, buildTrigramIndex } from "../../src/utils/trigram.js";

describe("ngrams", () => {
  it("default n=3 with padding", () => {
    const g = ngrams("ab");
    expect(g.has("  a")).toBe(true);
    expect(g.has(" ab")).toBe(true);
    expect(g.has("ab ")).toBe(true);
    expect(g.has("b  ")).toBe(true);
  });

  it("lower-cases", () => {
    expect(ngrams("AB").has(" ab")).toBe(true);
  });

  it("custom n=2", () => {
    const g = ngrams("abc", 2);
    expect(g.has("ab")).toBe(true);
    expect(g.has("bc")).toBe(true);
  });

  it("empty / non-string → empty Set", () => {
    expect(ngrams("").size).toBe(0);
    expect(ngrams(null).size).toBe(0);
  });

  it("rejects bad n", () => {
    expect(() => ngrams("abc", 0)).toThrow();
    expect(() => ngrams("abc", 1.5)).toThrow();
  });
});

describe("buildTrigramIndex", () => {
  const guests = [
    { name: "Yair Rajwan" },
    { name: "Yael Cohen" },
    { name: "Bob Smith" },
    { name: "Yair Cohen" },
  ];
  const idx = buildTrigramIndex(guests, (g) => g.name);

  it("returns ranked matches", () => {
    const results = idx.search("Yair Rajwan");
    expect(results[0].item.name).toBe("Yair Rajwan");
    expect(results[0].score).toBe(1);
  });

  it("limits results", () => {
    expect(idx.search("y", { limit: 2 }).length).toBeLessThanOrEqual(2);
  });

  it("respects minScore", () => {
    const r = idx.search("zzzzzz", { minScore: 0.1 });
    expect(r).toEqual([]);
  });

  it("partial query still finds best match", () => {
    const r = idx.search("Rajwan");
    expect(r[0].item.name).toBe("Yair Rajwan");
  });

  it("empty query → []", () => {
    expect(idx.search("")).toEqual([]);
  });
});
