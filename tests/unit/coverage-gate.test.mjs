/**
 * tests/unit/coverage-gate.test.mjs — S163: coverage gate enforcement
 * Tests that the threshold config is consistent and the gate logic is sound.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Verify vite.config.js global thresholds ───────────────────────────────
const viteCfg = readFileSync(resolve(process.cwd(), "vite.config.js"), "utf8");

describe("S163: coverage gate — vite.config.js global thresholds", () => {
  it("has a global lines threshold", () => {
    expect(viteCfg).toMatch(/lines:\s*\d+/);
  });

  it("has a global branches threshold", () => {
    expect(viteCfg).toMatch(/branches:\s*\d+/);
  });

  it("has a global functions threshold", () => {
    expect(viteCfg).toMatch(/functions:\s*\d+/);
  });

  it("has a global statements threshold", () => {
    expect(viteCfg).toMatch(/statements:\s*\d+/);
  });

  it("lines threshold is >= 48 (S163 ratchet floor)", () => {
    const m = viteCfg.match(/\/\/ S163.*\n.*lines:\s*(\d+)/);
    if (m) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(48);
    } else {
      // fallback: check that thresholds block includes lines: NNN
      expect(viteCfg).toContain("lines: 48");
    }
  });

  it("branches threshold is >= 42 (S163 ratchet floor)", () => {
    expect(viteCfg).toContain("branches: 42");
  });

  it("per-directory src/utils/** threshold is present", () => {
    expect(viteCfg).toContain('"src/utils/**"');
  });

  it("per-directory src/core/** threshold is present", () => {
    expect(viteCfg).toContain('"src/core/**"');
  });
});

// ── Verify check-coverage-gate.mjs TARGETS ───────────────────────────────
const gateScript = readFileSync(
  resolve(process.cwd(), "scripts/check-coverage-gate.mjs"),
  "utf8",
);

describe("S163: check-coverage-gate.mjs TARGETS", () => {
  it("script file exists and is readable", () => {
    expect(gateScript.length).toBeGreaterThan(0);
  });

  it("TARGETS.lines >= 48", () => {
    const m = gateScript.match(/lines:\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m?.[1])).toBeGreaterThanOrEqual(48);
  });

  it("TARGETS.branches >= 42", () => {
    const m = gateScript.match(/branches:\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m?.[1])).toBeGreaterThanOrEqual(42);
  });

  it("script supports --enforce flag", () => {
    expect(gateScript).toContain("--enforce");
  });
});
