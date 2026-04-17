/**
 * tests/unit/ab-test.test.mjs — Sprint 135
 */

import { describe, it, expect } from "vitest";
import { assignVariant, isInVariant, isFeatureEnabled } from "../../src/utils/ab-test.js";

const VARIANTS = [
  { name: "control",   weight: 50 },
  { name: "treatment", weight: 50 },
];

describe("assignVariant", () => {
  it("returns one of the variant names", () => {
    const v = assignVariant("user1", "exp1", VARIANTS);
    expect(["control", "treatment"]).toContain(v);
  });

  it("is deterministic for same inputs", () => {
    expect(assignVariant("user1", "exp1", VARIANTS)).toBe(
      assignVariant("user1", "exp1", VARIANTS),
    );
  });

  it("different subjects can get different variants", () => {
    const results = new Set(
      Array.from({ length: 20 }, (_, i) => assignVariant(`user${i}`, "exp1", VARIANTS)),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it("throws on empty variants", () => {
    expect(() => assignVariant("u", "e", [])).toThrow();
  });

  it("respects weight distribution approximately", () => {
    const variants10 = [{ name: "a", weight: 10 }, { name: "b", weight: 90 }];
    const results = Array.from({ length: 100 }, (_, i) =>
      assignVariant(`u${i}`, "skewed", variants10),
    );
    const countA = results.filter((v) => v === "a").length;
    // With 100 samples, a should appear roughly 5-25 times
    expect(countA).toBeGreaterThan(0);
    expect(countA).toBeLessThan(40);
  });
});

describe("isInVariant", () => {
  it("returns true when subject is in variant", () => {
    const variant = assignVariant("u1", "exp", VARIANTS);
    expect(isInVariant("u1", "exp", variant, VARIANTS)).toBe(true);
  });

  it("returns false for wrong variant", () => {
    const actual = assignVariant("u1", "exp", VARIANTS);
    const other = actual === "control" ? "treatment" : "control";
    expect(isInVariant("u1", "exp", other, VARIANTS)).toBe(false);
  });
});

describe("isFeatureEnabled", () => {
  it("returns boolean", () => {
    expect(typeof isFeatureEnabled("u1", "feature")).toBe("boolean");
  });

  it("0% rollout always disabled", () => {
    for (let i = 0; i < 20; i++) {
      expect(isFeatureEnabled(`u${i}`, "off", 0)).toBe(false);
    }
  });

  it("100% rollout always enabled", () => {
    for (let i = 0; i < 20; i++) {
      expect(isFeatureEnabled(`u${i}`, "on", 100)).toBe(true);
    }
  });
});
