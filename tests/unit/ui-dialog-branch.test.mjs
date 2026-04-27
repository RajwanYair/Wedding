/**
 * @vitest-environment happy-dom
 *
 * tests/unit/ui-dialog-branch.test.mjs — S103/S105 verifies that openModal
 * detects native <dialog> elements and delegates to showModal/close.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("openModal/closeModal native <dialog> branch", () => {
  it("uses showModal/close on a <dialog> element", async () => {
    const d = document.createElement("dialog");
    d.id = "natdlg";
    let opened = false;
    let closed = false;
    // Force the native-dialog branch even on happy-dom which lacks showModal.
    /** @type {any} */ (d).showModal = () => {
      opened = true;
    };
    /** @type {any} */ (d).close = () => {
      closed = true;
    };
    Object.defineProperty(d, "open", {
      configurable: true,
      get() {
        return opened && !closed;
      },
    });
    document.body.appendChild(d);

    const ui = await import("../../src/core/ui.js");
    await ui.openModal("natdlg");
    expect(opened).toBe(true);

    ui.closeModal("natdlg");
    expect(closed).toBe(true);
  });

  it("falls back to legacy path for .modal-overlay div", async () => {
    const div = document.createElement("div");
    div.id = "legacydlg";
    div.className = "modal-overlay";
    div.hidden = true;
    document.body.appendChild(div);

    const ui = await import("../../src/core/ui.js");
    await ui.openModal("legacydlg");
    expect(div.hidden).toBe(false);
    expect(div.getAttribute("aria-modal")).toBe("true");

    ui.closeModal("legacydlg");
    expect(div.hidden).toBe(true);
    expect(div.getAttribute("aria-hidden")).toBe("true");
  });
});
