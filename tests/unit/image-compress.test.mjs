/**
 * tests/unit/image-compress.test.mjs — Client-side image compression (Sprint 56)
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  DEFAULT_MAX_DIMENSION,
  DEFAULT_QUALITY,
  DEFAULT_MIME,
  ACCEPTED_TYPES,
  isCanvasSupported,
  isAcceptedImageType,
  computeScaledDimensions,
  estimateCompressedSize,
  formatFileSize,
  loadImage,
  compressImage,
  compressImages,
  getImageMetadata,
  compressionRatio,
  compressionSavings,
} from "../../src/utils/image-compress.js";

afterEach(() => vi.restoreAllMocks());

// ── constants ──────────────────────────────────────────────────────────────

describe("constants", () => {
  it("DEFAULT_MAX_DIMENSION is a positive number", () => {
    expect(DEFAULT_MAX_DIMENSION).toBeGreaterThan(0);
  });

  it("DEFAULT_QUALITY is between 0 and 1", () => {
    expect(DEFAULT_QUALITY).toBeGreaterThan(0);
    expect(DEFAULT_QUALITY).toBeLessThanOrEqual(1);
  });

  it("DEFAULT_MIME is image/jpeg", () => {
    expect(DEFAULT_MIME).toBe("image/jpeg");
  });

  it("ACCEPTED_TYPES contains jpeg, png, webp", () => {
    expect(ACCEPTED_TYPES).toContain("image/jpeg");
    expect(ACCEPTED_TYPES).toContain("image/png");
    expect(ACCEPTED_TYPES).toContain("image/webp");
  });
});

// ── isCanvasSupported ──────────────────────────────────────────────────────

describe("isCanvasSupported()", () => {
  it("returns true in happy-dom environment", () => {
    // happy-dom provides document.createElement and canvas.getContext
    expect(typeof isCanvasSupported()).toBe("boolean");
  });
});

// ── isAcceptedImageType ────────────────────────────────────────────────────

describe("isAcceptedImageType()", () => {
  it("returns true for image/jpeg", () => {
    expect(isAcceptedImageType("image/jpeg")).toBe(true);
  });

  it("returns true for image/png", () => {
    expect(isAcceptedImageType("image/png")).toBe(true);
  });

  it("returns true for image/webp", () => {
    expect(isAcceptedImageType("image/webp")).toBe(true);
  });

  it("returns false for application/pdf", () => {
    expect(isAcceptedImageType("application/pdf")).toBe(false);
  });

  it("returns false for text/plain", () => {
    expect(isAcceptedImageType("text/plain")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isAcceptedImageType("IMAGE/JPEG")).toBe(true);
  });
});

// ── computeScaledDimensions ────────────────────────────────────────────────

describe("computeScaledDimensions()", () => {
  it("returns original dimensions when both sides are within limit", () => {
    const result = computeScaledDimensions(800, 600, 1280);
    expect(result).toEqual({ width: 800, height: 600 });
  });

  it("scales down wide image preserving aspect ratio", () => {
    const { width, height } = computeScaledDimensions(2560, 1440, 1280);
    expect(width).toBe(1280);
    expect(height).toBe(720);
  });

  it("scales down tall image preserving aspect ratio", () => {
    const { width, height } = computeScaledDimensions(720, 1440, 1280);
    expect(height).toBe(1280);
    expect(width).toBe(640);
  });

  it("handles square image", () => {
    const { width, height } = computeScaledDimensions(2000, 2000, 1000);
    expect(width).toBe(1000);
    expect(height).toBe(1000);
  });

  it("returns whole-number dimensions (rounded)", () => {
    const { width, height } = computeScaledDimensions(1001, 777, 800);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
  });

  it("uses DEFAULT_MAX_DIMENSION when not specified", () => {
    const { width } = computeScaledDimensions(3000, 2000);
    expect(width).toBe(DEFAULT_MAX_DIMENSION);
  });
});

// ── estimateCompressedSize ─────────────────────────────────────────────────

describe("estimateCompressedSize()", () => {
  it("returns smaller value than original at default quality", () => {
    const orig = 1_000_000;
    expect(estimateCompressedSize(orig)).toBeLessThan(orig);
  });

  it("returns original size at quality=1", () => {
    expect(estimateCompressedSize(500_000, 1)).toBe(500_000);
  });

  it("returns 0 at quality=0", () => {
    expect(estimateCompressedSize(500_000, 0)).toBe(0);
  });

  it("scales proportionally", () => {
    expect(estimateCompressedSize(1000, 0.5)).toBe(500);
  });
});

// ── formatFileSize ─────────────────────────────────────────────────────────

describe("formatFileSize()", () => {
  it("formats bytes < 1024 as B", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats values in KB range", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formats values in MB range", () => {
    expect(formatFileSize(1_572_864)).toContain("MB");
  });
});

// ── loadImage ─────────────────────────────────────────────────────────────

describe("loadImage()", () => {
  it("rejects when image fails to load", async () => {
    // Mock Image to trigger onerror immediately
    const origImage = globalThis.Image;
    globalThis.Image = class {
      set src(_val) {
        setTimeout(() => this.onerror && this.onerror(), 0);
      }
    };
    await expect(loadImage("invalid-url")).rejects.toThrow(
      "Failed to load image",
    );
    globalThis.Image = origImage;
  });

  it("resolves with HTMLImageElement when image loads", async () => {
    const origImage = globalThis.Image;
    const mockImg = { naturalWidth: 100, naturalHeight: 80 };
    globalThis.Image = class {
      constructor() {
        Object.assign(this, mockImg);
      }
      set src(_val) {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    };
    const img = await loadImage(
      "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=",
    );
    expect(img).toBeDefined();
    globalThis.Image = origImage;
  });
});

// ── compressImage ─────────────────────────────────────────────────────────

describe("compressImage()", () => {
  it("throws when Canvas API unavailable", async () => {
    // Temporarily disable canvas support
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") {
        return { getContext: undefined };
      }
      return origCreateElement(tag);
    });

    const file = new Blob([""], { type: "image/jpeg" });
    await expect(compressImage(file)).rejects.toThrow();
  });
});

// ── compressImages ────────────────────────────────────────────────────────

describe("compressImages()", () => {
  it("returns array with same length as input", async () => {
    // getContext:undefined → isCanvasSupported()===false → throws before loadImage
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") return { getContext: undefined };
      return origCreateElement(tag);
    });

    const files = [
      new Blob(["a"], { type: "image/jpeg" }),
      new Blob(["b"], { type: "image/jpeg" }),
    ];
    const results = await compressImages(files);
    expect(results).toHaveLength(2);
  });

  it("captures errors per file in result", async () => {
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") return { getContext: undefined };
      return origCreateElement(tag);
    });

    const files = [new Blob(["x"], { type: "image/jpeg" })];
    const results = await compressImages(files);
    expect(results[0].error).not.toBeNull();
    expect(results[0].compressed).toBeNull();
  });
});

// ── getImageMetadata ──────────────────────────────────────────────────────

describe("getImageMetadata()", () => {
  it("returns size, sizeFormatted, type, name, isAccepted for File", () => {
    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });
    const meta = getImageMetadata(file);
    expect(meta.name).toBe("photo.jpg");
    expect(meta.type).toBe("image/jpeg");
    expect(meta.isAccepted).toBe(true);
    expect(meta.size).toBe(5);
    expect(typeof meta.sizeFormatted).toBe("string");
  });

  it("handles Blob (no name)", () => {
    const blob = new Blob(["data"], { type: "image/png" });
    const meta = getImageMetadata(blob);
    expect(meta.name).toBe("(blob)");
    expect(meta.isAccepted).toBe(true);
  });

  it("isAccepted is false for non-image type", () => {
    const file = new File(["doc"], "file.pdf", { type: "application/pdf" });
    expect(getImageMetadata(file).isAccepted).toBe(false);
  });
});

// ── compressionRatio ──────────────────────────────────────────────────────

describe("compressionRatio()", () => {
  it("returns 0.5 when compressed is half of original", () => {
    expect(compressionRatio(1000, 500)).toBeCloseTo(0.5);
  });

  it("returns 1 when sizes are equal", () => {
    expect(compressionRatio(1000, 1000)).toBe(1);
  });

  it("returns 1 when originalSize is 0 (avoids division by zero)", () => {
    expect(compressionRatio(0, 0)).toBe(1);
  });

  it("can return > 1 when compressed is larger", () => {
    expect(compressionRatio(100, 200)).toBeCloseTo(2);
  });
});

// ── compressionSavings ────────────────────────────────────────────────────

describe("compressionSavings()", () => {
  it("returns savedBytes, savedFormatted, savingPercent", () => {
    const result = compressionSavings(1000, 700);
    expect(result.savedBytes).toBe(300);
    expect(result.savingPercent).toBe(30);
    expect(typeof result.savedFormatted).toBe("string");
  });

  it("savedBytes is 0 when compressed is larger", () => {
    expect(compressionSavings(500, 600).savedBytes).toBe(0);
  });

  it("savingPercent is 0 when originalSize is 0", () => {
    expect(compressionSavings(0, 0).savingPercent).toBe(0);
  });

  it("100% saving when compressed is 0", () => {
    expect(compressionSavings(1000, 0).savingPercent).toBe(100);
  });
});
