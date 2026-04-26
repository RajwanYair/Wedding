import { describe, it, expect, beforeEach, vi } from "vitest";
import { updateBadge, clearBadge } from "../../src/utils/app-badge.js";

describe("app-badge", () => {
  beforeEach(() => {
    delete globalThis.navigator;
  });

  it("updateBadge returns false when API is unavailable", async () => {
    globalThis.navigator = {};
    expect(await updateBadge(5)).toBe(false);
  });

  it("clearBadge returns false when API is unavailable", async () => {
    globalThis.navigator = {};
    expect(await clearBadge()).toBe(false);
  });

  it("updateBadge sets the badge for a positive integer", async () => {
    const setAppBadge = vi.fn(async () => undefined);
    const clearAppBadge = vi.fn(async () => undefined);
    globalThis.navigator = { setAppBadge, clearAppBadge };
    expect(await updateBadge(7)).toBe(true);
    expect(setAppBadge).toHaveBeenCalledWith(7);
  });

  it("updateBadge floors fractional counts", async () => {
    const setAppBadge = vi.fn(async () => undefined);
    globalThis.navigator = { setAppBadge, clearAppBadge: vi.fn() };
    await updateBadge(7.9);
    expect(setAppBadge).toHaveBeenCalledWith(7);
  });

  it("updateBadge clears when count is 0 / negative / NaN", async () => {
    const clearAppBadge = vi.fn(async () => undefined);
    globalThis.navigator = { setAppBadge: vi.fn(), clearAppBadge };
    await updateBadge(0);
    await updateBadge(-3);
    await updateBadge("abc");
    expect(clearAppBadge).toHaveBeenCalledTimes(3);
  });

  it("updateBadge swallows API errors and returns false", async () => {
    globalThis.navigator = {
      setAppBadge: vi.fn(async () => {
        throw new Error("nope");
      }),
      clearAppBadge: vi.fn(),
    };
    expect(await updateBadge(2)).toBe(false);
  });

  it("clearBadge swallows API errors and returns false", async () => {
    globalThis.navigator = {
      setAppBadge: vi.fn(),
      clearAppBadge: vi.fn(async () => {
        throw new Error("nope");
      }),
    };
    expect(await clearBadge()).toBe(false);
  });

  it("clearBadge returns true on success", async () => {
    const clearAppBadge = vi.fn(async () => undefined);
    globalThis.navigator = { setAppBadge: vi.fn(), clearAppBadge };
    expect(await clearBadge()).toBe(true);
    expect(clearAppBadge).toHaveBeenCalled();
  });
});
