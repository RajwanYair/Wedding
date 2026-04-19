/**
 * tests/unit/orientation.test.mjs — Orientation lock utility (S23g)
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { isOrientationLockSupported, lockOrientation, unlockOrientation } from "../../src/utils/orientation.js";

// In happy-dom, screen may not exist; use globalThis.screen throughout
const origScreen = globalThis.screen;

function installOrientation(lockFn = vi.fn().mockResolvedValue(undefined), unlockFn = vi.fn()) {
  globalThis.screen = { orientation: { lock: lockFn, unlock: unlockFn } };
}

function uninstallOrientation() {
  globalThis.screen = origScreen;
}

describe("isOrientationLockSupported()", () => {
  afterEach(uninstallOrientation);
  it("returns false when screen is absent", () => {
    globalThis.screen = null;
    expect(isOrientationLockSupported()).toBe(false);
  });
  it("returns false when orientation.lock is not a function", () => {
    globalThis.screen = { orientation: { lock: undefined, unlock: vi.fn() } };
    expect(isOrientationLockSupported()).toBe(false);
  });
  it("returns true when orientation.lock is a function", () => {
    installOrientation();
    expect(isOrientationLockSupported()).toBe(true);
  });
});

describe("lockOrientation()", () => {
  afterEach(uninstallOrientation);
  it("returns false when not supported", async () => {
    globalThis.screen = null;
    expect(await lockOrientation()).toBe(false);
  });
  it("calls orientation.lock with portrait by default", async () => {
    const lockFn = vi.fn().mockResolvedValue(undefined);
    installOrientation(lockFn);
    expect(await lockOrientation()).toBe(true);
    expect(lockFn).toHaveBeenCalledWith("portrait");
  });
  it("passes a custom orientation type", async () => {
    const lockFn = vi.fn().mockResolvedValue(undefined);
    installOrientation(lockFn);
    await lockOrientation("landscape");
    expect(lockFn).toHaveBeenCalledWith("landscape");
  });
  it("returns false on lock error", async () => {
    installOrientation(vi.fn().mockRejectedValue(new DOMException("Not supported", "NotSupportedError")));
    expect(await lockOrientation()).toBe(false);
  });
});

describe("unlockOrientation()", () => {
  afterEach(uninstallOrientation);
  it("returns false when not supported", () => {
    globalThis.screen = null;
    expect(unlockOrientation()).toBe(false);
  });
  it("calls orientation.unlock and returns true", () => {
    const unlockFn = vi.fn();
    installOrientation(vi.fn().mockResolvedValue(undefined), unlockFn);
    expect(unlockOrientation()).toBe(true);
    expect(unlockFn).toHaveBeenCalledOnce();
  });
});