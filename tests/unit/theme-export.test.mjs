/**
 * tests/unit/theme-export.test.mjs — S131 theme.json export/import.
 */
import { describe, it, expect } from "vitest";
import {
  exportThemeJson,
  stringifyThemeJson,
  importThemeJson,
} from "../../src/services/theme.js";

const VALID_DRAFT = {
  "--color-primary": "#abcdef",
  "--color-secondary": "#123456",
  "--radius-md": "8",
};

describe("S131 — theme-export", () => {
  it("exportThemeJson produces schema v1 envelope", () => {
    const env = exportThemeJson(VALID_DRAFT, { name: "Sunset", author: "Yair" });
    expect(env.schemaVersion).toBe(1);
    expect(env.name).toBe("Sunset");
    expect(env.author).toBe("Yair");
    expect(env.vars["--color-primary"]).toBe("#abcdef");
    expect(typeof env.createdAt).toBe("string");
  });

  it("exportThemeJson clamps long meta strings to 80 chars", () => {
    const long = "x".repeat(500);
    const env = exportThemeJson(VALID_DRAFT, { name: long, author: long });
    expect(env.name.length).toBe(80);
    expect(env.author.length).toBe(80);
  });

  it("stringifyThemeJson sorts vars deterministically", () => {
    const env = exportThemeJson(VALID_DRAFT);
    const json = stringifyThemeJson(env);
    const idxPrimary = json.indexOf("--color-primary");
    const idxRadius = json.indexOf("--radius-md");
    // alphabetical order: --color-* before --radius-*
    expect(idxPrimary).toBeLessThan(idxRadius);
    expect(JSON.parse(json).schemaVersion).toBe(1);
  });

  it("importThemeJson round-trips", () => {
    const env = exportThemeJson(VALID_DRAFT, { name: "T1" });
    const json = stringifyThemeJson(env);
    const r = importThemeJson(json);
    expect(r.ok).toBe(true);
    expect(r.envelope.name).toBe("T1");
    expect(r.envelope.vars["--color-primary"]).toBe("#abcdef");
  });

  it("importThemeJson rejects malformed JSON / wrong schema", () => {
    expect(importThemeJson("{ not json").ok).toBe(false);
    expect(importThemeJson({ schemaVersion: 99, vars: {} }).ok).toBe(false);
    expect(importThemeJson({ schemaVersion: 1 }).ok).toBe(false);
    expect(importThemeJson(null).ok).toBe(false);
  });

  it("importThemeJson drops unknown vars (forward-compat)", () => {
    const r = importThemeJson({
      schemaVersion: 1,
      name: "x",
      vars: {
        "--color-primary": "#000000",
        "--mystery-future-token": "42",
      },
    });
    expect(r.ok).toBe(true);
    expect(r.envelope.vars).not.toHaveProperty("--mystery-future-token");
    expect(r.envelope.vars["--color-primary"]).toBe("#000000");
  });
});
