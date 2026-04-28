/**
 * tests/unit/view-transitions.test.mjs — Unit tests for nav.js view-transition helpers (S92)
 *   + S161: per-section named view-transition CSS slots
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import { withViewTransition, isViewTransitionSupported } from "../../src/core/nav.js";

describe("view-transitions (S92)", () => {
  it("isViewTransitionSupported returns false when API is missing", () => {
    expect(isViewTransitionSupported()).toBe(false);
  });

  it("withViewTransition runs the callback synchronously without API", () => {
    const fn = vi.fn();
    withViewTransition(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("withViewTransition delegates to startViewTransition when available", () => {
    const start = vi.fn((cb) => {
      cb();
      return { ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    });
    // @ts-ignore — stub
    document.startViewTransition = start;
    try {
      const fn = vi.fn();
      withViewTransition(fn);
      expect(start).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledTimes(1);
    } finally {
      // @ts-ignore — cleanup
      delete document.startViewTransition;
    }
  });
});

// ── S161: per-section named view-transition CSS slots ─────────────────────
const css = readFileSync(resolve(process.cwd(), "css/components.css"), "utf8");

describe("S161: per-section view-transition names in CSS", () => {
  const sections = [
    "landing", "dashboard", "guests", "tables",
    "invitation", "whatsapp", "rsvp", "budget",
    "analytics", "timeline", "gallery", "checkin",
    "settings", "changelog", "vendors", "expenses",
  ];

  for (const section of sections) {
    it(`#section-${section}.active has vt-${section}`, () => {
      expect(css).toContain(`#section-${section}.active`);
      expect(css).toContain(`vt-${section}`);
    });
  }

  it("generic .section.active keeps section-content fallback", () => {
    expect(css).toContain("view-transition-name: section-content");
  });
});
