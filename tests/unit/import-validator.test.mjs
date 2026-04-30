import { describe, it, expect } from "vitest";
import {
  validateRow,
  validateBatch,
} from "../../src/utils/import-validator.js";

describe("import-validator", () => {
  it("validateRow accepts minimal valid row", () => {
    const r = validateRow({ name: "Alice" }, 0);
    expect(r.ok).toBe(true);
    expect(r.normalised.name).toBe("Alice");
    expect(r.normalised.seats).toBe(1);
  });

  it("validateRow flags missing name", () => {
    const r = validateRow({}, 0);
    expect(r.ok).toBe(false);
    expect(r.errors.name).toBe("required");
  });

  it("validateRow trims name and rejects too-long", () => {
    const r = validateRow({ name: " ".repeat(2) + "x".repeat(125) }, 0);
    expect(r.errors.name).toBe("too-long");
  });

  it("validateRow validates phone format", () => {
    expect(validateRow({ name: "A", phone: "+972-54-123-4567" }, 0).ok).toBe(true);
    expect(validateRow({ name: "A", phone: "abc" }, 0).errors.phone).toBe("invalid");
  });

  it("validateRow validates email format", () => {
    expect(validateRow({ name: "A", email: "x@y.co" }, 0).ok).toBe(true);
    expect(validateRow({ name: "A", email: "bad@" }, 0).errors.email).toBe("invalid");
  });

  it("validateRow normalises numeric seats", () => {
    expect(validateRow({ name: "A", seats: "3" }, 0).normalised.seats).toBe(3);
  });

  it("validateRow rejects invalid seats", () => {
    expect(validateRow({ name: "A", seats: "0" }, 0).errors.seats).toBe("invalid");
    expect(validateRow({ name: "A", seats: "21" }, 0).errors.seats).toBe("invalid");
    expect(validateRow({ name: "A", seats: "x" }, 0).errors.seats).toBe("invalid");
  });

  it("validateRow normalises meal/side lowercase", () => {
    const r = validateRow({ name: "A", meal: "Vegan", side: "BRIDE" }, 0);
    expect(r.normalised.meal).toBe("vegan");
    expect(r.normalised.side).toBe("bride");
  });

  it("validateRow rejects unknown side", () => {
    expect(validateRow({ name: "A", side: "lemon" }, 0).errors.side).toBe("invalid");
  });

  it("validateRow optional fields omitted from normalised", () => {
    const r = validateRow({ name: "A" }, 0);
    expect(r.normalised.phone).toBeUndefined();
    expect(r.normalised.email).toBeUndefined();
  });

  it("validateBatch aggregates valid + invalid counts", () => {
    const out = validateBatch([
      { name: "A" },
      { name: "" },
      { name: "B", phone: "bad" },
    ]);
    expect(out.validCount).toBe(1);
    expect(out.invalidCount).toBe(2);
  });

  it("validateBatch tallies error fields", () => {
    const out = validateBatch([
      { name: "" },
      { name: "" },
      { name: "B", email: "bad@" },
    ]);
    expect(out.errorsByField.name).toBe(2);
    expect(out.errorsByField.email).toBe(1);
  });

  it("validateBatch preserves row indices", () => {
    const out = validateBatch([{ name: "A" }, { name: "" }]);
    expect(out.rows[1].index).toBe(1);
  });
});
