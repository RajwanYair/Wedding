/**
 * @file validate-sections-strict.test.mjs
 * Sprint 60 — B1: validate-sections.mjs --strict mode
 *
 * Verifies the script source contains the expected --strict logic.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, "../../scripts/validate-sections.mjs");
const SRC = readFileSync(scriptPath, "utf8");

describe("validate-sections.mjs --strict mode (B1)", () => {
  it("reads --strict flag from process.argv", () => {
    expect(SRC).toContain('process.argv.includes("--strict")');
  });

  it("declares STRICT constant", () => {
    expect(SRC).toContain("const STRICT = process.argv.includes");
  });

  it("defines SKIP_TEMPLATE set for known sub-sections", () => {
    expect(SRC).toContain("const SKIP_TEMPLATE = new Set(");
    expect(SRC).toContain('"expenses"');
    expect(SRC).toContain('"contact-collector"');
  });

  it("skips template check for SKIP_TEMPLATE members", () => {
    expect(SRC).toContain("SKIP_TEMPLATE.has(name)");
  });

  it("escalates missing template to error in strict mode", () => {
    expect(SRC).toContain("if (STRICT)");
    expect(SRC).toContain("errors.push(`no matching template");
  });

  it("adds missing template as warning in normal mode", () => {
    expect(SRC).toContain("warnings.push(`no matching template");
  });

  it("capabilities missing is always a warning (not strict error)", () => {
    // The capabilities warning is explicitly excluded from strict escalation
    expect(SRC).toContain('"capabilities"');
    expect(SRC).toContain("warnings.push(`no \"capabilities\"");
  });

  it("prints strict mode header when --strict is active", () => {
    expect(SRC).toContain("Running in --strict mode");
  });

  it("displays warning icon for non-strict warnings", () => {
    expect(SRC).toContain("⚠ ${");
  });

  it("displays error icon for strict errors", () => {
    expect(SRC).toContain("✘ ${");
  });

  it("imports access from node:fs/promises for file existence check", () => {
    expect(SRC).toContain("access");
    expect(SRC).toContain("node:fs/promises");
  });

  it("defines exists() helper using access()", () => {
    expect(SRC).toContain("async function exists(p)");
    expect(SRC).toContain("await access(p)");
  });

  it("defines TEMPLATES_DIR constant", () => {
    expect(SRC).toContain("const TEMPLATES_DIR");
    expect(SRC).toContain("src/templates");
  });

  it("resolves template path from name", () => {
    expect(SRC).toContain("resolve(TEMPLATES_DIR, `${name}.html`)");
  });

  it("exits 0 when all sections pass in strict mode", () => {
    expect(SRC).toContain('process.stdout.write("\\nSection contract validation passed\\n")');
  });

  it("exits 1 on validation failure", () => {
    expect(SRC).toContain("process.exit(1)");
  });
});
