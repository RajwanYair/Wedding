/**
 * tests/unit/check-i18n-parity.test.mjs — Sprint 98
 */

import { describe, it, expect } from "vitest";
import {
  loadTranslations,
  findMissingKeys,
  checkParity,
} from "../../scripts/check-i18n-parity.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const __dir = dirname(fileURLToPath(import.meta.url));

// Create a temp i18n dir for tests
function makeTempDir(locales) {
  const dir = join(tmpdir(), `i18n-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  for (const [lang, obj] of Object.entries(locales)) {
    writeFileSync(join(dir, `${lang}.json`), JSON.stringify(obj));
  }
  return dir;
}

describe("loadTranslations", () => {
  it("loads all JSON files from a directory", () => {
    const dir = makeTempDir({ he: { hello: "שלום" }, en: { hello: "Hello" } });
    const result = loadTranslations(dir);
    expect(Object.keys(result).sort()).toEqual(["en", "he"]);
    rmSync(dir, { recursive: true });
  });

  it("skips non-JSON files", () => {
    const dir = makeTempDir({ he: { hello: "שלום" } });
    writeFileSync(join(dir, "README.txt"), "ignore me");
    const result = loadTranslations(dir);
    expect(Object.keys(result)).not.toContain("README");
    rmSync(dir, { recursive: true });
  });

  it("returns empty object for malformed JSON", () => {
    const d = join(tmpdir(), `i18n-malformed-${Date.now()}`);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "bad.json"), "NOT JSON");
    const result = loadTranslations(d);
    expect(result.bad).toEqual({});
    rmSync(d, { recursive: true });
  });
});

describe("findMissingKeys", () => {
  it("returns empty arrays when all locales share same keys", () => {
    const t = { he: { a: "1", b: "2" }, en: { a: "1", b: "2" } };
    const result = findMissingKeys(t);
    expect(result.he).toEqual([]);
    expect(result.en).toEqual([]);
  });

  it("detects key missing in one locale", () => {
    const t = { he: { a: "1", b: "2" }, en: { a: "1" } };
    const result = findMissingKeys(t);
    expect(result.en).toContain("b");
    expect(result.he).toEqual([]);
  });

  it("handles 3 locales", () => {
    const t = {
      he: { a: "1" },
      en: { a: "1", b: "B" },
      ar: { a: "1" },
    };
    const result = findMissingKeys(t);
    expect(result.he).toContain("b");
    expect(result.ar).toContain("b");
    expect(result.en).toEqual([]);
  });
});

describe("checkParity", () => {
  it("returns ok:true when all locales match", () => {
    const dir = makeTempDir({ he: { a: "1" }, en: { a: "hi" } });
    const { ok } = checkParity(dir);
    expect(ok).toBe(true);
    rmSync(dir, { recursive: true });
  });

  it("returns ok:false when there are missing keys", () => {
    const dir = makeTempDir({ he: { a: "1", b: "2" }, en: { a: "hi" } });
    const { ok, totalMissing } = checkParity(dir);
    expect(ok).toBe(false);
    expect(totalMissing).toBeGreaterThan(0);
    rmSync(dir, { recursive: true });
  });

  it("returns list of langs", () => {
    const dir = makeTempDir({ he: { x: "1" }, en: { x: "a" } });
    const { langs } = checkParity(dir);
    expect(langs.sort()).toEqual(["en", "he"]);
    rmSync(dir, { recursive: true });
  });

  it("works against the real src/i18n directory", () => {
    const realDir = join(__dir, "../../src/i18n");
    const { ok, langs } = checkParity(realDir);
    // Real translations should include at least he and en
    expect(langs).toContain("he");
    expect(langs).toContain("en");
    // We don't enforce ok===true here because optional WIP keys exist;
    // just verify the function returns without error
    expect(typeof ok).toBe("boolean");
  });
});
