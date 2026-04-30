/**
 * tests/unit/photo-organize.test.mjs — S462: photo-organize coverage
 */
import { describe, it, expect } from "vitest";
import { sortByDate, groupByDay, filterByDateRange } from "../../src/utils/photo-organize.js";

const PHOTOS = [
  { id: "1", takenAt: "2026-07-01T10:00:00Z" },
  { id: "2", takenAt: "2026-07-03T08:00:00Z" },
  { id: "3", takenAt: "2026-07-01T18:00:00Z" },
  { id: "4", takenAt: "2026-07-02T12:00:00Z" },
  { id: "5", uploadedAt: "2026-06-30T00:00:00Z" }, // no takenAt — falls back
  { id: "6" }, // no dates — skipped
];

describe("photo-organize — sortByDate", () => {
  it("sorts ascending by default", () => {
    const out = sortByDate(PHOTOS);
    const ids = out.map((p) => p.id);
    expect(ids[0]).toBe("6"); // epoch 0 first
    expect(ids[ids.length - 1]).toBe("2"); // latest last
  });

  it("supports descending order", () => {
    const out = sortByDate(PHOTOS, "desc");
    expect(out[0].id).toBe("2");
  });

  it("returns [] for non-array input", () => {
    expect(sortByDate(null)).toEqual([]);
  });

  it("does not mutate input", () => {
    const input = [...PHOTOS];
    sortByDate(input);
    expect(input).toEqual(PHOTOS);
  });
});

describe("photo-organize — groupByDay", () => {
  it("groups photos by UTC day", () => {
    const groups = groupByDay(PHOTOS);
    const days = groups.map((g) => g.day);
    expect(days).toEqual(["2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03"]);
  });

  it("places the right photos in each day bucket", () => {
    const groups = groupByDay(PHOTOS);
    const day1 = groups.find((g) => g.day === "2026-07-01");
    expect(day1?.photos.map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("skips photos without any date", () => {
    const groups = groupByDay(PHOTOS);
    const all = groups.flatMap((g) => g.photos.map((p) => p.id));
    expect(all).not.toContain("6");
  });

  it("returns [] for non-array input", () => {
    expect(groupByDay(undefined)).toEqual([]);
  });
});

describe("photo-organize — filterByDateRange", () => {
  it("filters within an inclusive range", () => {
    const out = filterByDateRange(PHOTOS, "2026-07-01T00:00:00Z", "2026-07-02T23:59:59Z");
    expect(out.map((p) => p.id).sort()).toEqual(["1", "3", "4"]);
  });

  it("treats null start as open-ended on the low side", () => {
    const out = filterByDateRange(PHOTOS, null, "2026-07-01T00:00:00Z");
    // 5 (June 30) and 1 (July 1 10:00 — past 00:00 so excluded)
    expect(out.map((p) => p.id)).toEqual(["5"]);
  });

  it("treats null end as open-ended on the high side", () => {
    const out = filterByDateRange(PHOTOS, "2026-07-02T00:00:00Z", null);
    expect(out.map((p) => p.id).sort()).toEqual(["2", "4"]);
  });

  it("returns [] for invalid bounds", () => {
    expect(filterByDateRange(PHOTOS, "not-a-date", null)).toEqual([]);
    expect(filterByDateRange(null, null, null)).toEqual([]);
  });
});
