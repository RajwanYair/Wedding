import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..");

describe("audit:utils script", () => {
  it("emits a JSON report with required keys", () => {
    const out = execSync("node scripts/audit-utils.mjs --json", {
      cwd: ROOT,
      encoding: "utf8",
    });
    const report = JSON.parse(out);
    expect(report).toHaveProperty("utils");
    expect(report).toHaveProperty("unusedExports");
    expect(report).toHaveProperty("missingOwner");
    expect(report).toHaveProperty("largest");
    expect(report).toHaveProperty("totalViolations");
    expect(report.utils).toBeGreaterThan(100);
    expect(Array.isArray(report.unusedExports)).toBe(true);
    expect(Array.isArray(report.missingOwner)).toBe(true);
  });

  it("largest list is at most 10 entries", () => {
    const out = execSync("node scripts/audit-utils.mjs --json", {
      cwd: ROOT,
      encoding: "utf8",
    });
    const report = JSON.parse(out);
    expect(report.largest.length).toBeLessThanOrEqual(10);
    for (const e of report.largest) {
      expect(e).toHaveProperty("file");
      expect(e).toHaveProperty("sizeBytes");
      expect(e).toHaveProperty("lines");
    }
  });
});
