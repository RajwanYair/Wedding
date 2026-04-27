/**
 * @vitest-environment happy-dom
 *
 * tests/unit/checkin-kiosk.test.mjs — S107 kiosk mode toggle.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  document.body.className = "";
  document.body.removeAttribute("data-kiosk");
});

vi.mock("../../src/utils/orientation.js", () => ({
  lockOrientation: vi.fn(async () => {}),
  unlockOrientation: vi.fn(() => {}),
}));

vi.mock("../../src/core/ui.js", () => ({
  announce: vi.fn(),
}));

describe("S107 — kiosk mode", () => {
  it("setKioskMode(true) adds kiosk-mode class + data attribute", async () => {
    const m = await import("../../src/sections/checkin.js");
    const next = m.setKioskMode(true);
    expect(next).toBe(true);
    expect(document.body.classList.contains("kiosk-mode")).toBe(true);
    expect(document.body.getAttribute("data-kiosk")).toBe("on");
    expect(m.isKioskMode()).toBe(true);
  });

  it("setKioskMode() toggles when called without arg", async () => {
    const m = await import("../../src/sections/checkin.js");
    expect(m.setKioskMode()).toBe(true);
    expect(m.setKioskMode()).toBe(false);
    expect(document.body.getAttribute("data-kiosk")).toBe("off");
    expect(m.isKioskMode()).toBe(false);
  });

  it("setKioskMode(false) removes class even when not present", async () => {
    const m = await import("../../src/sections/checkin.js");
    expect(m.setKioskMode(false)).toBe(false);
    expect(document.body.classList.contains("kiosk-mode")).toBe(false);
  });
});
