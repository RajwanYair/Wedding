import { describe, it, expect } from "vitest";
import {
  makeCache,
  isStale,
  diff,
  describeDelta,
} from "../../src/utils/weather-cache.js";

describe("weather-cache", () => {
  it("makeCache fills fetchedAt by default", () => {
    const c = makeCache({ tempC: 22 }, "2026-09-12");
    expect(typeof c.fetchedAt).toBe("string");
    expect(c.forDate).toBe("2026-09-12");
    expect(c.snapshot.tempC).toBe(22);
  });

  it("makeCache copies snapshot to avoid mutation", () => {
    const snap = { tempC: 18 };
    const c = makeCache(snap, "2026-09-12");
    snap.tempC = 99;
    expect(c.snapshot.tempC).toBe(18);
  });

  it("makeCache throws on invalid snapshot", () => {
    expect(() => makeCache(null, "2026-09-12")).toThrow(TypeError);
    expect(() => makeCache({ tempC: "x" }, "2026-09-12")).toThrow(TypeError);
  });

  it("makeCache throws on invalid forDate", () => {
    expect(() => makeCache({ tempC: 1 }, "")).toThrow(TypeError);
  });

  it("isStale true for null/undefined cache", () => {
    expect(isStale(null)).toBe(true);
    expect(isStale(undefined)).toBe(true);
  });

  it("isStale true for malformed fetchedAt", () => {
    expect(isStale({ fetchedAt: "garbage" })).toBe(true);
  });

  it("isStale false within ttl", () => {
    const now = Date.parse("2026-09-12T12:00:00Z");
    const cache = { fetchedAt: "2026-09-12T10:00:00Z", forDate: "x", snapshot: { tempC: 1 } };
    expect(isStale(cache, 6 * 60 * 60 * 1000, now)).toBe(false);
  });

  it("isStale true past ttl", () => {
    const now = Date.parse("2026-09-13T00:00:00Z");
    const cache = { fetchedAt: "2026-09-12T10:00:00Z", forDate: "x", snapshot: { tempC: 1 } };
    expect(isStale(cache, 6 * 60 * 60 * 1000, now)).toBe(true);
  });

  it("isStale true for invalid ttl", () => {
    const cache = { fetchedAt: new Date().toISOString(), forDate: "x", snapshot: { tempC: 1 } };
    expect(isStale(cache, NaN)).toBe(true);
    expect(isStale(cache, -1)).toBe(true);
  });

  it("diff computes per-field deltas", () => {
    const d = diff(
      { tempC: 20, precipPct: 30, windKph: 15 },
      { tempC: 22, precipPct: 40, windKph: 10 },
    );
    expect(d).toEqual({ tempDelta: 2, precipDelta: 10, windDelta: -5 });
  });

  it("diff treats missing fields as 0", () => {
    expect(diff({ tempC: 20 }, { tempC: 21 })).toEqual({
      tempDelta: 1,
      precipDelta: 0,
      windDelta: 0,
    });
  });

  it("diff handles null inputs gracefully", () => {
    expect(diff(null, { tempC: 22 })).toEqual({
      tempDelta: 22,
      precipDelta: 0,
      windDelta: 0,
    });
  });

  it("describeDelta builds composite label", () => {
    expect(
      describeDelta({ tempDelta: 2, precipDelta: 5, windDelta: -3 }),
    ).toBe("+2.0°C, rain ↑5%, wind ↓3kph");
  });

  it("describeDelta omits zero deltas", () => {
    expect(describeDelta({ tempDelta: 0, precipDelta: 5, windDelta: 0 })).toBe("rain ↑5%");
  });

  it("describeDelta returns empty for all-zero", () => {
    expect(describeDelta({ tempDelta: 0, precipDelta: 0, windDelta: 0 })).toBe("");
  });
});
