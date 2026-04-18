/**
 * tests/unit/defaults.test.mjs — Sprint 157
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/state.js", () => ({
  load: vi.fn((key, def) => def),
}));

import { defaultWeddingInfo, defaultTimeline, buildStoreDefs } from "../../src/core/defaults.js";

describe("defaultWeddingInfo", () => {
  it("is an object with string values", () => {
    expect(typeof defaultWeddingInfo).toBe("object");
    for (const val of Object.values(defaultWeddingInfo)) {
      expect(typeof val).toBe("string");
    }
  });

  it("has required fields", () => {
    expect("groom" in defaultWeddingInfo).toBe(true);
    expect("bride" in defaultWeddingInfo).toBe(true);
    expect("date" in defaultWeddingInfo).toBe(true);
    expect("venue" in defaultWeddingInfo).toBe(true);
    expect("registryLinks" in defaultWeddingInfo).toBe(true);
  });

  it("has default time of 18:00", () => {
    expect(defaultWeddingInfo.time).toBe("18:00");
  });

  it("starts with empty strings for names", () => {
    expect(defaultWeddingInfo.groom).toBe("");
    expect(defaultWeddingInfo.bride).toBe("");
  });

  it("defaults registryLinks to an empty JSON array string", () => {
    expect(defaultWeddingInfo.registryLinks).toBe("[]");
  });
});

describe("defaultTimeline", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(defaultTimeline)).toBe(true);
    expect(defaultTimeline.length).toBeGreaterThan(0);
  });

  it("each entry has id, time, and title", () => {
    for (const item of defaultTimeline) {
      expect(typeof item.id).toBe("string");
      expect(typeof item.time).toBe("string");
      expect(typeof item.title).toBe("string");
    }
  });

  it("has a chuppah entry", () => {
    const titles = defaultTimeline.map((t) => t.title);
    expect(titles.some((t) => t.includes("חופה") || t.toLowerCase().includes("chuppah"))).toBe(true);
  });
});

describe("buildStoreDefs", () => {
  it("returns an object", () => {
    const defs = buildStoreDefs();
    expect(typeof defs).toBe("object");
  });

  it("includes guests key with value array", () => {
    const defs = buildStoreDefs();
    expect(defs.guests).toBeDefined();
    expect(Array.isArray(defs.guests.value)).toBe(true);
  });

  it("includes campaigns key with value array", () => {
    const defs = buildStoreDefs();
    expect(defs.campaigns).toBeDefined();
    expect(Array.isArray(defs.campaigns.value)).toBe(true);
  });

  it("includes tables key with value array", () => {
    const defs = buildStoreDefs();
    expect(Array.isArray(defs.tables.value)).toBe(true);
  });

  it("includes vendors, expenses, weddingInfo", () => {
    const defs = buildStoreDefs();
    expect(defs.vendors).toBeDefined();
    expect(defs.expenses).toBeDefined();
    expect(defs.weddingInfo).toBeDefined();
  });

  it("weddingInfo merges defaultWeddingInfo", () => {
    const defs = buildStoreDefs();
    expect(defs.weddingInfo.value).toMatchObject({ time: "18:00" });
  });

  it("timeline defaults when no saved timeline", () => {
    const defs = buildStoreDefs();
    expect(Array.isArray(defs.timeline.value)).toBe(true);
    expect(defs.timeline.value.length).toBeGreaterThan(0);
  });

  it("all values have storageKey", () => {
    const defs = buildStoreDefs();
    for (const [, def] of Object.entries(defs)) {
      expect(typeof def.storageKey).toBe("string");
    }
  });
});
