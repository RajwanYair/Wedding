/**
 * tests/unit/form-validator.test.mjs
 *
 * Unit tests for src/utils/form-validator.js
 * Tests: validateForm (required, minLength, maxLength, pattern),
 *        clearFormErrors, setFieldError, aria-invalid/aria-describedby,
 *        error message insertion + removal.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from "vitest";
import { validateForm, clearFormErrors, setFieldError } from "../../src/utils/form-validator.js";

// ── Tests ─────────────────────────────────────────────────────────────────
describe("form-validator — validateForm required", () => {
  it("returns valid:true when all required fields are filled", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "phone";
    input.value = "0541234567";
    form.appendChild(input);
    document.body.appendChild(form);

    const result = validateForm(form, { phone: { required: true } });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    form.remove();
  });

  it("returns error when required field is empty", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "phone";
    input.value = "";
    form.appendChild(input);
    document.body.appendChild(form);

    const result = validateForm(form, { phone: { required: true, label: "Phone" } });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("phone");
    expect(result.errors[0].message).toContain("Phone");
    form.remove();
  });

  it("uses custom message when provided", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "name";
    input.value = "";
    form.appendChild(input);
    document.body.appendChild(form);

    const result = validateForm(form, { name: { required: true, message: "Custom error msg" } });
    expect(result.errors[0].message).toBe("Custom error msg");
    form.remove();
  });
});

describe("form-validator — validateForm minLength/maxLength/pattern", () => {
  it("errors when value is shorter than minLength", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "phone";
    input.value = "123";
    form.appendChild(input);
    document.body.appendChild(form);

    const result = validateForm(form, { phone: { minLength: 9 } });
    expect(result.valid).toBe(false);
    form.remove();
  });

  it("errors when value exceeds maxLength", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "notes";
    input.value = "a".repeat(101);
    form.appendChild(input);
    document.body.appendChild(form);

    const result = validateForm(form, { notes: { maxLength: 100 } });
    expect(result.valid).toBe(false);
    form.remove();
  });

  it("passes maxLength when value is within limit", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "notes";
    input.value = "Hello";
    form.appendChild(input);
    document.body.appendChild(form);

    const result = validateForm(form, { notes: { maxLength: 100 } });
    expect(result.valid).toBe(true);
    form.remove();
  });

  it("errors when value does not match pattern", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "email";
    input.value = "not-an-email";
    form.appendChild(input);
    document.body.appendChild(form);

    const result = validateForm(form, { email: { pattern: /^[^@]+@[^@]+\.[^@]+$/ } });
    expect(result.valid).toBe(false);
    form.remove();
  });

  it("passes pattern with empty value (pattern is not required)", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "email";
    input.value = "";
    form.appendChild(input);
    document.body.appendChild(form);

    // No required flag; empty value skips pattern check
    const result = validateForm(form, { email: { pattern: /^[^@]+@[^@]+\.[^@]+$/ } });
    expect(result.valid).toBe(true);
    form.remove();
  });
});

describe("form-validator — ARIA attributes", () => {
  it("sets aria-invalid=true on invalid field", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "phone";
    input.value = "";
    form.appendChild(input);
    document.body.appendChild(form);

    validateForm(form, { phone: { required: true } });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    form.remove();
  });

  it("sets aria-invalid=false on valid field", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "phone";
    input.value = "0541234567";
    form.appendChild(input);
    document.body.appendChild(form);

    validateForm(form, { phone: { required: true } });
    expect(input.getAttribute("aria-invalid")).toBe("false");
    form.remove();
  });

  it("creates error element with role=alert and links via aria-describedby", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "firstName";
    input.value = "";
    form.appendChild(input);
    document.body.appendChild(form);

    validateForm(form, { firstName: { required: true, label: "First name" } });
    const errId = input.getAttribute("aria-describedby");
    expect(errId).toBeTruthy();
    const errEl = document.getElementById(/** @type {string} */ (errId));
    expect(errEl).not.toBeNull();
    expect(errEl?.getAttribute("role")).toBe("alert");
    expect(errEl?.textContent).toContain("First name");
    form.remove();
  });
});

describe("form-validator — clearFormErrors", () => {
  it("removes aria-invalid and error elements", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "phone";
    input.value = "";
    form.appendChild(input);
    document.body.appendChild(form);

    validateForm(form, { phone: { required: true } });
    expect(input.getAttribute("aria-invalid")).toBe("true");

    clearFormErrors(form);
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(form.querySelector(".form-field-error")).toBeNull();
    form.remove();
  });
});

describe("form-validator — setFieldError", () => {
  it("marks a field with a server-supplied error message", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "email";
    input.value = "test@example.com";
    form.appendChild(input);
    document.body.appendChild(form);

    setFieldError(form, "email", "Email already in use");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const errId = input.getAttribute("aria-describedby");
    const errEl = errId ? document.getElementById(errId) : null;
    expect(errEl?.textContent).toBe("Email already in use");
    form.remove();
  });

  it("does nothing if the field is not found", () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    // Should not throw
    expect(() => setFieldError(form, "nonexistent", "error")).not.toThrow();
    form.remove();
  });
});

describe("form-validator — multiple fields", () => {
  it("reports errors for multiple invalid fields", () => {
    const form = document.createElement("form");
    ["firstName", "phone"].forEach((name) => {
      const input = document.createElement("input");
      input.name = name;
      input.value = "";
      form.appendChild(input);
    });
    document.body.appendChild(form);

    const result = validateForm(form, {
      firstName: { required: true, label: "First name" },
      phone: { required: true, label: "Phone" },
    });
    expect(result.errors).toHaveLength(2);
    expect(result.errors.map((e) => e.field)).toContain("firstName");
    expect(result.errors.map((e) => e.field)).toContain("phone");
    form.remove();
  });

  it("returns fieldEl reference for the invalid input", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "phone";
    input.value = "";
    form.appendChild(input);
    document.body.appendChild(form);

    const result = validateForm(form, { phone: { required: true } });
    expect(result.errors[0].fieldEl).toBe(input);
    form.remove();
  });
});
