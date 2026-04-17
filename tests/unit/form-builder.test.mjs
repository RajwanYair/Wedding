/**
 * tests/unit/form-builder.test.mjs — v7.5.0
 */

import { describe, it, expect } from "vitest";
import { createFormSchema, getRequiredFields, validateFormData } from "../../src/utils/form-builder.js";

describe("createFormSchema", () => {
  it("builds a schema with text fields", () => {
    const schema = createFormSchema()
      .text("firstName", "First Name", { required: true })
      .text("lastName",  "Last Name",  { required: true })
      .build();
    expect(schema).toHaveLength(2);
    expect(schema[0].name).toBe("firstName");
    expect(schema[0].type).toBe("text");
    expect(schema[0].required).toBe(true);
  });

  it("builds select field with options", () => {
    const opts = [{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }];
    const schema = createFormSchema().select("choice", "Choose", opts).build();
    expect(schema[0].options).toEqual(opts);
  });

  it("checkbox defaults to false", () => {
    const schema = createFormSchema().checkbox("vegetarian", "Vegetarian").build();
    expect(schema[0].default).toBe(false);
  });

  it("number field includes min/max when provided", () => {
    const schema = createFormSchema().number("age", "Age", { min: 1, max: 120 }).build();
    expect(schema[0].min).toBe(1);
    expect(schema[0].max).toBe(120);
  });

  it("phone field sets type to phone", () => {
    const schema = createFormSchema().phone("mobile", "Mobile").build();
    expect(schema[0].type).toBe("phone");
  });
});

describe("getRequiredFields", () => {
  it("returns only required field names", () => {
    const schema = createFormSchema()
      .text("a", "A", { required: true })
      .text("b", "B")
      .text("c", "C", { required: true })
      .build();
    expect(getRequiredFields(schema).sort()).toEqual(["a", "c"]);
  });
});

describe("validateFormData", () => {
  const schema = createFormSchema()
    .text("name", "Name", { required: true })
    .number("count", "Count", { min: 1, max: 10 })
    .select("meal", "Meal", [{ value: "veg", label: "Veg" }, { value: "meat", label: "Meat" }])
    .build();

  it("no errors for valid data", () => {
    expect(validateFormData({ name: "Alice", count: 5, meal: "veg" }, schema)).toHaveLength(0);
  });

  it("error when required field missing", () => {
    const errors = validateFormData({ name: "" }, schema);
    expect(errors.some((e) => e.includes("Name"))).toBe(true);
  });

  it("error when number below min", () => {
    const errors = validateFormData({ name: "Alice", count: 0 }, schema);
    expect(errors.some((e) => e.includes("at least 1"))).toBe(true);
  });

  it("error when number above max", () => {
    const errors = validateFormData({ name: "Alice", count: 99 }, schema);
    expect(errors.some((e) => e.includes("at most 10"))).toBe(true);
  });

  it("error for invalid select value", () => {
    const errors = validateFormData({ name: "Alice", meal: "fish" }, schema);
    expect(errors.some((e) => e.includes("Meal"))).toBe(true);
  });
});
