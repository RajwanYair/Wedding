/**
 * tests/unit/view-transitions.test.mjs — Unit tests for nav.js view-transition helpers (S92)
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";

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
