import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..");

describe("check:canonical-facts", () => {
  it("passes with current AGENTS.md ↔ copilot-instructions.md ↔ package.json", () => {
    const out = execSync("node scripts/check-canonical-facts.mjs --enforce", {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(out).toMatch(/violations=0/);
  });
});
