import { describe, it, expect } from "vitest";
import { formatFileSize, parseFileSize } from "../../src/utils/file-size.js";

describe("file-size", () => {
  it("formats bytes (no decimals)", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats binary KiB / MiB", () => {
    expect(formatFileSize(1024)).toBe("1.00 KiB");
    expect(formatFileSize(1024 * 1024)).toBe("1.00 MiB");
  });

  it("formats decimal mode", () => {
    expect(formatFileSize(1000, { base: 10 })).toBe("1.00 kB");
    expect(formatFileSize(1_500_000, { base: 10 })).toBe("1.50 MB");
  });

  it("custom decimals", () => {
    expect(formatFileSize(1500, { decimals: 1 })).toBe("1.5 KiB");
  });

  it("negative bytes preserved", () => {
    expect(formatFileSize(-1024)).toBe("-1.00 KiB");
  });

  it("non-finite → empty", () => {
    expect(formatFileSize(Number.NaN)).toBe("");
    expect(formatFileSize(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("Hebrew labels", () => {
    expect(formatFileSize(1024, { locale: "he" })).toContain("ק״ב");
  });

  it("parseFileSize bytes", () => {
    expect(parseFileSize("123")).toBe(123);
    expect(parseFileSize("123 B")).toBe(123);
  });

  it("parseFileSize KiB / MB", () => {
    expect(parseFileSize("1 KiB")).toBe(1024);
    expect(parseFileSize("1.5 MB")).toBe(1_500_000);
  });

  it("parseFileSize round-trips with formatFileSize", () => {
    const out = formatFileSize(2 * 1024 * 1024);
    expect(parseFileSize(out)).toBe(2 * 1024 * 1024);
  });

  it("parseFileSize rejects garbage", () => {
    expect(parseFileSize("not-a-size")).toBe(null);
    expect(parseFileSize(/** @type {any} */ (null))).toBe(null);
  });

  it("parseFileSize unknown unit → null", () => {
    expect(parseFileSize("1 lightyear")).toBe(null);
  });
});
