/**
 * tests/unit/icu-format.test.mjs — S118 ICU MessageFormat subset.
 */
import { describe, it, expect } from "vitest";
import { formatMessage } from "../../src/utils/icu-format.js";

describe("S118 — formatMessage", () => {
  it("plain interpolation", () => {
    expect(formatMessage("Hello {name}!", { name: "Yair" })).toBe("Hello Yair!");
  });

  it("missing variable yields empty", () => {
    expect(formatMessage("X {a} Y", {})).toBe("X  Y");
  });

  it("plural en — one vs other with # placeholder", () => {
    const p = "{n, plural, one{# guest} other{# guests}}";
    expect(formatMessage(p, { n: 1 }, "en")).toBe("1 guest");
    expect(formatMessage(p, { n: 5 }, "en")).toBe("5 guests");
  });

  it("plural exact =0 wins over category", () => {
    const p = "{n, plural, =0{No guests} one{# guest} other{# guests}}";
    expect(formatMessage(p, { n: 0 }, "en")).toBe("No guests");
  });

  it("plural ar — supports zero / two / few / many", () => {
    const p = "{n, plural, zero{لا ضيوف} one{ضيف واحد} two{ضيفان} few{# ضيوف} many{# ضيفًا} other{# ضيف}}";
    expect(formatMessage(p, { n: 0 }, "ar")).toBe("لا ضيوف");
    expect(formatMessage(p, { n: 1 }, "ar")).toBe("ضيف واحد");
    expect(formatMessage(p, { n: 2 }, "ar")).toBe("ضيفان");
    expect(formatMessage(p, { n: 5 }, "ar")).toBe("5 ضيوف");
  });

  it("plural he — uses one/two/many/other categories", () => {
    const p = "{n, plural, one{אורח אחד} two{שני אורחים} many{# אורחים} other{# אורחים}}";
    // Hebrew plural: 1 = one, 2 = two, others = other (or many in some libs)
    expect(formatMessage(p, { n: 1 }, "he")).toBe("אורח אחד");
    expect(formatMessage(p, { n: 2 }, "he")).toBe("שני אורחים");
    expect(formatMessage(p, { n: 7 }, "he")).toMatch(/7 אורחים/);
  });

  it("select gender", () => {
    const p = "{g, select, female{מאשרת} male{מאשר} other{מאשר/ת}}";
    expect(formatMessage(p, { g: "female" }, "he")).toBe("מאשרת");
    expect(formatMessage(p, { g: "male" }, "he")).toBe("מאשר");
    expect(formatMessage(p, { g: "x" }, "he")).toBe("מאשר/ת");
  });

  it("nested plural inside select", () => {
    const p = "{g, select, female{{n, plural, one{אישה אחת} other{# נשים}}} other{{n, plural, one{גבר אחד} other{# גברים}}}}";
    expect(formatMessage(p, { g: "female", n: 3 }, "he")).toBe("3 נשים");
    expect(formatMessage(p, { g: "male", n: 1 }, "he")).toBe("גבר אחד");
  });

  it("returns empty for empty pattern", () => {
    expect(formatMessage("", {})).toBe("");
  });

  it("unmatched brace tolerated (passthrough)", () => {
    expect(formatMessage("hello {oops", {})).toBe("hello {oops");
  });
});
