/**
 * S604 — vendors section SLA integration smoke test.
 * Confirms vendors.js wires scoreVendor + scoreTier from utils/vendor-sla.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(resolve(process.cwd(), "src/sections/vendors.js"), "utf8");

describe("S604 vendors SLA wiring", () => {
  it("imports scoreVendor + scoreTier from utils/vendor-sla", () => {
    expect(SRC).toMatch(/from\s+["']\.\.\/utils\/vendor-sla\.js["']/);
    expect(SRC).toContain("scoreVendor");
    expect(SRC).toContain("scoreTier");
  });

  it("renders an SLA badge only when slaInteractions is a non-empty array", () => {
    expect(SRC).toMatch(/slaInteractions/);
    expect(SRC).toMatch(/sla-badge/);
    expect(SRC).toMatch(/Array\.isArray\(v\.slaInteractions\)/);
  });

  it("uses tier-suffixed i18n keys", () => {
    expect(SRC).toMatch(/vendor_sla_tier_/);
  });
});
