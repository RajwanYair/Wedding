import { describe, it, expect } from "vitest";
import { timeAgo } from "../../src/utils/time-ago.js";

const NOW = new Date("2026-04-30T12:00:00Z").getTime();

describe("time-ago", () => {
  it("returns just-now phrase for delta < 5s (en)", () => {
    expect(timeAgo(NOW + 1000, { now: NOW, locale: "en" })).toBe("just now");
  });

  it("returns just-now phrase for delta < 5s (he)", () => {
    expect(timeAgo(NOW, { now: NOW, locale: "he" })).toBe("ממש עכשיו");
  });

  it("formats past minutes (en)", () => {
    expect(timeAgo(NOW - 60_000, { now: NOW })).toBe("1 minute ago");
  });

  it("pluralises past minutes (en)", () => {
    expect(timeAgo(NOW - 5 * 60_000, { now: NOW })).toBe("5 minutes ago");
  });

  it("formats future hours (en)", () => {
    expect(timeAgo(NOW + 2 * 3600_000, { now: NOW })).toBe("in 2 hours");
  });

  it("formats past days (he)", () => {
    expect(timeAgo(NOW - 3 * 24 * 3600_000, { now: NOW, locale: "he" })).toBe(
      "לפני 3 ימים",
    );
  });

  it("formats future weeks", () => {
    expect(timeAgo(NOW + 14 * 24 * 3600_000, { now: NOW })).toBe("in 2 weeks");
  });

  it("formats past months", () => {
    expect(timeAgo(NOW - 60 * 24 * 3600_000, { now: NOW })).toBe(
      "2 months ago",
    );
  });

  it("formats past years", () => {
    expect(timeAgo(NOW - 2 * 365 * 24 * 3600_000, { now: NOW })).toBe(
      "2 years ago",
    );
  });

  it("accepts Date input", () => {
    const d = new Date(NOW - 60_000);
    expect(timeAgo(d, { now: NOW })).toBe("1 minute ago");
  });

  it("accepts ISO string input", () => {
    const iso = new Date(NOW - 3600_000).toISOString();
    expect(timeAgo(iso, { now: NOW })).toBe("1 hour ago");
  });

  it("returns empty string for invalid input", () => {
    expect(timeAgo(/** @type {any} */ ({}), { now: NOW })).toBe("");
    expect(timeAgo("not a date", { now: NOW })).toBe("");
  });

  it("defaults to English locale", () => {
    expect(timeAgo(NOW - 3600_000, { now: NOW })).toContain("ago");
  });
});
