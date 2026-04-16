/**
 * tests/unit/form-helpers.test.mjs — Unit tests for form-helpers utility
 * Covers: getVal · getFormValues · openAddModal
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getVal, getFormValues, openAddModal } from "../../src/utils/form-helpers.js";

// ── getVal ───────────────────────────────────────────────────────────────

describe("getVal", () => {
  beforeEach(() => {
    document.body.textContent = "";
  });

  it("returns empty string for non-existent element", () => {
    expect(getVal("does-not-exist")).toBe("");
  });

  it("returns trimmed value of text input", () => {
    const input = document.createElement("input");
    input.id = "testInput";
    input.value = "  hello world  ";
    document.body.appendChild(input);
    expect(getVal("testInput")).toBe("hello world");
  });

  it("returns 'true' for checked checkbox", () => {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = "testCheck";
    cb.checked = true;
    document.body.appendChild(cb);
    expect(getVal("testCheck")).toBe("true");
  });

  it("returns empty string for unchecked checkbox", () => {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = "testCheck2";
    cb.checked = false;
    document.body.appendChild(cb);
    expect(getVal("testCheck2")).toBe("");
  });

  it("returns empty string for empty input", () => {
    const input = document.createElement("input");
    input.id = "emptyInput";
    input.value = "";
    document.body.appendChild(input);
    expect(getVal("emptyInput")).toBe("");
  });
});

// ── getFormValues ────────────────────────────────────────────────────────

describe("getFormValues", () => {
  beforeEach(() => {
    document.body.textContent = "";
  });

  it("returns empty object for empty field map", () => {
    expect(getFormValues({})).toEqual({});
  });

  it("extracts multiple values from field map", () => {
    const fn = document.createElement("input");
    fn.id = "firstName";
    fn.value = "Dan";
    document.body.appendChild(fn);

    const ln = document.createElement("input");
    ln.id = "lastName";
    ln.value = "Cohen";
    document.body.appendChild(ln);

    const result = getFormValues({ first: "firstName", last: "lastName" });
    expect(result).toEqual({ first: "Dan", last: "Cohen" });
  });

  it("returns empty string for missing elements", () => {
    const result = getFormValues({ name: "missingEl" });
    expect(result).toEqual({ name: "" });
  });
});

// ── openAddModal ─────────────────────────────────────────────────────────

describe("openAddModal", () => {
  beforeEach(() => {
    document.body.textContent = "";
  });

  it("clears the hidden ID input", () => {
    const input = document.createElement("input");
    input.id = "guestModalId";
    input.value = "existing-123";
    document.body.appendChild(input);

    const title = document.createElement("h2");
    title.id = "guestModalTitle";
    document.body.appendChild(title);

    const opener = vi.fn();
    openAddModal("guestModal", "guestModalId", "guestModalTitle", "modal_add_guest", opener);
    expect(input.value).toBe("");
  });

  it("sets data-i18n attribute on title", () => {
    const input = document.createElement("input");
    input.id = "guestModalId";
    document.body.appendChild(input);

    const title = document.createElement("h2");
    title.id = "guestModalTitle";
    document.body.appendChild(title);

    const opener = vi.fn();
    openAddModal("guestModal", "guestModalId", "guestModalTitle", "modal_add_guest", opener);
    expect(title.getAttribute("data-i18n")).toBe("modal_add_guest");
  });

  it("calls the opener function with modal ID", () => {
    const input = document.createElement("input");
    input.id = "testId";
    document.body.appendChild(input);

    const title = document.createElement("h2");
    title.id = "testTitle";
    document.body.appendChild(title);

    const opener = vi.fn();
    openAddModal("myModal", "testId", "testTitle", "add_title", opener);
    expect(opener).toHaveBeenCalledWith("myModal");
  });
});
