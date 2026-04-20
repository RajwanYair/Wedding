import { describe, it, expect } from "vitest";
import {
  WEBSITE_SECTIONS,
  createWebsiteSection,
  buildWebsiteConfig,
  buildRsvpFormConfig,
  buildVenueSection,
  buildGallerySection,
  buildRegistrySection,
  validateWebsiteConfig,
} from "../../src/utils/wedding-website.js";

// ── WEBSITE_SECTIONS ──────────────────────────────────────────────────────

describe("WEBSITE_SECTIONS", () => {
  it("is frozen", () => expect(Object.isFrozen(WEBSITE_SECTIONS)).toBe(true));
  it("has RSVP", () => expect(WEBSITE_SECTIONS.RSVP).toBe("rsvp"));
  it("has GALLERY", () => expect(WEBSITE_SECTIONS.GALLERY).toBe("gallery"));
  it("has VENUE", () => expect(WEBSITE_SECTIONS.VENUE).toBe("venue"));
});

// ── createWebsiteSection ──────────────────────────────────────────────────

describe("createWebsiteSection()", () => {
  it("returns null for invalid type", () => expect(createWebsiteSection("unknown")).toBeNull());
  it("returns null for missing type", () => expect(createWebsiteSection()).toBeNull());

  it("creates section with id and defaults", () => {
    const s = createWebsiteSection("hero");
    expect(s.id).toMatch(/^sec_hero_/);
    expect(s.visible).toBe(true);
    expect(s.order).toBe(0);
  });

  it("applies opts", () => {
    const s = createWebsiteSection("hero", {}, { visible: false, order: 3 });
    expect(s.visible).toBe(false);
    expect(s.order).toBe(3);
  });

  it("copies data", () => {
    const data = { title: "Our Story" };
    const s = createWebsiteSection("hero", data);
    data.title = "Changed";
    expect(s.data.title).toBe("Our Story");
  });
});

// ── buildWebsiteConfig ────────────────────────────────────────────────────

describe("buildWebsiteConfig()", () => {
  it("returns null for missing coupleNames", () => {
    expect(buildWebsiteConfig({ weddingDate: "2025-09-01" })).toBeNull();
  });
  it("returns null for missing weddingDate", () => {
    expect(buildWebsiteConfig({ coupleNames: "Alice & Bob" })).toBeNull();
  });

  it("creates config with sorted sections", () => {
    const s1 = createWebsiteSection("rsvp", {}, { order: 2 });
    const s2 = createWebsiteSection("hero", {}, { order: 1 });
    const cfg = buildWebsiteConfig({ coupleNames: "Alice & Bob", weddingDate: "2025-09-01", sections: [s1, s2] });
    expect(cfg.sections[0].type).toBe("hero");
    expect(cfg.sections[1].type).toBe("rsvp");
  });

  it("starts unpublished", () => {
    const cfg = buildWebsiteConfig({ coupleNames: "A & B", weddingDate: "2025-09-01" });
    expect(cfg.published).toBe(false);
  });
});

// ── buildRsvpFormConfig ───────────────────────────────────────────────────

describe("buildRsvpFormConfig()", () => {
  it("builds defaults", () => {
    const cfg = buildRsvpFormConfig();
    expect(cfg.maxPlusOnes).toBe(0);
    expect(cfg.requirePhone).toBe(true);
    expect(cfg.mealOptions).toEqual([]);
  });

  it("sets deadline as ISO string", () => {
    const cfg = buildRsvpFormConfig({ deadline: "2025-08-01" });
    expect(cfg.deadline).toMatch(/^2025-08-01/);
  });

  it("makes meal choice required when options provided", () => {
    const cfg = buildRsvpFormConfig({ mealOptions: ["meat", "veg"] });
    expect(cfg.fields.mealChoice.required).toBe(true);
  });

  it("makes meal choice not required when no options", () => {
    const cfg = buildRsvpFormConfig();
    expect(cfg.fields.mealChoice.required).toBe(false);
  });

  it("zeroes negative maxPlusOnes", () => {
    const cfg = buildRsvpFormConfig({ maxPlusOnes: -2 });
    expect(cfg.maxPlusOnes).toBe(0);
  });
});

// ── buildVenueSection ─────────────────────────────────────────────────────

describe("buildVenueSection()", () => {
  it("returns null for missing required fields", () => {
    expect(buildVenueSection({ name: "Hall", address: "123 St" })).toBeNull();
  });

  it("builds venue section", () => {
    const s = buildVenueSection({ name: "Grand Hall", address: "123 Main St", city: "Tel Aviv" });
    expect(s.type).toBe("venue");
    expect(s.data.name).toBe("Grand Hall");
    expect(s.data.city).toBe("Tel Aviv");
  });
});

// ── buildGallerySection ───────────────────────────────────────────────────

describe("buildGallerySection()", () => {
  it("creates gallery section", () => {
    const s = buildGallerySection(["a.jpg", "b.jpg"]);
    expect(s.type).toBe("gallery");
    expect(s.data.photos).toHaveLength(2);
  });

  it("uses grid layout by default", () => {
    const s = buildGallerySection();
    expect(s.data.layout).toBe("grid");
  });

  it("handles non-array gracefully", () => {
    const s = buildGallerySection(null);
    expect(s.data.photos).toEqual([]);
  });
});

// ── buildRegistrySection ──────────────────────────────────────────────────

describe("buildRegistrySection()", () => {
  it("creates registry section", () => {
    const s = buildRegistrySection({
      registries: [{ name: "Amazon", url: "https://amazon.com/registry/123" }],
    });
    expect(s.type).toBe("registry");
    expect(s.data.registries).toHaveLength(1);
  });

  it("handles no registries", () => {
    const s = buildRegistrySection();
    expect(s.data.registries).toEqual([]);
  });
});

// ── validateWebsiteConfig ─────────────────────────────────────────────────

describe("validateWebsiteConfig()", () => {
  it("returns invalid for null config", () => {
    const result = validateWebsiteConfig(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("flags missing coupleNames", () => {
    const result = validateWebsiteConfig({ weddingDate: "2025-09-01", sections: [] });
    expect(result.errors).toContain("coupleNames is required");
  });

  it("returns valid true for complete config with RSVP section", () => {
    const rsvp = createWebsiteSection("rsvp");
    const cfg = buildWebsiteConfig({ coupleNames: "A & B", weddingDate: "2025-09-01", sections: [rsvp] });
    const result = validateWebsiteConfig(cfg);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("adds recommendation when RSVP section is absent", () => {
    const cfg = buildWebsiteConfig({ coupleNames: "A & B", weddingDate: "2025-09-01", sections: [] });
    const result = validateWebsiteConfig(cfg);
    expect(result.errors).toContain("RSVP section is recommended");
  });
});
