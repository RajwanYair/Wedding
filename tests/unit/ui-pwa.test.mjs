/**
 * tests/unit/ui-pwa.test.mjs — Translation coverage for PWA banners
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/core/i18n.js", () => ({
  t: (key) => key,
}));

let _store = {};
vi.stubGlobal("localStorage", {
  getItem: (key) => (_store[key] ?? null),
  setItem: (key, value) => {
    _store[key] = String(value);
  },
  removeItem: (key) => {
    delete _store[key];
  },
});

const matchMedia = vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: matchMedia,
});

const { initInstallPrompt, showUpdateBanner } = await import("../../src/core/ui.js");

beforeEach(() => {
  _store = {};
  document.body.innerHTML = "";
  vi.useRealTimers();
  matchMedia.mockClear();
});

describe("PWA banner translations", () => {
  it("uses translated aria label for the update dismiss control", () => {
    showUpdateBanner();
    expect(document.querySelector(".update-banner-dismiss")?.getAttribute("aria-label")).toBe("sw_update_dismiss_aria");
  });

  it("uses translated aria label for the install dismiss control", async () => {
    vi.useFakeTimers();
    initInstallPrompt();

    const deferredPrompt = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    };
    const event = new Event("beforeinstallprompt");
    event.preventDefault = vi.fn();
    Object.assign(event, deferredPrompt);

    window.dispatchEvent(event);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(document.querySelector(".install-banner-dismiss")?.getAttribute("aria-label")).toBe("install_banner_dismiss_aria");
  });
});