/**
 * tests/unit/ui.test.mjs — S363: core/ui.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────

const _browserStorage = new Map();

vi.mock("../../src/core/constants.js", () => ({
  STORAGE_KEYS: {
    THEME: "theme",
    LIGHT_MODE: "light_mode",
  },
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: vi.fn((k) => k),
  applyI18n: vi.fn(),
}));

vi.mock("../../src/core/storage.js", () => {
  const storage = new Map();
  return {
    readBrowserStorage: vi.fn((key, def) => storage.get(key) ?? def ?? null),
    writeBrowserStorage: vi.fn((key, val) => storage.set(key, val)),
    removeBrowserStorage: vi.fn((key) => storage.delete(key)),
    _storage: storage,
  };
});

import * as storageMod from "../../src/core/storage.js";
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
  /** @type {any} */ (storageMod)._storage?.clear();
  vi.clearAllMocks();
  document.body.className = "";
  // Don't clear innerHTML — ui.js caches DOM refs at module level
});

// ── showToast ──────────────────────────────────────────────────────────────

describe("showToast", () => {
  it("creates a toast element in the container", () => {
    showToast("Hello toast");
    const container = document.getElementById("toastContainer");
    expect(container).toBeTruthy();
    expect(container.querySelectorAll(".toast").length).toBeGreaterThan(0);
  });

  it("sets correct role for error toast", () => {
    showToast("Error!", "error");
    const toast = document.querySelector(".toast-error");
    expect(toast?.getAttribute("role")).toBe("alert");
  });

  it("sets correct role for info toast", () => {
    showToast("Info", "info");
    const toast = document.querySelector(".toast-info");
    expect(toast?.getAttribute("role")).toBe("status");
  });

  it("uses textContent for message (XSS safe)", () => {
    const xss = "<script>xss<\/script>";
    showToast(xss);
    const msgs = document.querySelectorAll(".toast-message");
    const last = msgs[msgs.length - 1];
    expect(last?.textContent).toBe(xss);
    expect(last?.innerHTML).not.toContain("<script>");
  });
});

// ── closeModal ─────────────────────────────────────────────────────────────

describe("closeModal", () => {
  it("hides a legacy modal-overlay div", () => {
    const modal = document.createElement("div");
    modal.id = "guestModal";
    document.body.appendChild(modal);
    modal.hidden = false;
    closeModal("guestModal");
    expect(modal.hidden).toBe(true);
  });

  it("is a no-op for nonexistent modal id", () => {
    expect(() => closeModal("nonExistentModal999")).not.toThrow();
  });
});

// ── showConfirmDialog ──────────────────────────────────────────────────────

describe("showConfirmDialog", () => {
  it("returns true and calls callback when confirmed", () => {
    window.confirm = vi.fn(() => true);
    const cb = vi.fn();
    const result = showConfirmDialog("Are you sure?", cb);
    expect(result).toBe(true);
    expect(cb).toHaveBeenCalled();
  });

  it("returns false and does not call callback when denied", () => {
    window.confirm = vi.fn(() => false);
    const cb = vi.fn();
    const result = showConfirmDialog("Are you sure?", cb);
    expect(result).toBe(false);
    expect(cb).not.toHaveBeenCalled();
  });
});

// ── cycleTheme ─────────────────────────────────────────────────────────────

describe("cycleTheme", () => {
  it("cycles through themes and writes to storage", () => {
    cycleTheme();
    expect(storageMod.writeBrowserStorage).toHaveBeenCalled();
  });

  it("adds theme class to body", () => {
    document.body.className = "";
    cycleTheme(); // first cycle → next theme
    expect(document.body.className).toMatch(/theme-/);
  });
});

// ── applyTheme ─────────────────────────────────────────────────────────────

describe("applyTheme", () => {
  it("applies a known theme class to body", () => {
    applyTheme("gold");
    expect(document.body.classList.contains("theme-gold")).toBe(true);
  });

  it("removes theme class for default theme", () => {
    document.body.classList.add("theme-gold");
    applyTheme("default");
    expect(document.body.classList.contains("theme-gold")).toBe(false);
  });

  it("falls back to default for unknown theme", () => {
    applyTheme("nonexistent");
    expect(document.body.className).not.toMatch(/theme-nonexistent/);
  });
});

// ── getActiveTheme ─────────────────────────────────────────────────────────

describe("getActiveTheme", () => {
  it("returns a string", () => {
    expect(typeof getActiveTheme()).toBe("string");
  });

  it("returns applied theme after applyTheme", () => {
    applyTheme("emerald");
    expect(getActiveTheme()).toBe("emerald");
  });
});

// ── toggleLightMode ────────────────────────────────────────────────────────

describe("toggleLightMode", () => {
  it("adds light-mode class on first toggle", () => {
    document.body.classList.remove("light-mode");
    toggleLightMode();
    expect(document.body.classList.contains("light-mode")).toBe(true);
  });

  it("removes light-mode class on second toggle", () => {
    document.body.classList.remove("light-mode");
    toggleLightMode();
    toggleLightMode();
    expect(document.body.classList.contains("light-mode")).toBe(false);
  });
});

// ── toggleMobileNav ────────────────────────────────────────────────────────

describe("toggleMobileNav", () => {
  it("adds nav-open class", () => {
    document.body.classList.remove("nav-open");
    toggleMobileNav();
    expect(document.body.classList.contains("nav-open")).toBe(true);
  });

  it("removes nav-open on second toggle", () => {
    document.body.classList.remove("nav-open");
    toggleMobileNav();
    toggleMobileNav();
    expect(document.body.classList.contains("nav-open")).toBe(false);
  });
});

// ── restoreTheme ───────────────────────────────────────────────────────────

describe("restoreTheme", () => {
  it("restores saved theme class", () => {
    storageMod.readBrowserStorage.mockImplementation((key, def) => {
      if (key === "theme") return "royal";
      return def ?? null;
    });
    restoreTheme();
    expect(document.body.classList.contains("theme-royal")).toBe(true);
  });

  it("applies light-mode when saved as true", () => {
    storageMod.readBrowserStorage.mockImplementation((key, def) => {
      if (key === "theme") return "default";
      if (key === "light_mode") return "true";
      return def ?? null;
    });
    restoreTheme();
    expect(document.body.classList.contains("light-mode")).toBe(true);
  });
});

// ── announce ───────────────────────────────────────────────────────────────

describe("announce", () => {
  it("creates aria-live region on first call", () => {
    announce("Screen reader message");
    const region = document.getElementById("ariaLiveRegion");
    expect(region).toBeTruthy();
    expect(region?.getAttribute("aria-live")).toBe("polite");
  });

  it("uses assertive for error-level announcements", () => {
    announce("Critical error!", "assertive");
    const region = document.getElementById("ariaLiveRegion");
    expect(region?.getAttribute("aria-live")).toBe("assertive");
  });
});
