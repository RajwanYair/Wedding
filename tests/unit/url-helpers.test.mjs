/**
 * tests/unit/url-helpers.test.mjs — Sprint 158
 */

import { describe, it, expect } from "vitest";
import {
  buildWhatsAppUrl,
  buildMapsUrl,
  buildWazeUrl,
  appendQueryParams,
  parseQueryParams,
  buildMailtoUrl,
  isSafeUrl,
} from "../../src/utils/url-helpers.js";

describe("buildWhatsAppUrl", () => {
  it("builds basic wa.me link without message", () => {
    expect(buildWhatsAppUrl("972541234567")).toBe("https://wa.me/972541234567");
  });

  it("appends encoded message when provided", () => {
    const url = buildWhatsAppUrl("972541234567", "Hello World");
    expect(url).toContain("text=Hello%20World");
  });

  it("strips non-digit characters from phone", () => {
    expect(buildWhatsAppUrl("+972-54-123-4567")).toBe("https://wa.me/972541234567");
  });

  it("returns link with text= param for non-empty message", () => {
    expect(buildWhatsAppUrl("1234567890", "אהלן")).toMatch(/text=/);
  });
});

describe("buildMapsUrl", () => {
  it("builds a google maps URL", () => {
    const url = buildMapsUrl("Tel Aviv, Israel");
    expect(url).toContain("maps.google.com");
    expect(url).toContain("Tel%20Aviv");
  });

  it("encodes special characters", () => {
    const url = buildMapsUrl("קיבוץ גלויות 1, תל אביב");
    expect(url).toContain("maps.google.com");
    expect(url).toMatch(/maps\?q=/);
  });
});

describe("buildWazeUrl", () => {
  it("builds a Waze URL", () => {
    const url = buildWazeUrl("Jerusalem Convention Center");
    expect(url).toContain("waze.com");
    expect(url).toContain("navigate=yes");
  });

  it("encodes the address", () => {
    expect(buildWazeUrl("Tel Aviv")).toContain("Tel%20Aviv");
  });
});

describe("appendQueryParams", () => {
  it("appends params to base URL", () => {
    const url = appendQueryParams("https://example.com/app", { page: 2, q: "test" });
    expect(url).toContain("page=2");
    expect(url).toContain("q=test");
  });

  it("returns base unchanged when no params", () => {
    expect(appendQueryParams("https://example.com", {})).toBe("https://example.com");
  });

  it("handles existing query params without duplication", () => {
    const url = appendQueryParams("https://example.com?x=1", { y: 2 });
    expect(url).toContain("x=1");
    expect(url).toContain("y=2");
  });

  it("overrides existing param", () => {
    const url = appendQueryParams("https://example.com?p=old", { p: "new" });
    expect(url).toContain("p=new");
    expect(url).not.toContain("p=old");
  });
});

describe("parseQueryParams", () => {
  it("parses simple query string", () => {
    const params = parseQueryParams("?name=Alice&age=30");
    expect(params.name).toBe("Alice");
    expect(params.age).toBe("30");
  });

  it("parses from full URL", () => {
    const params = parseQueryParams("https://example.com/app?section=guests&id=g1");
    expect(params.section).toBe("guests");
    expect(params.id).toBe("g1");
  });

  it("returns empty object for empty string", () => {
    expect(parseQueryParams("")).toEqual({});
  });

  it("returns empty object for URL with no params", () => {
    expect(parseQueryParams("https://example.com/path")).toEqual({});
  });

  it("decodes encoded values", () => {
    const params = parseQueryParams("?q=hello%20world");
    expect(params.q).toBe("hello world");
  });
});

describe("buildMailtoUrl", () => {
  it("builds a basic mailto link", () => {
    expect(buildMailtoUrl("admin@example.com")).toBe("mailto:admin@example.com");
  });

  it("appends subject and body", () => {
    const url = buildMailtoUrl("a@b.com", { subject: "Hello", body: "World" });
    expect(url).toContain("subject=Hello");
    expect(url).toContain("body=World");
  });

  it("handles only subject", () => {
    const url = buildMailtoUrl("x@y.com", { subject: "Test" });
    expect(url).toContain("subject=Test");
    expect(url).not.toContain("body=");
  });
});

describe("isSafeUrl", () => {
  it("returns true for https URL", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
  });

  it("returns true for relative URL", () => {
    expect(isSafeUrl("/app/page")).toBe(true);
  });

  it("returns true for mailto", () => {
    expect(isSafeUrl("mailto:test@example.com")).toBe(true);
  });

  it("returns true for hash link", () => {
    expect(isSafeUrl("#section")).toBe(true);
  });

  it("returns false for javascript: scheme", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  it("returns false for data: URI", () => {
    expect(isSafeUrl("data:text/html,<h1>hi</h1>")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSafeUrl("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSafeUrl(/** @type {any} */ (null))).toBe(false);
  });
});
