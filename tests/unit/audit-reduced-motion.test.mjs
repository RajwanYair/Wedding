// @ts-check
/**
 * tests/unit/audit-reduced-motion.test.mjs — S586
 *
 * Runs the reduced-motion audit script and asserts a clean pass.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";

describe("S586 reduced-motion audit", () => {
  it("audit-reduced-motion.mjs --strict exits 0", () => {
    const r = spawnSync(process.execPath, ["scripts/audit-reduced-motion.mjs", "--strict"], {
      encoding: "utf8",
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
    expect(r.stdout).toContain("OK");
  });
});
