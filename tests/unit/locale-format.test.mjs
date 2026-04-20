/**
 * tests/unit/locale-format.test.mjs — Locale-aware formatting (Sprint 54)
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  formatShortDate,
  formatLongDate,
  formatTime,
  formatDateTime,
  getMonthName,
  getMonthNames,
  getWeekdayShort,
  formatRelativeTime,
  formatTimeAgo,
  formatList,
  formatListNarrow,
  getPluralCategory,
  pluralize,
  getCollator,
  sortLocale,
  sortByKey,
  formatLocaleNumber,
  formatPercent,
} from "../../src/utils/locale-format.js";

// ── constants ──────────────────────────────────────────────────────────────

describe("DEFAULT_LOCALE / FALLBACK_LOCALE", () => {
  it("DEFAULT_LOCALE is he-IL", () => {
    expect(DEFAULT_LOCALE).toBe("he-IL");
  });
  it("FALLBACK_LOCALE is en-US", () => {
    expect(FALLBACK_LOCALE).toBe("en-US");
  });
});

// ── formatShortDate ────────────────────────────────────────────────────────

describe("formatShortDate()", () => {
  it("returns a non-empty string for a valid ISO date", () => {
    const s = formatShortDate("2025-08-15", "en-US");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });

  it("contains the year", () => {
    const s = formatShortDate("2025-08-15", "en-US");
    expect(s).toContain("2025");
  });

  it("accepts a Date object", () => {
    const s = formatShortDate(new Date(2025, 7, 15), "en-US");
    expect(s).toContain("2025");
  });

  it("accepts a timestamp", () => {
    const ts = new Date("2025-01-01").getTime();
    const s = formatShortDate(ts, "en-US");
    expect(s).toContain("2025");
  });
});

// ── formatLongDate ─────────────────────────────────────────────────────────

describe("formatLongDate()", () => {
  it("returns a longer string than formatShortDate", () => {
    const short = formatShortDate("2025-08-15", "en-US");
    const long = formatLongDate("2025-08-15", "en-US");
    expect(long.length).toBeGreaterThan(short.length);
  });

  it("contains the year", () => {
    const s = formatLongDate("2025-08-15", "en-US");
    expect(s).toContain("2025");
  });
});

// ── formatTime ─────────────────────────────────────────────────────────────

describe("formatTime()", () => {
  it("returns a time string for a Date with hours/minutes", () => {
    // 2025-08-15T14:30:00Z (UTC); actual displayed time depends on timezone in env
    const s = formatTime(new Date("2025-08-15T00:00:00.000Z"), "en-US");
    expect(typeof s).toBe("string");
    expect(s).toMatch(/\d{1,2}:\d{2}/);
  });
});

// ── formatDateTime ─────────────────────────────────────────────────────────

describe("formatDateTime()", () => {
  it("returns string containing date and time parts", () => {
    const s = formatDateTime("2025-08-15T14:30:00.000Z", "en-US");
    expect(typeof s).toBe("string");
    expect(s).toMatch(/\d/);
  });

  it("is longer than formatShortDate alone", () => {
    const short = formatShortDate("2025-08-15", "en-US");
    const dt = formatDateTime("2025-08-15T14:30:00.000Z", "en-US");
    expect(dt.length).toBeGreaterThan(short.length);
  });
});

// ── getMonthName ───────────────────────────────────────────────────────────

describe("getMonthName()", () => {
  it("returns January for index 0 in en-US", () => {
    expect(getMonthName(0, "en-US")).toBe("January");
  });

  it("returns December for index 11 in en-US", () => {
    expect(getMonthName(11, "en-US")).toBe("December");
  });

  it("returns a non-empty string in he-IL", () => {
    const s = getMonthName(0, "he-IL");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });
});

// ── getMonthNames ──────────────────────────────────────────────────────────

describe("getMonthNames()", () => {
  it("returns 12 month names", () => {
    expect(getMonthNames("en-US")).toHaveLength(12);
  });

  it("first month is January in en-US", () => {
    expect(getMonthNames("en-US")[0]).toBe("January");
  });
});

// ── getWeekdayShort ────────────────────────────────────────────────────────

describe("getWeekdayShort()", () => {
  it("returns a short string", () => {
    const s = getWeekdayShort("2025-08-15", "en-US"); // Friday
    expect(typeof s).toBe("string");
    expect(s.length).toBeLessThanOrEqual(5);
  });

  it("returns non-empty string in he-IL", () => {
    const s = getWeekdayShort("2025-08-15", "he-IL");
    expect(s.length).toBeGreaterThan(0);
  });
});

// ── formatRelativeTime ─────────────────────────────────────────────────────

describe("formatRelativeTime()", () => {
  it("formats positive day relative time in en-US", () => {
    const s = formatRelativeTime(3, "day", "en-US");
    expect(s).toContain("3");
  });

  it("formats negative day relative time in en-US", () => {
    const s = formatRelativeTime(-2, "day", "en-US");
    expect(s).toContain("2");
  });

  it("returns a string in he-IL", () => {
    const s = formatRelativeTime(1, "month", "he-IL");
    expect(typeof s).toBe("string");
  });
});

// ── formatTimeAgo ──────────────────────────────────────────────────────────

describe("formatTimeAgo()", () => {
  it("returns a string for a past date", () => {
    const past = new Date(Date.now() - 60_000);
    const s = formatTimeAgo(past, "en-US");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });

  it("returns a string for a future date", () => {
    const future = new Date(Date.now() + 3_600_000);
    const s = formatTimeAgo(future, "en-US");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });

  it("handles old dates (years)", () => {
    const old = new Date("2000-01-01");
    const s = formatTimeAgo(old, "en-US");
    expect(s).toMatch(/year/i);
  });

  it("handles recent timestamps (seconds)", () => {
    const recent = new Date(Date.now() - 5_000);
    const s = formatTimeAgo(recent, "en-US");
    expect(typeof s).toBe("string");
  });
});

// ── formatList ─────────────────────────────────────────────────────────────

describe("formatList()", () => {
  it("returns empty string for empty array", () => {
    expect(formatList([], "conjunction", "en-US")).toBe("");
  });

  it("returns single item as-is", () => {
    expect(formatList(["Alice"], "conjunction", "en-US")).toBe("Alice");
  });

  it("joins two items with conjunction in en-US", () => {
    const s = formatList(["Alice", "Bob"], "conjunction", "en-US");
    expect(s).toContain("Alice");
    expect(s).toContain("Bob");
  });

  it("joins three items in en-US", () => {
    const s = formatList(["Alice", "Bob", "Carol"], "conjunction", "en-US");
    expect(s).toContain("Alice");
    expect(s).toContain("Carol");
  });
});

// ── formatListNarrow ───────────────────────────────────────────────────────

describe("formatListNarrow()", () => {
  it("returns empty string for empty array", () => {
    expect(formatListNarrow([], "en-US")).toBe("");
  });

  it("returns a string for non-empty array", () => {
    const s = formatListNarrow(["a", "b"], "en-US");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });
});

// ── getPluralCategory ──────────────────────────────────────────────────────

describe("getPluralCategory()", () => {
  it("returns one for 1 in en-US", () => {
    expect(getPluralCategory(1, "cardinal", "en-US")).toBe("one");
  });

  it("returns other for 2 in en-US", () => {
    expect(getPluralCategory(2, "cardinal", "en-US")).toBe("other");
  });

  it("returns other for 0 in en-US", () => {
    expect(getPluralCategory(0, "cardinal", "en-US")).toBe("other");
  });
});

// ── pluralize ──────────────────────────────────────────────────────────────

describe("pluralize()", () => {
  it("returns one form for 1 in en-US", () => {
    const forms = { one: "guest", other: "guests" };
    expect(pluralize(1, forms, "en-US")).toBe("guest");
  });

  it("returns other form for 2 in en-US", () => {
    const forms = { one: "guest", other: "guests" };
    expect(pluralize(2, forms, "en-US")).toBe("guests");
  });

  it("falls back to other when category not in forms", () => {
    const forms = { other: "items" };
    expect(pluralize(5, forms, "en-US")).toBe("items");
  });
});

// ── getCollator ────────────────────────────────────────────────────────────

describe("getCollator()", () => {
  it("returns a comparator function", () => {
    const cmp = getCollator("en-US");
    expect(typeof cmp).toBe("function");
  });

  it("comparator returns 0 for identical strings", () => {
    const cmp = getCollator("en-US");
    expect(cmp("hello", "hello")).toBe(0);
  });

  it("comparator returns negative when a < b", () => {
    const cmp = getCollator("en-US");
    expect(cmp("apple", "banana")).toBeLessThan(0);
  });

  it("comparator returns positive when a > b", () => {
    const cmp = getCollator("en-US");
    expect(cmp("banana", "apple")).toBeGreaterThan(0);
  });
});

// ── sortLocale ─────────────────────────────────────────────────────────────

describe("sortLocale()", () => {
  it("sorts an array of strings locale-aware", () => {
    const arr = ["banana", "apple", "cherry"];
    const sorted = sortLocale([...arr], "en-US");
    expect(sorted[0]).toBe("apple");
    expect(sorted[2]).toBe("cherry");
  });

  it("handles empty array", () => {
    expect(sortLocale([], "en-US")).toEqual([]);
  });
});

// ── sortByKey ──────────────────────────────────────────────────────────────

describe("sortByKey()", () => {
  it("sorts objects by string key", () => {
    const arr = [{ name: "Zara" }, { name: "Alice" }, { name: "Miri" }];
    const sorted = sortByKey([...arr], "name", "en-US");
    expect(sorted[0].name).toBe("Alice");
    expect(sorted[2].name).toBe("Zara");
  });

  it("handles missing key values", () => {
    const arr = [{ name: "Bob" }, { age: 30 }, { name: "Alice" }];
    expect(() => sortByKey([...arr], "name", "en-US")).not.toThrow();
  });
});

// ── formatLocaleNumber ─────────────────────────────────────────────────────

describe("formatLocaleNumber()", () => {
  it("formats integer without decimals", () => {
    const s = formatLocaleNumber(1000, { maximumFractionDigits: 0 }, "en-US");
    expect(s).toContain("1");
    expect(s).toContain("000");
  });

  it("formats decimal with 2 places", () => {
    const s = formatLocaleNumber(3.14159, { maximumFractionDigits: 2 }, "en-US");
    expect(s).toContain("3.14");
  });

  it("returns a string", () => {
    expect(typeof formatLocaleNumber(42)).toBe("string");
  });
});

// ── formatPercent ──────────────────────────────────────────────────────────

describe("formatPercent()", () => {
  it("formats 0.5 as 50%", () => {
    const s = formatPercent(0.5, 0, "en-US");
    expect(s).toContain("50");
    expect(s).toContain("%");
  });

  it("formats 1.0 as 100%", () => {
    const s = formatPercent(1.0, 0, "en-US");
    expect(s).toContain("100");
  });

  it("respects decimal places", () => {
    const s = formatPercent(0.3333, 1, "en-US");
    expect(s).toContain("33.3");
  });

  it("returns a string", () => {
    expect(typeof formatPercent(0.75)).toBe("string");
  });
});
