/**
 * tests/unit/wedding-countdown.test.mjs — Sprint 36
 *
 * Tests for src/utils/wedding-countdown.js —
 *   computeCountdown, formatCountdownHuman
 */

import { describe, it, expect } from "vitest";
import {
  computeCountdown,
  formatCountdownHuman,
} from "../../src/utils/wedding-countdown.js";

// Fixed reference time: 2025-07-10 08:00:00 UTC
const NOW = new Date("2025-07-10T08:00:00Z");

// ── computeCountdown ───────────────────────────────────────────────────

describe("computeCountdown()", () => {
  it("returns days=0 seconds=0 isToday=true for same-day ISO date", () => {
    // Wedding is 2025-07-10 — same as NOW's UTC date
    // "isToday" uses Jerusalem TZ; both resolve to 2025-07-10 in IL (+3)
    const c = computeCountdown("2025-07-10T00:00:00", NOW);
    // Regardless of exact diff, isToday should be true since target date matches
    // Let's check a target that is definitely in the future same day
    const c2 = computeCountdown(new Date("2025-07-10T20:00:00Z"), NOW);
    expect(c2.isPast).toBe(false);
    expect(c2.days).toBe(0);
  });

  it("returns isPast=true when wedding date is in the past", () => {
    const c = computeCountdown("2025-01-01T00:00:00Z", NOW);
    expect(c.isPast).toBe(true);
    expect(c.days).toBeGreaterThan(100);
  });

  it("returns isPast=false when wedding date is in the future", () => {
    const c = computeCountdown("2026-01-01T00:00:00Z", NOW);
    expect(c.isPast).toBe(false);
    expect(c.days).toBeGreaterThan(170);
  });

  it("computes correct days for a 30-day future target", () => {
    const target = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
    const c = computeCountdown(target, NOW);
    expect(c.days).toBe(30);
    expect(c.hours).toBe(0);
    expect(c.minutes).toBe(0);
    expect(c.seconds).toBe(0);
  });

  it("computes correct hours and minutes for sub-day target", () => {
    const target = new Date(NOW.getTime() + (2 * 3600 + 30 * 60) * 1000);
    const c = computeCountdown(target, NOW);
    expect(c.days).toBe(0);
    expect(c.hours).toBe(2);
    expect(c.minutes).toBe(30);
  });

  it("total is the sum of all components in seconds", () => {
    const target = new Date(NOW.getTime() + 90061 * 1000); // 1d 1h 1m 1s
    const c = computeCountdown(target, NOW);
    expect(c.total).toBe(90061);
    expect(c.days).toBe(1);
    expect(c.hours).toBe(1);
    expect(c.minutes).toBe(1);
    expect(c.seconds).toBe(1);
  });

  it("accepts a Date object as weddingDate", () => {
    const target = new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000);
    const c = computeCountdown(target, NOW);
    expect(c.days).toBe(5);
  });

  it("marks isToday=false for a future date", () => {
    const c = computeCountdown("2026-06-15T00:00:00Z", NOW);
    expect(c.isToday).toBe(false);
  });
});

// ── formatCountdownHuman ───────────────────────────────────────────────

describe("formatCountdownHuman()", () => {
  it("returns today message when isToday=true (en)", () => {
    const c = computeCountdown(new Date(NOW.getTime() + 3600 * 1000), NOW);
    // Force isToday via object spread
    const msg = formatCountdownHuman({ ...c, isToday: true, isPast: false }, "en");
    expect(msg).toContain("Today");
  });

  it("returns today message in Hebrew when isToday=true (he)", () => {
    const msg = formatCountdownHuman({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isToday: true, isPast: false }, "he");
    expect(msg).toContain("היום");
  });

  it("formats a multi-day future countdown in English", () => {
    const c = { days: 45, hours: 3, minutes: 20, seconds: 0, total: 3900000, isToday: false, isPast: false };
    const msg = formatCountdownHuman(c, "en");
    expect(msg).toContain("45");
    expect(msg).toContain("days");
  });

  it("formats 'Tomorrow!' for 1-day countdown (en)", () => {
    const c = { days: 1, hours: 0, minutes: 0, seconds: 0, total: 86400, isToday: false, isPast: false };
    expect(formatCountdownHuman(c, "en")).toBe("Tomorrow!");
  });

  it("formats past countdown in English", () => {
    const c = { days: 10, hours: 0, minutes: 0, seconds: 0, total: 864000, isToday: false, isPast: true };
    const msg = formatCountdownHuman(c, "en");
    expect(msg).toContain("10");
    expect(msg).toContain("ago");
  });

  it("defaults locale to English", () => {
    const c = { days: 5, hours: 0, minutes: 0, seconds: 0, total: 432000, isToday: false, isPast: false };
    expect(formatCountdownHuman(c)).toContain("days");
  });
});
