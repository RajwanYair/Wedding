/**
 * tests/unit/icu-plurals.test.mjs — Sprint 150 ICU plural migration
 * Verifies that formatMessage resolves plural keys correctly for he + en.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const he = JSON.parse(fs.readFileSync(path.resolve("src/i18n/he.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.resolve("src/i18n/en.json"), "utf8"));

vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: () => null,
  writeBrowserStorageJson: () => {},
}));

const { formatMessage } = await import("../../src/core/i18n.js");

const PLURAL_KEYS = [
  "plural_guests",
  "plural_tables",
  "plural_vendors_overdue",
  "plural_time_minutes_ago",
  "plural_time_hours_ago",
  "plural_time_days_ago",
  "plural_more_guests",
  "plural_seated",
  "plural_constraints_more",
  "plural_transport_passengers",
  "plural_timeline_alarm",
];

describe("ICU Plurals (Sprint 150)", () => {
  describe("i18n keys exist in both locales", () => {
    for (const key of PLURAL_KEYS) {
      it(`${key} exists in he`, () => expect(he[key]).toBeDefined());
      it(`${key} exists in en`, () => expect(en[key]).toBeDefined());
    }
    it("plural_data_summary exists in he", () => expect(he.plural_data_summary).toBeDefined());
    it("plural_data_summary exists in en", () => expect(en.plural_data_summary).toBeDefined());
  });

  describe("formatMessage resolves EN plurals", () => {
    it("guests =0", () => {
      expect(formatMessage(en.plural_guests, { count: 0 })).toBe("No guests");
    });
    it("guests one", () => {
      expect(formatMessage(en.plural_guests, { count: 1 })).toBe("1 guest");
    });
    it("guests other", () => {
      expect(formatMessage(en.plural_guests, { count: 5 })).toBe("5 guests");
    });
    it("time minutes ago one", () => {
      expect(formatMessage(en.plural_time_minutes_ago, { count: 1 })).toBe("1 minute ago");
    });
    it("time minutes ago other", () => {
      expect(formatMessage(en.plural_time_minutes_ago, { count: 15 })).toBe("15 minutes ago");
    });
    it("more guests", () => {
      expect(formatMessage(en.plural_more_guests, { count: 3 })).toBe("+3 more guests");
    });
    it("data summary multi-param", () => {
      const result = formatMessage(en.plural_data_summary, { guests: 10, tables: 1 });
      expect(result).toBe("10 guests · 1 table");
    });
  });

  describe("formatMessage resolves HE plurals", () => {
    it("guests =0", () => {
      expect(formatMessage(he.plural_guests, { count: 0 })).toBe("אין אורחים");
    });
    it("guests one", () => {
      expect(formatMessage(he.plural_guests, { count: 1 })).toBe("אורח אחד");
    });
    it("guests other", () => {
      expect(formatMessage(he.plural_guests, { count: 5 })).toContain("אורחים");
    });
    it("data summary multi-param", () => {
      const result = formatMessage(he.plural_data_summary, { guests: 0, tables: 3 });
      expect(result).toContain("אין אורחים");
      expect(result).toContain("שולחנות");
    });
  });
});
