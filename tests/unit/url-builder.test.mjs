import { describe, it, expect } from "vitest";
import { buildUrl } from "../../src/utils/url-builder.js";

describe("url-builder", () => {
  it("base only", () => {
    expect(buildUrl("https://x.test")).toBe("https://x.test");
  });

  it("strips trailing slashes from base", () => {
    expect(buildUrl("https://x.test/")).toBe("https://x.test");
    expect(buildUrl("https://x.test///")).toBe("https://x.test");
  });

  it("joins path array", () => {
    expect(buildUrl("https://x.test", { path: ["api", "v1", "users"] })).toBe(
      "https://x.test/api/v1/users",
    );
  });

  it("joins path string", () => {
    expect(buildUrl("https://x.test", { path: "/api/v1/users/" })).toBe(
      "https://x.test/api/v1/users",
    );
  });

  it("encodes path segments", () => {
    expect(buildUrl("https://x.test", { path: ["my doc", "a&b"] })).toBe(
      "https://x.test/my%20doc/a%26b",
    );
  });

  it("appends sorted query", () => {
    expect(
      buildUrl("https://x.test", { query: { b: 1, a: 2 } }),
    ).toBe("https://x.test?a=2&b=1");
  });

  it("skips null and undefined query values", () => {
    expect(
      buildUrl("https://x.test", { query: { a: 1, b: null, c: undefined } }),
    ).toBe("https://x.test?a=1");
  });

  it("expands array query values", () => {
    expect(
      buildUrl("https://x.test", { query: { tag: ["a", "b"] } }),
    ).toBe("https://x.test?tag=a&tag=b");
  });

  it("encodes special chars in query", () => {
    expect(
      buildUrl("https://x.test", { query: { q: "hello world&!" } }),
    ).toBe("https://x.test?q=hello%20world%26!");
  });

  it("Date values use ISO", () => {
    const url = buildUrl("https://x.test", {
      query: { since: new Date("2026-01-01T00:00:00Z") },
    });
    expect(url).toBe("https://x.test?since=2026-01-01T00%3A00%3A00.000Z");
  });

  it("appends hash", () => {
    expect(buildUrl("https://x.test", { hash: "section" })).toBe(
      "https://x.test#section",
    );
  });

  it("combines path + query + hash", () => {
    expect(
      buildUrl("https://x.test", {
        path: ["v1"],
        query: { a: 1 },
        hash: "top",
      }),
    ).toBe("https://x.test/v1?a=1#top");
  });

  it("empty query object yields no ?", () => {
    expect(buildUrl("https://x.test", { query: {} })).toBe("https://x.test");
  });
});
