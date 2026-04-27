/**
 * @vitest-environment happy-dom
 *
 * tests/unit/dialog.test.mjs — S102 native <dialog> helpers.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  isDialogSupported,
  openDialog,
  closeDialog,
  toggleDialog,
} from "../../src/core/dialog.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("S102 — native <dialog> helpers", () => {
  it("isDialogSupported reflects HTMLDialogElement availability", () => {
    expect(typeof isDialogSupported()).toBe("boolean");
  });

  it("openDialog returns false for missing id", () => {
    expect(openDialog("nope")).toBe(false);
  });

  it("openDialog opens an existing <dialog>", () => {
    const d = document.createElement("dialog");
    d.id = "test-dlg";
    if (typeof d.showModal !== "function") {
      d.showModal = function showModal() {
        this.setAttribute("open", "");
      };
      d.close = function close() {
        this.removeAttribute("open");
      };
      Object.defineProperty(d, "open", {
        get() {
          return this.hasAttribute("open");
        },
      });
    }
    document.body.appendChild(d);
    expect(openDialog("test-dlg")).toBe(true);
    expect(d.open).toBe(true);
    expect(closeDialog("test-dlg")).toBe(true);
  });

  it("toggleDialog flips open state", () => {
    const d = document.createElement("dialog");
    d.id = "test-tog";
    if (typeof d.showModal !== "function") {
      d.showModal = function showModal() {
        this.setAttribute("open", "");
      };
      d.close = function close() {
        this.removeAttribute("open");
      };
      Object.defineProperty(d, "open", {
        get() {
          return this.hasAttribute("open");
        },
      });
    }
    document.body.appendChild(d);
    expect(toggleDialog("test-tog")).toBe(true);
    expect(toggleDialog("test-tog")).toBe(false);
  });
});
