import { describe, it, expect } from "vitest";
import {
  pluralizeHe,
  formatHeCount,
  pluralizeEn,
} from "../../src/utils/pluralize-he.js";

const FORMS = {
  zero: "אורחים",
  one: "אורח",
  two: "אורחים",
  many: "אורחים",
};

describe("pluralize-he", () => {
  it("returns zero form for 0", () => {
    expect(pluralizeHe(0, FORMS)).toBe("אורחים");
  });

  it("returns one form for 1", () => {
    expect(pluralizeHe(1, FORMS)).toBe("אורח");
  });

  it("returns dual form for 2", () => {
    expect(pluralizeHe(2, FORMS)).toBe("אורחים");
  });

  it("returns many form for 3+", () => {
    expect(pluralizeHe(3, FORMS)).toBe("אורחים");
    expect(pluralizeHe(100, FORMS)).toBe("אורחים");
  });

  it("treats negative numbers by absolute value", () => {
    expect(pluralizeHe(-1, FORMS)).toBe("אורח");
  });

  it("rejects missing forms", () => {
    expect(() => pluralizeHe(1, /** @type {any} */ (null))).toThrow();
    expect(() =>
      pluralizeHe(1, /** @type {any} */ ({ zero: "x", one: "y", two: "z" })),
    ).toThrow();
  });

  it("non-finite n falls back to many", () => {
    expect(pluralizeHe(Number.NaN, FORMS)).toBe("אורחים");
  });

  it("formatHeCount for 0", () => {
    expect(formatHeCount(0, FORMS)).toBe("אין אורחים");
  });

  it("formatHeCount for 1", () => {
    expect(formatHeCount(1, FORMS)).toBe("אורח אחד");
  });

  it("formatHeCount for 2 uses 'שני'", () => {
    expect(formatHeCount(2, FORMS)).toBe("שני אורחים");
  });

  it("formatHeCount for many", () => {
    expect(formatHeCount(7, FORMS)).toBe("7 אורחים");
  });

  it("pluralizeEn singular vs plural", () => {
    expect(pluralizeEn(1, "guest")).toBe("guest");
    expect(pluralizeEn(2, "guest")).toBe("guests");
  });

  it("pluralizeEn supports custom plural", () => {
    expect(pluralizeEn(2, "child", "children")).toBe("children");
  });

  it("pluralizeEn rejects bad input", () => {
    expect(() => pluralizeEn(1, /** @type {any} */ (null))).toThrow();
  });
});
