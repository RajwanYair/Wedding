/**
 * tests/unit/image-compress.test.mjs — S457: image-compress dimension math + format helper
 */
import { describe, it, expect } from "vitest";
import { calculateDimensions, formatBytes, compressImage } from "../../src/utils/image-compress.js";

describe("image-compress — calculateDimensions", () => {
  it("scales down to fit within max box", () => {
    expect(calculateDimensions(4000, 3000, 1600, 1600)).toEqual({ w: 1600, h: 1200 });
  });

  it("does not upscale smaller images", () => {
    expect(calculateDimensions(800, 600, 1600, 1600)).toEqual({ w: 800, h: 600 });
  });

  it("respects the smaller axis constraint", () => {
    expect(calculateDimensions(2000, 4000, 1000, 1000)).toEqual({ w: 500, h: 1000 });
  });

  it("returns zero for invalid input", () => {
    expect(calculateDimensions(0, 100, 1600, 1600)).toEqual({ w: 0, h: 0 });
    expect(calculateDimensions(100, 100, 0, 0)).toEqual({ w: 0, h: 0 });
  });

  it("rounds to integer pixels", () => {
    const { w, h } = calculateDimensions(333, 777, 100, 1000);
    expect(Number.isInteger(w)).toBe(true);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe("image-compress — formatBytes", () => {
  it("formats bytes < 1KB", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.50 MB");
  });

  it("guards against invalid input", () => {
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(NaN)).toBe("0 B");
  });
});

describe("image-compress — compressImage", () => {
  it("rejects non-Blob input", async () => {
    await expect(compressImage(/** @type {any} */ ("not a blob"))).rejects.toThrow(TypeError);
  });
});
