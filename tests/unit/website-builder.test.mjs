/**
 * tests/unit/website-builder.test.mjs — S134 wedding website builder.
 */
import { describe, it, expect } from "vitest";
import {
  buildSiteSlug,
  buildWebsiteConfig,
  updateWebsiteConfig,
  WEBSITE_SECTIONS,
  validateSlug,
} from "../../src/services/web-presence.js";

describe("S134 — website-builder", () => {
  it("buildSiteSlug produces URL-safe slug", () => {
    expect(buildSiteSlug("Yair", "Shira", 2027)).toBe("yair-and-shira-2027");
    expect(buildSiteSlug("João", "María", 2026)).toMatch(/^[a-z0-9-]+$/);
  });

  it("buildWebsiteConfig succeeds with minimum valid input", () => {
    const r = buildWebsiteConfig({
      coupleA: "Yair",
      coupleB: "Shira",
      weddingDate: "2027-06-15",
    });
    expect(r.ok).toBe(true);
    expect(r.config.id).toBe("yair-and-shira-2027");
    expect(r.config.sections).toContain("welcome");
    expect(r.config.visibility).toBe("public");
  });

  it("buildWebsiteConfig rejects missing required fields", () => {
    const r = buildWebsiteConfig({ coupleB: "B", weddingDate: "2027-06-15" });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("missing_couple_a");
  });

  it("password visibility requires password field", () => {
    const r = buildWebsiteConfig({
      coupleA: "A",
      coupleB: "B",
      weddingDate: "2027-06-15",
      visibility: "password",
    });
    expect(r.errors).toContain("password_required_for_password_visibility");
  });

  it("rejects unknown section names", () => {
    const r = buildWebsiteConfig({
      coupleA: "A",
      coupleB: "B",
      weddingDate: "2027-06-15",
      sections: ["welcome", "mystery-section"],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.startsWith("unknown_sections:"))).toBe(true);
  });

  it("updateWebsiteConfig is immutable to core fields", () => {
    const r = buildWebsiteConfig({
      coupleA: "Yair",
      coupleB: "Shira",
      weddingDate: "2027-06-15",
    });
    const updated = updateWebsiteConfig(r.config, {
      id: "should-not-change",
      visibility: "private",
    });
    expect(updated.id).toBe(r.config.id);
    expect(updated.visibility).toBe("private");
  });

  it("WEBSITE_SECTIONS contains 7 entries", () => {
    expect(WEBSITE_SECTIONS).toHaveLength(7);
    expect(WEBSITE_SECTIONS).toContain("rsvp");
  });

  it("validateSlug checks format", () => {
    expect(validateSlug("yair-and-shira-2027")).toBe(true);
    expect(validateSlug("BAD slug!")).toBe(false);
    expect(validateSlug("x")).toBe(false);
  });
});
