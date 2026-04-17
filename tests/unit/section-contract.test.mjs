/**
 * tests/unit/section-contract.test.mjs
 *
 * Unit tests for src/core/section-contract.js
 * Tests: validateSectionModule, buildCapabilityMap, getSectionsWithCapability
 */

import { describe, it, expect } from "vitest";
import {
  SECTION_CAPABILITIES,
  validateSectionModule,
  buildCapabilityMap,
  getSectionsWithCapability,
} from "../../src/core/section-contract.js";

// ── validateSectionModule ─────────────────────────────────────────────────

describe("validateSectionModule — valid modules", () => {
  it("accepts a module with mount + unmount", () => {
    const mod = { mount: () => {}, unmount: () => {} };
    const result = validateSectionModule("test", mod);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts a module with capabilities object", () => {
    const mod = {
      mount: () => {},
      unmount: () => {},
      capabilities: { offline: true, public: false },
    };
    expect(validateSectionModule("test", mod).ok).toBe(true);
  });

  it("accepts all valid capability keys", () => {
    const mod = {
      mount: () => {},
      unmount: () => {},
      capabilities: { offline: true, public: true, printable: true, shortcuts: false, analytics: true },
    };
    expect(validateSectionModule("test", mod).ok).toBe(true);
  });
});

describe("validateSectionModule — invalid modules", () => {
  it("rejects null mod", () => {
    const result = validateSectionModule("test", null);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/not an object/);
  });

  it("rejects module missing mount", () => {
    const mod = { unmount: () => {} };
    const result = validateSectionModule("test", mod);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('"mount"'))).toBe(true);
  });

  it("rejects module missing unmount", () => {
    const mod = { mount: () => {} };
    const result = validateSectionModule("test", mod);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('"unmount"'))).toBe(true);
  });

  it("rejects non-function mount", () => {
    const mod = { mount: "not-a-function", unmount: () => {} };
    const result = validateSectionModule("test", mod);
    expect(result.ok).toBe(false);
  });

  it("rejects capabilities as array", () => {
    const mod = { mount: () => {}, unmount: () => {}, capabilities: [] };
    const result = validateSectionModule("test", mod);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("plain object"))).toBe(true);
  });

  it("rejects capabilities with unknown key", () => {
    const mod = { mount: () => {}, unmount: () => {}, capabilities: { unknown_key: true } };
    const result = validateSectionModule("test", mod);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('"unknown_key"'))).toBe(true);
  });

  it("rejects capabilities with non-boolean value", () => {
    const mod = { mount: () => {}, unmount: () => {}, capabilities: { offline: "yes" } };
    const result = validateSectionModule("test", mod);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("boolean"))).toBe(true);
  });

  it("collects multiple errors at once", () => {
    const result = validateSectionModule("test", {});
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ── buildCapabilityMap ────────────────────────────────────────────────────

describe("buildCapabilityMap", () => {
  it("returns empty map when no capabilities", () => {
    const map = buildCapabilityMap({
      guests: {},
      rsvp: { mount: () => {}, unmount: () => {} },
    });
    expect(map.size).toBe(0);
  });

  it("groups sections by capability", () => {
    const map = buildCapabilityMap({
      guests: { capabilities: { offline: true, analytics: true } },
      rsvp: { capabilities: { offline: true, public: true } },
      dashboard: { capabilities: { analytics: true } },
    });
    expect(map.get("offline")).toEqual(new Set(["guests", "rsvp"]));
    expect(map.get("analytics")).toEqual(new Set(["guests", "dashboard"]));
    expect(map.get("public")).toEqual(new Set(["rsvp"]));
  });

  it("excludes false capabilities", () => {
    const map = buildCapabilityMap({
      guests: { capabilities: { offline: false, analytics: true } },
    });
    expect(map.has("offline")).toBe(false);
    expect(map.get("analytics")).toEqual(new Set(["guests"]));
  });
});

// ── getSectionsWithCapability ─────────────────────────────────────────────

describe("getSectionsWithCapability", () => {
  it("returns array of section names for a capability", () => {
    const map = buildCapabilityMap({
      guests: { capabilities: { printable: true } },
      tables: { capabilities: { printable: true } },
    });
    expect(getSectionsWithCapability(map, "printable")).toEqual(
      expect.arrayContaining(["guests", "tables"]),
    );
  });

  it("returns empty array for unknown capability", () => {
    const map = new Map();
    expect(getSectionsWithCapability(map, "offline")).toEqual([]);
  });
});

// ── SECTION_CAPABILITIES constant ────────────────────────────────────────

describe("SECTION_CAPABILITIES", () => {
  it("contains all well-known capability keys", () => {
    expect(SECTION_CAPABILITIES).toMatchObject({
      OFFLINE: "offline",
      PUBLIC: "public",
      PRINTABLE: "printable",
      SHORTCUTS: "shortcuts",
      ANALYTICS: "analytics",
    });
  });
});
