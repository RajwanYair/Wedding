/**
 * tests/unit/locale-detector.test.mjs — Sprint 143
 */

import { describe, it, expect } from "vitest";
import {
  primaryLang,
  isRtl,
  detectLocale,
  resolveAppLocale,
  getLocaleInfo,
} from "../../src/utils/locale-detector.js";

describe("primaryLang", () => {
  it("strips region subtag", () => {
    expect(primaryLang("en-US")).toBe("en");
    expect(primaryLang("he-IL")).toBe("he");
  });

  it("returns full tag if no subtag", () => {
    expect(primaryLang("ar")).toBe("ar");
  });

  it("lowercases output", () => {
    expect(primaryLang("FR")).toBe("fr");
  });
});

describe("isRtl", () => {
  it("returns true for RTL languages", () => {
    expect(isRtl("he")).toBe(true);
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("fa")).toBe(true);
  });

  it("returns false for LTR languages", () => {
    expect(isRtl("en")).toBe(false);
    expect(isRtl("fr")).toBe(false);
    expect(isRtl("ru")).toBe(false);
  });

  it("handles region sub-tag", () => {
    expect(isRtl("he-IL")).toBe(true);
    expect(isRtl("en-US")).toBe(false);
  });
});

describe("detectLocale", () => {
  it("returns first language from navigator.languages", () => {
    const nav = { languages: ["he-IL", "en"] };
    expect(detectLocale(nav)).toBe("he-IL");
  });

  it("falls back to navigator.language", () => {
    const nav = { language: "ru" };
    expect(detectLocale(nav)).toBe("ru");
  });

  it("falls back to 'en' for empty nav", () => {
    expect(detectLocale({})).toBe("en");
  });
});

describe("resolveAppLocale", () => {
  it("resolves supported locale", () => {
    expect(resolveAppLocale("he")).toBe("he");
    expect(resolveAppLocale("ar")).toBe("ar");
  });

  it("falls back to 'en' for unsupported locale", () => {
    expect(resolveAppLocale("ja")).toBe("en");
    expect(resolveAppLocale("fr")).toBe("en");
  });

  it("strips region tag", () => {
    expect(resolveAppLocale("he-IL")).toBe("he");
  });
});

describe("getLocaleInfo", () => {
  it("returns full info for Hebrew", () => {
    const info = getLocaleInfo({ languages: ["he-IL"] });
    expect(info.raw).toBe("he-IL");
    expect(info.primary).toBe("he");
    expect(info.isRtl).toBe(true);
    expect(info.appLocale).toBe("he");
  });

  it("returns full info for English", () => {
    const info = getLocaleInfo({ languages: ["en-US"] });
    expect(info.isRtl).toBe(false);
    expect(info.appLocale).toBe("en");
  });
});
