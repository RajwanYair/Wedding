import { describe, it, expect } from "vitest";
import {
  formatInZone,
  offsetMinutes,
  formatOffset,
  diffHours,
} from "../../src/utils/timezone-convert.js";

describe("timezone-convert", () => {
  it("formatInZone returns YYYY-MM-DD HH:mm in target zone", () => {
    // 2026-09-12T17:00:00Z → 20:00 in Asia/Jerusalem (IDT, UTC+3)
    expect(formatInZone("2026-09-12T17:00:00Z", "Asia/Jerusalem")).toBe(
      "2026-09-12 20:00",
    );
  });

  it("formatInZone in UTC", () => {
    expect(formatInZone("2026-09-12T17:00:00Z", "UTC")).toBe("2026-09-12 17:00");
  });

  it("formatInZone differs across zones", () => {
    const a = formatInZone("2026-09-12T17:00:00Z", "America/New_York");
    expect(a).toBe("2026-09-12 13:00");
  });

  it("formatInZone throws on invalid ISO", () => {
    expect(() => formatInZone("garbage", "UTC")).toThrow(RangeError);
  });

  it("formatInZone throws on empty timezone", () => {
    expect(() => formatInZone("2026-09-12T00:00:00Z", "")).toThrow(TypeError);
  });

  it("offsetMinutes IDT in Asia/Jerusalem (summer)", () => {
    expect(offsetMinutes("2026-07-01T12:00:00Z", "Asia/Jerusalem")).toBe(180);
  });

  it("offsetMinutes IST in Asia/Jerusalem (winter)", () => {
    expect(offsetMinutes("2026-01-15T12:00:00Z", "Asia/Jerusalem")).toBe(120);
  });

  it("offsetMinutes UTC is 0", () => {
    expect(offsetMinutes("2026-09-12T00:00:00Z", "UTC")).toBe(0);
  });

  it("formatOffset positive", () => {
    expect(formatOffset(180)).toBe("+03:00");
  });

  it("formatOffset negative", () => {
    expect(formatOffset(-300)).toBe("-05:00");
  });

  it("formatOffset zero", () => {
    expect(formatOffset(0)).toBe("+00:00");
  });

  it("formatOffset NaN returns empty", () => {
    expect(formatOffset(NaN)).toBe("");
  });

  it("diffHours computes east-positive delta", () => {
    const d = diffHours(
      "2026-07-01T12:00:00Z",
      "America/New_York",
      "Asia/Jerusalem",
    );
    expect(d).toBe(7);
  });
});
