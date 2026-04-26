/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { initNetworkStatus, onStatusChange } from "../../src/utils/network-status.js";

describe("network-status", () => {
  beforeEach(() => {
    document.body.classList.remove("is-offline");
  });

  it("initNetworkStatus is idempotent and toggles body class on offline", () => {
    initNetworkStatus();
    initNetworkStatus(); // second call must not throw
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
    expect(document.body.classList.contains("is-offline")).toBe(true);
  });

  it("onStatusChange returns an unsubscribe fn and is invoked on changes", () => {
    const cb = vi.fn();
    const off = onStatusChange(cb);
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("offline"));
    expect(cb).toHaveBeenCalled();
    off();
    cb.mockClear();
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("offline"));
    expect(cb).not.toHaveBeenCalled();
  });

  it("onStatusChange ignores non-function input", () => {
    const off = onStatusChange(/** @type {any} */ (null));
    expect(typeof off).toBe("function");
    expect(() => off()).not.toThrow();
  });

  it("listener errors do not break notification chain", () => {
    const good = vi.fn();
    onStatusChange(() => {
      throw new Error("boom");
    });
    onStatusChange(good);
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    window.dispatchEvent(new Event("online"));
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
    expect(good).toHaveBeenCalled();
  });
});
