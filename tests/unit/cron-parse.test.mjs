import { describe, it, expect } from "vitest";
import { parseCron, matches, nextRun } from "../../src/utils/cron-parse.js";

describe("cron-parse", () => {
  it("parses all-stars", () => {
    const c = parseCron("* * * * *");
    expect(c.minute.size).toBe(60);
    expect(c.hour.size).toBe(24);
  });

  it("parses single value", () => {
    const c = parseCron("5 * * * *");
    expect(Array.from(c.minute)).toEqual([5]);
  });

  it("parses comma list", () => {
    const c = parseCron("1,2,3 * * * *");
    expect(Array.from(c.minute).sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it("parses range", () => {
    const c = parseCron("0 9-17 * * *");
    expect(c.hour.has(9)).toBe(true);
    expect(c.hour.has(17)).toBe(true);
    expect(c.hour.has(8)).toBe(false);
  });

  it("parses step", () => {
    const c = parseCron("*/15 * * * *");
    expect(Array.from(c.minute).sort((a, b) => a - b)).toEqual([0, 15, 30, 45]);
  });

  it("rejects malformed input", () => {
    expect(() => parseCron("only four fields here")).toThrow();
    expect(() => parseCron(/** @type {any} */ (null))).toThrow();
    expect(() => parseCron("60 * * * *")).toThrow();
    expect(() => parseCron("*/0 * * * *")).toThrow();
    expect(() => parseCron("a * * * *")).toThrow();
  });

  it("matches a date when all fields agree", () => {
    const c = parseCron("0 9 * * *");
    expect(matches(c, new Date("2026-01-01T09:00:00"))).toBe(true);
    expect(matches(c, new Date("2026-01-01T09:01:00"))).toBe(false);
  });

  it("matches dow", () => {
    const c = parseCron("0 0 * * 1");
    expect(matches(c, new Date("2026-01-05T00:00:00"))).toBe(true);
    expect(matches(c, new Date("2026-01-06T00:00:00"))).toBe(false);
  });

  it("matches returns false on invalid Date", () => {
    expect(matches(parseCron("* * * * *"), new Date("nope"))).toBe(false);
  });

  it("nextRun finds the immediate next minute", () => {
    const c = parseCron("*/5 * * * *");
    const out = nextRun(c, new Date("2026-01-01T00:01:00"));
    expect(out?.getMinutes()).toBe(5);
  });

  it("nextRun honours hour boundary", () => {
    const c = parseCron("0 9 * * *");
    const out = nextRun(c, new Date("2026-01-01T09:01:00"));
    expect(out?.getDate()).toBe(2);
    expect(out?.getHours()).toBe(9);
  });

  it("nextRun returns null on invalid from", () => {
    expect(nextRun(parseCron("* * * * *"), new Date("nope"))).toBeNull();
  });

  it("nextRun returns null when limit exceeded", () => {
    const c = parseCron("0 0 30 2 *");
    expect(nextRun(c, new Date("2026-01-01T00:00:00"), 10)).toBeNull();
  });
});
