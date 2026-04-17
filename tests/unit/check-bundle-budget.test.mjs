/**
 * tests/unit/check-bundle-budget.test.mjs — Tests for check-bundle-budget.mjs (Sprint 66)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkBudget, formatKB, formatReport } from "../../scripts/check-bundle-budget.mjs";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

// Build a real temp dir with fixture files

let TEMP_DIR;

beforeEach(() => {
  TEMP_DIR = resolve(tmpdir(), `budget-test-${Date.now()}`);
  mkdirSync(TEMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true });
});

describe("checkBudget", () => {
  it("returns empty array when directory does not exist", () => {
    expect(checkBudget("/nonexistent/path/abc123", 100_000, 50_000)).toStrictEqual([]);
  });

  it("returns empty array when directory has no js/css files", () => {
    writeFileSync(resolve(TEMP_DIR, "readme.txt"), "hello");
    expect(checkBudget(TEMP_DIR, 100_000, 50_000)).toStrictEqual([]);
  });

  it("marks js files as passed when under budget", () => {
    writeFileSync(resolve(TEMP_DIR, "main.js"), "x".repeat(100));
    const [r] = checkBudget(TEMP_DIR, 1_000, 50_000);
    expect(r.passed).toBe(true);
    expect(r.file).toBe("main.js");
  });

  it("marks js files as FAILED when over budget", () => {
    writeFileSync(resolve(TEMP_DIR, "chunk.js"), "x".repeat(200));
    const [r] = checkBudget(TEMP_DIR, 100, 50_000);
    expect(r.passed).toBe(false);
  });

  it("marks css files as passed when under budget", () => {
    writeFileSync(resolve(TEMP_DIR, "styles.css"), "a".repeat(1_000));
    const [r] = checkBudget(TEMP_DIR, 100_000, 50_000);
    expect(r.passed).toBe(true);
  });

  it("marks css files as FAILED when over budget", () => {
    writeFileSync(resolve(TEMP_DIR, "big.css"), "a".repeat(10_000));
    const [r] = checkBudget(TEMP_DIR, 100_000, 1_000);
    expect(r.passed).toBe(false);
  });

  it("sorts results by descending size", () => {
    writeFileSync(resolve(TEMP_DIR, "small.js"), "x".repeat(50));
    writeFileSync(resolve(TEMP_DIR, "large.js"), "x".repeat(500));
    const results = checkBudget(TEMP_DIR, 1_000_000, 1_000_000);
    expect(results[0].file).toBe("large.js");
    expect(results[1].file).toBe("small.js");
  });

  it("returns sizeBytes that match actual file size", () => {
    const content = "abc".repeat(100);
    writeFileSync(resolve(TEMP_DIR, "sized.js"), content);
    const [r] = checkBudget(TEMP_DIR, 1_000_000, 1_000_000);
    expect(r.sizeBytes).toBe(Buffer.byteLength(content));
  });
});

describe("formatKB", () => {
  it("converts bytes to KB string", () => {
    expect(formatKB(1024)).toBe("1.0 KB");
    expect(formatKB(2048)).toBe("2.0 KB");
    expect(formatKB(512)).toBe("0.5 KB");
  });
});

describe("formatReport", () => {
  it("returns no-assets message for empty input", () => {
    expect(formatReport([])).toContain("No JS/CSS assets found");
  });

  it("includes ✓ for passing entries", () => {
    const results = [{ file: "app.js", sizeBytes: 100, budget: 200, passed: true }];
    expect(formatReport(results)).toContain("✓");
  });

  it("includes ✗ OVER BUDGET for failing entries", () => {
    const results = [{ file: "huge.js", sizeBytes: 300, budget: 200, passed: false }];
    expect(formatReport(results)).toContain("✗ OVER BUDGET");
  });

  it("includes file names and sizes", () => {
    const results = [{ file: "main.js", sizeBytes: 1024, budget: 10_000, passed: true }];
    const report = formatReport(results);
    expect(report).toContain("main.js");
    expect(report).toContain("1.0 KB");
  });
});
