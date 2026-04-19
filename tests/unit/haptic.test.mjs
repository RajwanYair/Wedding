/**
 * tests/unit/haptic.test.mjs — Haptic feedback utility (S23)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isVibrationSupported, vibrate, cancelVibration, HAPTIC } from "../../src/utils/haptic.js";

let mockVibrate;

function installVibrate(returnVal = true) {
  mockVibrate = vi.fn().mockReturnValue(returnVal);
  Object.defineProperty(navigator, "vibrate", { configurable: true, writable: true, value: mockVibrate });
}

function uninstallVibrate() {
  Object.defineProperty(navigator, "vibrate", { configurable: true, writable: true, value: undefined });
}

describe("HAPTIC constants", () => {
  it("is a frozen object", () => { expect(Object.isFrozen(HAPTIC)).toBe(true); });
  it("SUCCESS is [50]", () => { expect(HAPTIC.SUCCESS).toEqual([50]); });
  it("ERROR has 5 entries", () => { expect(HAPTIC.ERROR).toHaveLength(5); });
  it("DOUBLE has 3 entries", () => { expect(HAPTIC.DOUBLE).toHaveLength(3); });
});

describe("isVibrationSupported()", () => {
  afterEach(uninstallVibrate);
  it("returns false when vibrate is absent", () => { uninstallVibrate(); expect(isVibrationSupported()).toBe(false); });
  it("returns true when vibrate is a function", () => { installVibrate(); expect(isVibrationSupported()).toBe(true); });
});

describe("vibrate() — with API", () => {
  beforeEach(() => installVibrate(true));
  afterEach(uninstallVibrate);
  it("calls navigator.vibrate with the pattern", () => { vibrate(HAPTIC.SUCCESS); expect(mockVibrate).toHaveBeenCalledWith(HAPTIC.SUCCESS); });
  it("returns true on success", () => { expect(vibrate([50])).toBe(true); });
  it("uses HAPTIC.SUCCESS as default", () => { vibrate(); expect(mockVibrate).toHaveBeenCalledWith(HAPTIC.SUCCESS); });
  it("returns false when navigator.vibrate returns false", () => { installVibrate(false); expect(vibrate([50])).toBe(false); });
  it("cancelVibration() calls vibrate(0)", () => { cancelVibration(); expect(mockVibrate).toHaveBeenCalledWith(0); });
});

describe("vibrate() — no API", () => {
  beforeEach(uninstallVibrate);
  afterEach(uninstallVibrate);
  it("returns false when absent", () => { expect(vibrate(HAPTIC.ERROR)).toBe(false); });
  it("cancelVibration() returns false", () => { expect(cancelVibration()).toBe(false); });
});
