/**
 * tests/unit/route-table.test.mjs — typed router helpers
 */

import { describe, it, expect } from "vitest";
import {
  parseLocation,
  buildHref,
  isKnownSection,
  isPublicSection,
  getRouteParam,
} from "../../src/core/route-table.js";

describe("isKnownSection", () => {
  it("accepts core sections", () => {
    expect(isKnownSection("dashboard")).toBe(true);
    expect(isKnownSection("guests")).toBe(true);
  });
  it("accepts extra sections", () => {
    expect(isKnownSection("vendors")).toBe(true);
  });
  it("rejects unknown / non-strings", () => {
    expect(isKnownSection("nope")).toBe(false);
    expect(isKnownSection(undefined)).toBe(false);
    expect(isKnownSection(42)).toBe(false);
  });
});

describe("isPublicSection", () => {
  it("flags rsvp + landing as public", () => {
    expect(isPublicSection("rsvp")).toBe(true);
    expect(isPublicSection("landing")).toBe(true);
  });
  it("rejects admin sections", () => {
    expect(isPublicSection("guests")).toBe(false);
  });
});

describe("parseLocation", () => {
  it("parses simple hash", () => {
    expect(parseLocation({ hash: "#guests", search: "" }))
      .toEqual({ section: "guests", params: {} });
  });
  it("parses hash with query suffix", () => {
    const r = parseLocation({ hash: "#guests?id=g_1&q=alice", search: "" });
    expect(r.section).toBe("guests");
    expect(r.params).toEqual({ id: "g_1", q: "alice" });
  });
  it("parses pushState-style search + hash", () => {
    const r = parseLocation({ hash: "#tables", search: "?cap=12" });
    expect(r).toEqual({ section: "tables", params: { cap: "12" } });
  });
  it("falls back to dashboard for unknown section", () => {
    expect(parseLocation({ hash: "#bogus", search: "" }).section).toBe("dashboard");
  });
  it("decodes URL components", () => {
    const r = parseLocation({ hash: "#guests?name=%D7%A8%D7%9F", search: "" });
    expect(r.params.name).toBe("רן");
  });
});

describe("buildHref", () => {
  it("renders bare section", () => {
    expect(buildHref({ section: "tables" })).toBe("#tables");
  });
  it("encodes params", () => {
    expect(buildHref({ section: "rsvp", params: { token: "abc=xyz" } }))
      .toBe("#rsvp?token=abc%3Dxyz");
  });
  it("skips empty / null / undefined values", () => {
    const href = buildHref({ section: "tables", params: { a: "", b: null, c: undefined, d: "x" } });
    expect(href).toBe("#tables?d=x");
  });
  it("falls back to dashboard for unknown section", () => {
    expect(buildHref({ section: "nope" })).toBe("#dashboard");
  });
});

describe("getRouteParam", () => {
  it("returns single param", () => {
    expect(getRouteParam("id", { hash: "#guests?id=g_42", search: "" })).toBe("g_42");
  });
  it("returns null when missing", () => {
    expect(getRouteParam("id", { hash: "#guests", search: "" })).toBeNull();
  });
});
