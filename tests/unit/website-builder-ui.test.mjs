/**
 * tests/unit/website-builder-ui.test.mjs — Sprint 139 website builder section UI
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildWebsiteConfig,
  buildSiteSlug,
  WEBSITE_SECTIONS,
  validateSlug,
} from "../../src/services/web-presence.js";

describe("WebsiteBuilderUI (Sprint 139)", () => {
  describe("buildSiteSlug", () => {
    it("builds slug from couple names and year", () => {
      const slug = buildSiteSlug("Yair", "Dana", 2026);
      expect(slug).toBe("yair-and-dana-2026");
    });

    it("handles Hebrew names", () => {
      const slug = buildSiteSlug("יאיר", "דנה", 2026);
      expect(slug).toMatch(/and.*2026/);
    });

    it("handles empty inputs gracefully", () => {
      const slug = buildSiteSlug("", "", 2026);
      expect(slug).toBe("name-and-name-2026");
    });
  });

  describe("buildWebsiteConfig", () => {
    it("returns ok for valid inputs", () => {
      const result = buildWebsiteConfig({
        coupleA: "Yair",
        coupleB: "Dana",
        weddingDate: "2026-09-15",
      });
      expect(result.ok).toBe(true);
      expect(result.config.id).toContain("yair");
      expect(result.config.visibility).toBe("public");
    });

    it("requires couple names", () => {
      const result = buildWebsiteConfig({ weddingDate: "2026-09-15" });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("missing_couple_a");
    });

    it("validates date format", () => {
      const result = buildWebsiteConfig({
        coupleA: "A",
        coupleB: "B",
        weddingDate: "not-a-date",
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("invalid_wedding_date");
    });

    it("requires password when visibility is password", () => {
      const result = buildWebsiteConfig({
        coupleA: "A",
        coupleB: "B",
        weddingDate: "2026-09-15",
        visibility: "password",
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("password_required_for_password_visibility");
    });

    it("accepts password-protected config", () => {
      const result = buildWebsiteConfig({
        coupleA: "A",
        coupleB: "B",
        weddingDate: "2026-09-15",
        visibility: "password",
        password: "secret123",
      });
      expect(result.ok).toBe(true);
    });

    it("rejects unknown sections", () => {
      const result = buildWebsiteConfig({
        coupleA: "A",
        coupleB: "B",
        weddingDate: "2026-09-15",
        sections: ["welcome", "nonexistent"],
      });
      expect(result.ok).toBe(false);
      expect(result.errors[0]).toContain("unknown_sections");
    });
  });

  describe("WEBSITE_SECTIONS", () => {
    it("includes standard website sections", () => {
      expect(WEBSITE_SECTIONS).toContain("welcome");
      expect(WEBSITE_SECTIONS).toContain("rsvp");
      expect(WEBSITE_SECTIONS).toContain("gallery");
    });
  });

  describe("validateSlug", () => {
    it("accepts valid slugs", () => {
      expect(validateSlug("yair-and-dana-2026")).toBe(true);
    });

    it("rejects slugs with uppercase", () => {
      expect(validateSlug("Yair-and-Dana")).toBe(false);
    });

    it("rejects too-short slugs", () => {
      expect(validateSlug("ab")).toBe(false);
    });
  });
});
