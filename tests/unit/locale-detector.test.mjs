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
  getLocaleCurrency,
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
    expect(resolveAppLocale("en")).toBe("en");
  });

  it("falls back to 'en' for unsupported locale", () => {
    expect(resolveAppLocale("ja")).toBe("en");
    expect(resolveAppLocale("fr")).toBe("en");
    expect(resolveAppLocale("ar")).toBe("en");
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

describe("getLocaleCurrency — Sprint 23", () => {
  it("returns ILS for Hebrew locale", () => {
    expect(getLocaleCurrency("he")).toBe("ILS");
    expect(getLocaleCurrency("he-IL")).toBe("ILS");
  });

  it("returns ILS for Arabic locale", () => {
    expect(getLocaleCurrency("ar")).toBe("ILS");
  });

  it("returns USD for English locale", () => {
    expect(getLocaleCurrency("en")).toBe("USD");
    expect(getLocaleCurrency("en-US")).toBe("USD");
  });

  it("returns RUB for Russian locale", () => {
    expect(getLocaleCurrency("ru")).toBe("RUB");
  });

  it("returns EUR for German/French locales", () => {
    expect(getLocaleCurrency("de")).toBe("EUR");
    expect(getLocaleCurrency("fr")).toBe("EUR");
  });

  it("falls back to ILS for unknown locale", () => {
    expect(getLocaleCurrency("xx")).toBe("ILS");
    expect(getLocaleCurrency("")).toBe("ILS");
  });
});
