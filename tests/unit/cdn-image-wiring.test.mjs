/**
 * tests/unit/cdn-image-wiring.test.mjs — Sprint 151 CDN image integration
 * Verifies buildCdnImageUrl + buildSrcset + defaultSizes work correctly.
 */

import { describe, it, expect } from "vitest";
import { buildCdnImageUrl, buildSrcset, defaultSizes } from "../../src/utils/cdn-image.js";

describe("CDN Image Wiring (Sprint 151)", () => {
  const CDN = "https://cdn.example.com";
  const SRC = "/uploads/photo.jpg";

  describe("buildCdnImageUrl", () => {
    it("returns source unchanged when no cdnHost", () => {
      expect(buildCdnImageUrl(SRC, { width: 400 })).toBe(SRC);
      expect(buildCdnImageUrl(SRC, { width: 400 }, "")).toBe(SRC);
    });

    it("builds CDN URL with width + format", () => {
      const url = buildCdnImageUrl(SRC, { width: 400, format: "auto", quality: 80 }, CDN);
      expect(url).toBe(`${CDN}/cdn-cgi/image/w=400,f=auto,q=80/uploads/photo.jpg`);
    });

    it("builds CDN URL with width + height + fit", () => {
      const url = buildCdnImageUrl(SRC, { width: 1200, height: 800, fit: "cover" }, CDN);
      expect(url).toContain("w=1200");
      expect(url).toContain("h=800");
      expect(url).toContain("fit=cover");
    });

    it("returns empty for empty source", () => {
      expect(buildCdnImageUrl("", {})).toBe("");
    });

    it("ignores invalid fit values", () => {
      const url = buildCdnImageUrl(SRC, { fit: "evil" }, CDN);
      expect(url).not.toContain("fit=");
    });
  });

  describe("buildSrcset", () => {
    it("returns srcset with original URLs when no cdnHost", () => {
      const srcset = buildSrcset(SRC, [320, 480], {}, "");
      expect(srcset).toContain(SRC);
      expect(srcset).toContain("320w");
    });

    it("builds srcset with multiple widths", () => {
      const srcset = buildSrcset(SRC, [320, 480, 640], { format: "auto" }, CDN);
      expect(srcset).toContain("320w");
      expect(srcset).toContain("480w");
      expect(srcset).toContain("640w");
    });

    it("returns empty for empty widths array", () => {
      expect(buildSrcset(SRC, [], {}, CDN)).toBe("");
    });
  });

  describe("defaultSizes", () => {
    it("returns default responsive sizes", () => {
      const sizes = defaultSizes();
      expect(sizes).toContain("100vw");
      expect(sizes).toContain("50vw");
      expect(sizes).toContain("33vw");
    });

    it("accepts custom breakpoints", () => {
      const sizes = defaultSizes({ mobile: "(max-width: 320px) 100vw" });
      expect(sizes).toContain("320px");
    });
  });
});
