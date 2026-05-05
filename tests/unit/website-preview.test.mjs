// tests/unit/website-preview.test.mjs — S622 website preview helpers
import { describe, it, expect } from "vitest";
import {
  PAGE_SECTIONS,
  DEFAULT_SECTIONS,
  buildPreview,
  countdownDays,
  validateWebsiteConfig,
  buildPublicUrl,
} from "../../src/utils/website-preview.js";

describe("website-preview", () => {
  describe("PAGE_SECTIONS", () => {
    it("lists 8 sections", () => {
      expect(PAGE_SECTIONS).toHaveLength(8);
      expect(PAGE_SECTIONS).toContain("hero");
      expect(PAGE_SECTIONS).toContain("rsvp");
    });
  });

  describe("DEFAULT_SECTIONS", () => {
    it("has 4 defaults", () => {
      expect(DEFAULT_SECTIONS).toHaveLength(4);
    });
  });

  describe("buildPreview", () => {
    it("builds from valid config", () => {
      const p = buildPreview({
        coupleName: "Yair & Dana",
        rsvpUrl: "https://example.com/rsvp",
        coverImageUrl: "https://example.com/img.jpg",
        theme: "rosegold",
        enabledSections: ["hero", "rsvp", "footer"],
      });
      expect(p.title).toBe("Yair & Dana");
      expect(p.hasRsvp).toBe(true);
      expect(p.hasCover).toBe(true);
      expect(p.theme).toBe("rosegold");
      expect(p.sections).toEqual(["hero", "rsvp", "footer"]);
    });
    it("uses defaults for null config", () => {
      const p = buildPreview(null);
      expect(p.title).toBe("");
      expect(p.sections).toEqual([...DEFAULT_SECTIONS]);
      expect(p.theme).toBe("default");
    });
    it("filters invalid sections", () => {
      const p = buildPreview({
        coupleName: "Test",
        enabledSections: ["hero", "bogus", "footer"],
      });
      expect(p.sections).toEqual(["hero", "footer"]);
    });
    it("detects password protection", () => {
      const p = buildPreview({ coupleName: "Test", password: "1234" });
      expect(p.hasPassword).toBe(true);
    });
  });

  describe("countdownDays", () => {
    it("counts days to future date", () => {
      const r = countdownDays("2025-08-01", "2025-07-01");
      expect(r.days).toBe(31);
      expect(r.isPast).toBe(false);
    });
    it("detects past date", () => {
      const r = countdownDays("2025-01-01", "2025-07-01");
      expect(r.isPast).toBe(true);
    });
    it("handles invalid date", () => {
      expect(countdownDays("not-a-date").isPast).toBe(true);
    });
    it("handles empty", () => {
      expect(countdownDays("").isPast).toBe(true);
    });
  });

  describe("validateWebsiteConfig", () => {
    it("passes valid config", () => {
      expect(validateWebsiteConfig({ coupleName: "A & B" })).toEqual([]);
    });
    it("catches empty coupleName", () => {
      expect(validateWebsiteConfig({ coupleName: "" })).toContain("coupleName is required");
    });
    it("catches short password", () => {
      expect(validateWebsiteConfig({ coupleName: "A & B", password: "ab" })).toContain(
        "password must be at least 4 characters",
      );
    });
    it("catches unknown section", () => {
      const errs = validateWebsiteConfig({
        coupleName: "A & B",
        enabledSections: ["hero", "invalid"],
      });
      expect(errs.some((e) => e.includes("unknown section"))).toBe(true);
    });
    it("catches null config", () => {
      expect(validateWebsiteConfig(null)).toContain("config is required");
    });
  });

  describe("buildPublicUrl", () => {
    it("uses custom domain when provided", () => {
      expect(buildPublicUrl("https://base.com", "wedding.example.com")).toBe(
        "https://wedding.example.com",
      );
    });
    it("preserves https in custom domain", () => {
      expect(buildPublicUrl("", "https://my-wedding.com/")).toBe("https://my-wedding.com");
    });
    it("falls back to base URL", () => {
      expect(buildPublicUrl("https://base.com/site/")).toBe("https://base.com/site");
    });
    it("handles empty base", () => {
      expect(buildPublicUrl("")).toBe("");
    });
  });
});
