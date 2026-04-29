/**
 * tests/unit/web-presence.test.mjs — S361: services/web-presence.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/domain-enums.js", () => ({
  GUEST_STATUS_VALUES: new Set(["pending", "confirmed", "declined", "maybe"]),
  GUEST_SIDE_VALUES: new Set(["groom", "bride", "mutual"]),
  GUEST_GROUP_VALUES: new Set(["family", "friends", "work", "neighbors", "other"]),
  MEAL_VALUES: new Set(["regular", "vegetarian", "vegan", "kosher", "glutenFree", "none"]),
  TABLE_SHAPE_VALUES: new Set(["round", "rectangle", "square", "oval"]),
  VENDOR_CATEGORY_VALUES: new Set(["venue", "catering", "photography", "flowers", "music", "other"]),
  EXPENSE_CATEGORY_VALUES: new Set(["catering", "decor", "attire", "photography", "music", "venue", "transport", "other"]),
}));

import {
  getDnsInstructions,
  formatDnsRecord,
  getProviderKeys,
  validateGuest,
  validateTable,
  validateVendor,
  validateExpense,
  buildSiteSlug,
  buildWebsiteConfig,
  updateWebsiteConfig,
  validateSlug,
  DNS_PROVIDERS,
  WEBSITE_SECTIONS,
} from "../../src/services/web-presence.js";

// ── getDnsInstructions ─────────────────────────────────────────────────────

describe("getDnsInstructions", () => {
  it("returns instructions for github-pages", () => {
    const inst = getDnsInstructions("github-pages");
    expect(inst).toBeDefined();
    expect(inst.provider).toBe("github-pages");
    expect(inst.records.length).toBeGreaterThan(0);
  });

  it("returns undefined for unknown provider", () => {
    expect(getDnsInstructions("unknown-provider")).toBeUndefined();
  });
});

// ── formatDnsRecord ────────────────────────────────────────────────────────

describe("formatDnsRecord", () => {
  it("formats a record with all fields", () => {
    const line = formatDnsRecord({ type: "A", name: "@", value: "1.2.3.4", ttl: "3600" });
    expect(line).toContain("A");
    expect(line).toContain("@");
    expect(line).toContain("1.2.3.4");
    expect(line).toContain("3600");
  });

  it("defaults ttl to 3600 when missing", () => {
    const line = formatDnsRecord({ type: "CNAME", name: "www", value: "example.com" });
    expect(line).toContain("3600");
  });
});

// ── getProviderKeys ────────────────────────────────────────────────────────

describe("getProviderKeys", () => {
  it("returns all provider keys", () => {
    const keys = getProviderKeys();
    expect(keys).toContain("github-pages");
    expect(keys).toContain("vercel");
    expect(keys).toContain("netlify");
  });
});

// ── DNS_PROVIDERS ──────────────────────────────────────────────────────────

describe("DNS_PROVIDERS", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(DNS_PROVIDERS)).toBe(true);
  });

  it("each provider has records array", () => {
    for (const p of DNS_PROVIDERS) {
      expect(Array.isArray(p.records)).toBe(true);
    }
  });
});

// ── validateGuest ──────────────────────────────────────────────────────────

describe("validateGuest", () => {
  it("validates a minimal valid guest", () => {
    const r = validateGuest({ firstName: "ישראל", lastName: "ישראלי" });
    expect(r.valid).toBe(true);
    expect(Object.keys(r.errors)).toHaveLength(0);
  });

  it("errors on missing firstName", () => {
    const r = validateGuest({ lastName: "ישראלי" });
    expect(r.valid).toBe(false);
    expect(r.errors.firstName).toBeDefined();
  });

  it("errors on missing lastName", () => {
    const r = validateGuest({ firstName: "ישראל" });
    expect(r.valid).toBe(false);
    expect(r.errors.lastName).toBeDefined();
  });

  it("errors on invalid status", () => {
    const r = validateGuest({ firstName: "a", lastName: "b", status: "unknown" });
    expect(r.errors.status).toBeDefined();
  });

  it("accepts valid status", () => {
    const r = validateGuest({ firstName: "a", lastName: "b", status: "confirmed" });
    expect(r.valid).toBe(true);
  });

  it("errors on non-object", () => {
    const r = validateGuest(null);
    expect(r.valid).toBe(false);
  });

  it("errors on invalid email", () => {
    const r = validateGuest({ firstName: "a", lastName: "b", email: "not-an-email" });
    expect(r.errors.email).toBeDefined();
  });

  it("accepts valid email", () => {
    const r = validateGuest({ firstName: "a", lastName: "b", email: "a@b.com" });
    expect(r.valid).toBe(true);
  });
});

// ── validateTable ──────────────────────────────────────────────────────────

describe("validateTable", () => {
  it("validates valid table", () => {
    const r = validateTable({ name: "Table 1", capacity: 8 });
    expect(r.valid).toBe(true);
  });

  it("errors on missing name", () => {
    const r = validateTable({ capacity: 8 });
    expect(r.errors.name).toBeDefined();
  });

  it("errors on zero capacity", () => {
    const r = validateTable({ name: "T", capacity: 0 });
    expect(r.errors.capacity).toBeDefined();
  });

  it("errors on invalid shape", () => {
    const r = validateTable({ name: "T", capacity: 4, shape: "triangle" });
    expect(r.errors.shape).toBeDefined();
  });

  it("accepts valid shape", () => {
    const r = validateTable({ name: "T", capacity: 4, shape: "round" });
    expect(r.valid).toBe(true);
  });
});

// ── validateVendor ─────────────────────────────────────────────────────────

describe("validateVendor", () => {
  it("validates a valid vendor", () => {
    const r = validateVendor({ name: "Flowers Co" });
    expect(r.valid).toBe(true);
  });

  it("errors on missing name", () => {
    const r = validateVendor({});
    expect(r.errors.name).toBeDefined();
  });

  it("errors on negative price", () => {
    const r = validateVendor({ name: "V", price: -100 });
    expect(r.errors.price).toBeDefined();
  });
});

// ── validateExpense ────────────────────────────────────────────────────────

describe("validateExpense", () => {
  it("validates a valid expense", () => {
    const r = validateExpense({ description: "Flowers", amount: 500 });
    expect(r.valid).toBe(true);
  });

  it("errors on missing description", () => {
    const r = validateExpense({ amount: 100 });
    expect(r.errors.description).toBeDefined();
  });

  it("errors on negative amount", () => {
    const r = validateExpense({ description: "Flowers", amount: -1 });
    expect(r.errors.amount).toBeDefined();
  });
});

// ── buildSiteSlug ──────────────────────────────────────────────────────────

describe("buildSiteSlug", () => {
  it("builds slug from two names and year", () => {
    const slug = buildSiteSlug("יוסף", "מרים", 2025);
    expect(typeof slug).toBe("string");
    expect(slug).toContain("2025");
    expect(slug).toContain("-and-");
  });

  it("lowercases ASCII names", () => {
    const slug = buildSiteSlug("John", "Jane", 2025);
    expect(slug).toBe("john-and-jane-2025");
  });

  it("handles empty names with defaults", () => {
    const slug = buildSiteSlug("", "", 2025);
    expect(slug).toContain("name");
  });
});

// ── buildWebsiteConfig ─────────────────────────────────────────────────────

describe("buildWebsiteConfig", () => {
  it("builds valid config", () => {
    const result = buildWebsiteConfig({
      coupleA: "John",
      coupleB: "Jane",
      weddingDate: "2025-08-15",
    });
    expect(result.ok).toBe(true);
    expect(result.config.coupleA).toBe("John");
    expect(result.config.id).toContain("2025");
  });

  it("fails on missing coupleA", () => {
    const result = buildWebsiteConfig({ coupleB: "Jane", weddingDate: "2025-08-15" });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("missing_couple_a");
  });

  it("fails on invalid date", () => {
    const result = buildWebsiteConfig({ coupleA: "A", coupleB: "B", weddingDate: "not-a-date" });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("invalid_wedding_date");
  });

  it("requires password when visibility is password", () => {
    const result = buildWebsiteConfig({
      coupleA: "A", coupleB: "B", weddingDate: "2025-01-01", visibility: "password",
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("password_required_for_password_visibility");
  });
});

// ── updateWebsiteConfig ────────────────────────────────────────────────────

describe("updateWebsiteConfig", () => {
  const base = {
    id: "john-and-jane-2025",
    coupleA: "John",
    coupleB: "Jane",
    weddingDate: "2025-08-15",
    visibility: "public",
    sections: ["welcome"],
    createdAt: "2025-01-01T00:00:00.000Z",
  };

  it("updates mutable fields", () => {
    const updated = updateWebsiteConfig(base, { visibility: "private", themePreset: "gold" });
    expect(updated.visibility).toBe("private");
    expect(updated.themePreset).toBe("gold");
  });

  it("does not mutate immutable fields", () => {
    const updated = updateWebsiteConfig(base, { id: "hacked", coupleA: "Eve" });
    expect(updated.id).toBe("john-and-jane-2025");
    expect(updated.coupleA).toBe("John");
  });

  it("does not mutate original", () => {
    updateWebsiteConfig(base, { visibility: "private" });
    expect(base.visibility).toBe("public");
  });
});

// ── validateSlug ───────────────────────────────────────────────────────────

describe("validateSlug", () => {
  it("accepts valid slug", () => {
    expect(validateSlug("john-and-jane-2025")).toBe(true);
  });

  it("rejects slug with uppercase", () => {
    expect(validateSlug("John-And-Jane")).toBe(false);
  });

  it("rejects empty slug", () => {
    expect(validateSlug("")).toBe(false);
  });
});

// ── WEBSITE_SECTIONS ───────────────────────────────────────────────────────

describe("WEBSITE_SECTIONS", () => {
  it("contains core sections", () => {
    expect(WEBSITE_SECTIONS).toContain("welcome");
    expect(WEBSITE_SECTIONS).toContain("rsvp");
    expect(WEBSITE_SECTIONS).toContain("venue");
  });
});
