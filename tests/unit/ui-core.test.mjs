/**
 * tests/unit/ui-core.test.mjs — S348: core/ui.js helpers
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Deps ──────────────────────────────────────────────────────────────────

vi.mock("../../src/core/i18n.js", () => ({ t: (k) => k, applyI18n: vi.fn() }));
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorage: vi.fn(() => null),
  writeBrowserStorage: vi.fn(),
  removeBrowserStorage: vi.fn(),
}));
vi.mock("../../src/core/constants.js", () => ({
  STORAGE_KEYS: {
    THEME: "wedding_v1_theme",
    LIGHT_MODE: "wedding_v1_light_mode",
  },
}));

import {
  showToast,
  closeModal,
  showConfirmDialog,
  cycleTheme,
  applyTheme,
  getActiveTheme,
  toggleLightMode,
  toggleMobileNav,
  restoreTheme,
  announce,
} from "../../src/core/ui.js";

beforeEach(() => {
  document.body.className = "";
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.className = "";
  vi.restoreAllMocks();
});

// ── showToast ─────────────────────────────────────────────────────────────

describe("showToast", () => {
  it("creates a toast element in the container", () => {
    showToast("Hello");
    const toast = document.querySelector(".toast");
    expect(toast).toBeTruthy();
    expect(toast?.querySelector(".toast-message")?.textContent).toBe("Hello");
  });

  it("applies error class for type=error", () => {
    showToast("Oops", "error");
    expect(document.querySelector(".toast-error")).toBeTruthy();
  });

  it("applies success class for type=success", () => {
    showToast("Done", "success");
    expect(document.querySelector(".toast-success")).toBeTruthy();
  });

  it("creates an accessible alert role for error toasts", () => {
    showToast("Fail", "error");
    expect(document.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("creates a status role for info toasts", () => {
    showToast("Info", "info");
    expect(document.querySelector('[role="status"]')).toBeTruthy();
  });

  it("creates multiple toasts when called multiple times", () => {
    const before = document.querySelectorAll(".toast").length;
    showToast("A");
    showToast("B");
    expect(document.querySelectorAll(".toast").length).toBe(before + 2);
  });
});

// ── closeModal ────────────────────────────────────────────────────────────

describe("closeModal", () => {
  it("hides a visible modal by id", () => {
    const modal = document.createElement("div");
    modal.id = "testModal";
    modal.hidden = false;
    document.body.appendChild(modal);

    closeModal("testModal");
    expect(modal.hidden).toBe(true);
    expect(modal.getAttribute("aria-hidden")).toBe("true");
  });

  it("does not throw for non-existent modal id", () => {
    expect(() => closeModal("nonexistent")).not.toThrow();
  });
});

// ── showConfirmDialog ─────────────────────────────────────────────────────

describe("showConfirmDialog", () => {
  it("returns true when user confirms", () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    const result = showConfirmDialog("Are you sure?");
    expect(result).toBe(true);
    vi.unstubAllGlobals();
  });

  it("returns false when user cancels", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const result = showConfirmDialog("Are you sure?");
    expect(result).toBe(false);
    vi.unstubAllGlobals();
  });

  it("calls onConfirm callback when confirmed", () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    const cb = vi.fn();
    showConfirmDialog("Sure?", cb);
    expect(cb).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("does not call onConfirm when cancelled", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const cb = vi.fn();
    showConfirmDialog("Sure?", cb);
    expect(cb).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

// ── applyTheme / getActiveTheme / cycleTheme ──────────────────────────────

describe("applyTheme + getActiveTheme", () => {
  it("applies a named theme class to body", () => {
    applyTheme("rosegold");
    expect(document.body.classList.contains("theme-rosegold")).toBe(true);
    expect(getActiveTheme()).toBe("rosegold");
  });

  it("removes old theme class when switching themes", () => {
    applyTheme("gold");
    applyTheme("emerald");
    expect(document.body.classList.contains("theme-gold")).toBe(false);
    expect(document.body.classList.contains("theme-emerald")).toBe(true);
  });

  it("applies default theme (no class) for unknown theme name", () => {
    applyTheme("nonexistent");
    expect(document.body.classList.contains("theme-nonexistent")).toBe(false);
    expect(getActiveTheme()).toBe("default");
  });
});

describe("cycleTheme", () => {
  it("advances to next theme without throwing", () => {
    expect(() => cycleTheme()).not.toThrow();
    expect(getActiveTheme()).not.toBeNull();
  });

  it("cycles back to first theme after last", () => {
    // Apply last theme in list
    applyTheme("high-contrast");
    cycleTheme(); // should wrap to default
    expect(getActiveTheme()).toBe("default");
  });
});

// ── toggleLightMode ───────────────────────────────────────────────────────

describe("toggleLightMode", () => {
  it("adds light-mode class when not present", () => {
    document.body.classList.remove("light-mode");
    toggleLightMode();
    expect(document.body.classList.contains("light-mode")).toBe(true);
  });

  it("removes light-mode class when present", () => {
    document.body.classList.add("light-mode");
    toggleLightMode();
    expect(document.body.classList.contains("light-mode")).toBe(false);
  });
});

// ── toggleMobileNav ───────────────────────────────────────────────────────

describe("toggleMobileNav", () => {
  it("adds nav-open class when not present", () => {
    document.body.classList.remove("nav-open");
    toggleMobileNav();
    expect(document.body.classList.contains("nav-open")).toBe(true);
  });

  it("removes nav-open class when present", () => {
    document.body.classList.add("nav-open");
    toggleMobileNav();
    expect(document.body.classList.contains("nav-open")).toBe(false);
  });
});

// ── restoreTheme ──────────────────────────────────────────────────────────

describe("restoreTheme", () => {
  it("does not throw when no stored theme", () => {
    expect(() => restoreTheme()).not.toThrow();
  });

  it("applies stored theme on restore", async () => {
    const { readBrowserStorage } = await import("../../src/core/storage.js");
    vi.mocked(readBrowserStorage).mockImplementation((key) => {
      if (String(key).includes("theme")) return "gold";
      return null;
    });
    restoreTheme();
    expect(document.body.classList.contains("theme-gold")).toBe(true);
  });
});

// ── announce ──────────────────────────────────────────────────────────────

describe("announce", () => {
  it("creates an aria-live region on first call", () => {
    announce("Test message");
    const region = document.getElementById("ariaLiveRegion");
    expect(region).toBeTruthy();
    expect(region?.getAttribute("aria-live")).toBe("polite");
  });

  it("uses assertive politeness when requested", () => {
    announce("Alert!", "assertive");
    const region = document.getElementById("ariaLiveRegion");
    expect(region?.getAttribute("aria-live")).toBe("assertive");
  });

  it("does not throw when called multiple times", () => {
    expect(() => {
      announce("First");
      announce("Second");
    }).not.toThrow();
  });
});
