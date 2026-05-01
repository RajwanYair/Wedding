import { describe, it, expect } from "vitest";
import {
  mulberry32,
  shuffle,
  sample,
  shuffleInPlace,
} from "../../src/utils/shuffle.js";

describe("mulberry32", () => {
  it("produces values in [0,1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 50; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic by seed", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("shuffle", () => {
  it("does not mutate input", () => {
    const arr = [1, 2, 3, 4, 5];
    const out = shuffle(arr, mulberry32(1));
    expect(arr).toEqual([1, 2, 3, 4, 5]);
    expect(out).toHaveLength(5);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("deterministic with seeded RNG", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(shuffle(arr, mulberry32(42))).toEqual(
      shuffle(arr, mulberry32(42)),
    );
  });

  it("rejects non-array", () => {
    expect(() => shuffle(/** @type {any} */ (null))).toThrow(TypeError);
  });

  it("empty / single → unchanged", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([42])).toEqual([42]);
  });
});

describe("sample", () => {
  it("returns k unique elements", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const r = sample(arr, 3, mulberry32(11));
    expect(r).toHaveLength(3);
    expect(new Set(r).size).toBe(3);
    for (const v of r) expect(arr).toContain(v);
  });

  it("k>=length returns full shuffled", () => {
    expect(sample([1, 2, 3], 10, mulberry32(1)).sort()).toEqual([1, 2, 3]);
  });

  it("rejects bad k", () => {
    expect(() => sample([1], -1)).toThrow();
    expect(() => sample([1], 1.5)).toThrow();
  });
});

describe("shuffleInPlace", () => {
  it("mutates and returns same array", () => {
    const arr = [1, 2, 3, 4, 5];
    const out = shuffleInPlace(arr, mulberry32(2));
    expect(out).toBe(arr);
    expect(arr.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
