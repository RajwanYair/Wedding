import { describe, it, expect } from "vitest";
import {
  daysBetween,
  decomposeDuration,
  formatCountdown,
  weddingPhase,
} from "../../src/utils/time-format.js";

const D = 24 * 60 * 60 * 1000;
const H = 60 * 60 * 1000;
const M = 60 * 1000;

describe("time-format", () => {
  it("daysBetween returns positive count for future target", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    const target = new Date("2026-09-12T00:00:00Z");
    expect(daysBetween(target, now)).toBe(11);
  });

  it("daysBetween returns negative for past target", () => {
    const now = new Date("2026-09-15T00:00:00Z");
    expect(daysBetween("2026-09-12T00:00:00Z", now)).toBe(-3);
  });

  it("daysBetween throws on invalid input", () => {
    expect(() => daysBetween("nope")).toThrow(RangeError);
  });

  it("decomposeDuration splits into d/h/m/s", () => {
    const ms = 2 * D + 3 * H + 4 * M + 5 * 1000;
    expect(decomposeDuration(ms)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      negative: false,
    });
  });

  it("decomposeDuration flags negative", () => {
    const out = decomposeDuration(-3 * H);
    expect(out.negative).toBe(true);
    expect(out.hours).toBe(3);
  });

  it("decomposeDuration throws on non-finite", () => {
    expect(() => decomposeDuration(NaN)).toThrow(RangeError);
  });

  it("formatCountdown renders days+hours when ≥1 day", () => {
    expect(formatCountdown(2 * D + 4 * H)).toBe("2d 04h");
  });

  it("formatCountdown renders hours+minutes when <1 day", () => {
    expect(formatCountdown(3 * H + 22 * M)).toBe("3h 22m");
  });

  it("formatCountdown renders minutes+seconds under 1 hour", () => {
    expect(formatCountdown(5 * M + 9 * 1000)).toBe("5m 09s");
  });

  it("formatCountdown renders seconds-only under 1 minute", () => {
    expect(formatCountdown(45 * 1000)).toBe("45s");
  });

  it("formatCountdown prefixes minus for past times", () => {
    expect(formatCountdown(-2 * H)).toBe("-2h 00m");
  });

  it("weddingPhase classifies past", () => {
    expect(weddingPhase(-10)).toBe("past");
  });

  it("weddingPhase classifies tonight (<24h)", () => {
    expect(weddingPhase(5 * H)).toBe("tonight");
  });

  it("weddingPhase classifies imminent (<7d)", () => {
    expect(weddingPhase(3 * D)).toBe("imminent");
  });

  it("weddingPhase classifies soon (<30d) and weeks-away (<90d)", () => {
    expect(weddingPhase(20 * D)).toBe("soon");
    expect(weddingPhase(60 * D)).toBe("weeks-away");
  });

  it("weddingPhase classifies future for far-out", () => {
    expect(weddingPhase(200 * D)).toBe("future");
  });

  it("weddingPhase guards non-finite input", () => {
    expect(weddingPhase(NaN)).toBe("future");
  });
});
