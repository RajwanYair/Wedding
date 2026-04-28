/**
 * tests/unit/dead-exports.test.mjs — S164: dead exports purge guard.
 * Verifies that specific known-dead exports have been de-exported.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const uiJs = readFileSync(resolve(process.cwd(), "src/core/ui.js"), "utf8");
const paymentLinkJs = readFileSync(resolve(process.cwd(), "src/utils/payment-link.js"), "utf8");

describe("S164: dead exports purge", () => {
  it("ui.js: applyUpdate is no longer exported (de-exported to private)", () => {
    // Should not have `export function applyUpdate`
    expect(uiJs).not.toMatch(/export\s+function\s+applyUpdate/);
    // But the function itself still exists
    expect(uiJs).toMatch(/function\s+applyUpdate/);
  });

  it("payment-link.js: buildPayPalLink is no longer exported (used only internally)", () => {
    expect(paymentLinkJs).not.toMatch(/export\s+function\s+buildPayPalLink/);
    // Still exists as internal helper
    expect(paymentLinkJs).toMatch(/function\s+buildPayPalLink/);
  });

  it("payment-link.js: buildAllPaymentLinks is no longer exported", () => {
    expect(paymentLinkJs).not.toMatch(/export\s+function\s+buildAllPaymentLinks/);
  });

  it("ui.js: showUpdateBanner is still exported (used in main.js via initSW)", () => {
    expect(uiJs).toMatch(/export\s+function\s+showUpdateBanner/);
  });
});
