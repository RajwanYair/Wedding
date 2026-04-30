import { describe, it, expect } from "vitest";
import {
  parseDuration,
  formatDuration,
} from "../../src/utils/ms-duration.js";

describe("ms-duration", () => {
  it("parses single units", () => {
    expect(parseDuration("1500ms")).toBe(1500);
    expect(parseDuration("2s")).toBe(2000);
    expect(parseDuration("1m")).toBe(60_000);
    expect(parseDuration("1h")).toBe(3_600_000);
    expect(parseDuration("1d")).toBe(86_400_000);
    expect(parseDuration("1w")).toBe(604_800_000);
  });

  it("parses long-form aliases", () => {
    expect(parseDuration("3 minutes")).toBe(180_000);
    expect(parseDuration("2 hours")).toBe(7_200_000);
  });

  it("parses combined tokens", () => {
    expect(parseDuration("1d 12h")).toBe(86_400_000 + 12 * 3_600_000);
    expect(parseDuration("1m30s")).toBe(60_000 + 30_000);
  });

  it("parses fractional values", () => {
    expect(parseDuration("0.5h")).toBe(1_800_000);
  });

  it("parses negative values", () => {
    expect(parseDuration("-2s")).toBe(-2000);
  });

  it("returns null for invalid input", () => {
    expect(parseDuration("not a duration")).toBe(null);
    expect(parseDuration("")).toBe(null);
    expect(parseDuration(/** @type {any} */ (null))).toBe(null);
  });

  it("returns null for unknown unit", () => {
    expect(parseDuration("3xyz")).toBe(null);
  });

  it("formats hours+minutes (long)", () => {
    expect(formatDuration(3_600_000 + 30 * 60_000)).toBe("1 hours 30 minutes");
  });

  it("formats compact", () => {
    expect(formatDuration(3_600_000 + 30 * 60_000, { compact: true })).toBe(
      "1h 30m",
    );
  });

  it("formats sub-second as ms", () => {
    expect(formatDuration(250)).toBe("250 ms");
    expect(formatDuration(250, { compact: true })).toBe("250ms");
  });

  it("formats negative durations", () => {
    expect(formatDuration(-3_600_000, { compact: true })).toBe("-1h");
  });

  it("returns empty for non-finite", () => {
    expect(formatDuration(Number.NaN)).toBe("");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("Hebrew locale uses Hebrew labels", () => {
    expect(formatDuration(60_000, { locale: "he" })).toContain("דקות");
  });
});
