/**
 * tests/unit/app-badge.test.mjs — App Badging API wrapper (Phase 4.2)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Helpers to install/remove mock navigator badge API
function installBadging() {
  const setAppBadge = vi.fn().mockResolvedValue(undefined);
  const clearAppBadge = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(globalThis, "navigator", {
    value: { ...globalThis.navigator, setAppBadge, clearAppBadge },
    configurable: true,
    writable: true,
  });
  return { setAppBadge, clearAppBadge };
}

function removeBadging() {
  const { setAppBadge: _s, clearAppBadge: _c, ...rest } =
    /** @type {any} */ (globalThis.navigator ?? {});
  Object.defineProperty(globalThis, "navigator", {
    value: rest,
    configurable: true,
    writable: true,
  });
}

describe("isBadgingSupported()", () => {
  afterEach(removeBadging);

  it("returns false when setAppBadge is absent", async () => {
    removeBadging();
    const { isBadgingSupported } = await import("../../src/utils/app-badge.js");
    expect(isBadgingSupported()).toBe(false);
  });

  it("returns true when setAppBadge is a function", async () => {
    installBadging();
    const { isBadgingSupported } = await import("../../src/utils/app-badge.js");
    expect(isBadgingSupported()).toBe(true);
  });
});

describe("updateBadge()", () => {
  beforeEach(() => vi.resetModules());
  afterEach(removeBadging);

  it("calls setAppBadge with positive count", async () => {
    const { setAppBadge } = installBadging();
    const { updateBadge } = await import("../../src/utils/app-badge.js");
    updateBadge(5);
    expect(setAppBadge).toHaveBeenCalledWith(5);
  });

  it("calls clearAppBadge when count is 0", async () => {
    const { clearAppBadge } = installBadging();
    const { updateBadge } = await import("../../src/utils/app-badge.js");
    updateBadge(0);
    expect(clearAppBadge).toHaveBeenCalled();
  });

  it("rounds fractional counts", async () => {
    const { setAppBadge } = installBadging();
    const { updateBadge } = await import("../../src/utils/app-badge.js");
    updateBadge(3.7);
    expect(setAppBadge).toHaveBeenCalledWith(4);
  });

  it("clamps negative counts to 0 (calls clearAppBadge)", async () => {
    const { clearAppBadge } = installBadging();
    const { updateBadge } = await import("../../src/utils/app-badge.js");
    updateBadge(-2);
    expect(clearAppBadge).toHaveBeenCalled();
  });

  it("does nothing when Badging API not available", async () => {
    removeBadging();
    const { updateBadge } = await import("../../src/utils/app-badge.js");
    // Should not throw
    expect(() => updateBadge(3)).not.toThrow();
  });
});

describe("clearBadge()", () => {
  beforeEach(() => vi.resetModules());
  afterEach(removeBadging);

  it("calls clearAppBadge when available", async () => {
    const { clearAppBadge } = installBadging();
    const { clearBadge } = await import("../../src/utils/app-badge.js");
    clearBadge();
    expect(clearAppBadge).toHaveBeenCalled();
  });

  it("does nothing when Badging API not available", async () => {
    removeBadging();
    const { clearBadge } = await import("../../src/utils/app-badge.js");
    expect(() => clearBadge()).not.toThrow();
  });
});
