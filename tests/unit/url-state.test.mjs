/**
 * tests/unit/url-state.test.mjs — URL filter state helpers (S392)
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getUrlParams, getUrlParam, setUrlParams } from "../../src/utils/url-state.js";

beforeEach(() => {
  history.replaceState(null, "", "/");
});

describe("getUrlParams", () => {
  it("returns empty object for no hash", () => {
    expect(getUrlParams()).toEqual({});
  });

  it("returns empty object for hash without query string", () => {
    history.replaceState(null, "", "#guests");
    expect(getUrlParams()).toEqual({});
  });

  it("parses query params from hash", () => {
    history.replaceState(null, "", "#guests?filter=confirmed&sort=lastName");
    expect(getUrlParams()).toEqual({ filter: "confirmed", sort: "lastName" });
  });
});

describe("getUrlParam", () => {
  it("returns default when param is absent", () => {
    history.replaceState(null, "", "#guests");
    expect(getUrlParam("filter", "all")).toBe("all");
  });

  it("returns the param value when present", () => {
    history.replaceState(null, "", "#guests?filter=confirmed");
    expect(getUrlParam("filter", "all")).toBe("confirmed");
  });
});

describe("setUrlParams", () => {
  it("adds params to the current hash", () => {
    history.replaceState(null, "", "#guests");
    setUrlParams({ filter: "confirmed" });
    expect(location.hash).toBe("#guests?filter=confirmed");
  });

  it("removes a param when value matches default", () => {
    history.replaceState(null, "", "#guests?filter=all");
    setUrlParams({ filter: "all" }, { filter: "all" });
    expect(location.hash).toBe("#guests");
  });

  it("removes a param when value is empty", () => {
    history.replaceState(null, "", "#guests?q=Cohen");
    setUrlParams({ q: "" });
    expect(location.hash).toBe("#guests");
  });

  it("merges multiple params", () => {
    history.replaceState(null, "", "#guests");
    setUrlParams({ filter: "confirmed", sort: "firstName" });
    const params = getUrlParams();
    expect(params.filter).toBe("confirmed");
    expect(params.sort).toBe("firstName");
  });
});
