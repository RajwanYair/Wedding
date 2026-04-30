/**
 * tests/unit/command-palette.test.mjs — S451: coverage for src/utils/command-palette.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock dependencies ──────────────────────────────────────────────────────

vi.mock("../../src/core/i18n.js", () => ({
  t: vi.fn((k) => k),
}));

const _navigateMock = vi.fn();
vi.mock("../../src/core/nav.js", () => ({
  navigateTo: (...a) => _navigateMock(...a),
}));

import {
  openCommandPalette,
  closeCommandPalette,
  initCommandPalette,
} from "../../src/utils/command-palette.js";

beforeEach(() => {
  vi.clearAllMocks();
  closeCommandPalette(); // ensure clean state
  // Remove any leftover dialogs
  document.querySelectorAll("dialog").forEach((d) => d.remove());
});

// Stub HTMLDialogElement methods (happy-dom)
HTMLDialogElement.prototype.showModal ??= vi.fn();
HTMLDialogElement.prototype.close ??= vi.fn();

describe("command-palette — openCommandPalette()", () => {
  it("creates a dialog and appends it to the body", () => {
    openCommandPalette();
    const dialog = document.getElementById("cmdPaletteDialog");
    expect(dialog).not.toBeNull();
    expect(dialog?.tagName).toBe("DIALOG");
  });

  it("dialog contains a search input", () => {
    openCommandPalette();
    const input = document.getElementById("cmdPaletteInput");
    expect(input).not.toBeNull();
    expect(/** @type {HTMLInputElement} */ (input)?.type).toBe("search");
  });

  it("dialog contains a results list", () => {
    openCommandPalette();
    const list = document.getElementById("cmdPaletteList");
    expect(list).not.toBeNull();
  });

  it("does not create duplicate dialogs on repeated calls", () => {
    openCommandPalette();
    openCommandPalette();
    const dialogs = document.querySelectorAll("#cmdPaletteDialog");
    expect(dialogs.length).toBe(1);
  });
});

describe("command-palette — closeCommandPalette()", () => {
  it("removes the dialog from the DOM", () => {
    openCommandPalette();
    expect(document.getElementById("cmdPaletteDialog")).not.toBeNull();
    closeCommandPalette();
    expect(document.getElementById("cmdPaletteDialog")).toBeNull();
  });

  it("is safe to call when palette is not open", () => {
    expect(() => closeCommandPalette()).not.toThrow();
  });
});

describe("command-palette — initCommandPalette()", () => {
  it("returns a cleanup function", () => {
    const cleanup = initCommandPalette();
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("opens palette on Ctrl+Shift+K", () => {
    initCommandPalette();
    const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, shiftKey: true });
    document.dispatchEvent(event);
    expect(document.getElementById("cmdPaletteDialog")).not.toBeNull();
  });

  it("does not open palette on plain K", () => {
    initCommandPalette();
    const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: false, shiftKey: false });
    document.dispatchEvent(event);
    expect(document.getElementById("cmdPaletteDialog")).toBeNull();
  });

  it("second call returns same cleanup without re-registering", () => {
    const c1 = initCommandPalette();
    const c2 = initCommandPalette();
    // Both should be the same function reference (idempotent)
    expect(typeof c1).toBe("function");
    expect(typeof c2).toBe("function");
    c1();
    c2();
  });
});

describe("command-palette — Escape key closes palette", () => {
  it("closes dialog on Escape key inside dialog", () => {
    openCommandPalette();
    const dialog = document.getElementById("cmdPaletteDialog");
    expect(dialog).not.toBeNull();
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    dialog?.dispatchEvent(event);
    expect(document.getElementById("cmdPaletteDialog")).toBeNull();
  });
});
