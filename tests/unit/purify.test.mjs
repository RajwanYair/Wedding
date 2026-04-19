/**
 * tests/unit/purify.test.mjs — Unit tests for src/utils/purify.js
 *
 * DOMPurify is mocked since it requires a DOM environment.
 * Tests verify the wrapper API contract:
 *   - purify() returns string
 *   - purifyText() strips all HTML
 *   - purifyUrl() rejects javascript: and data: URIs
 */

import { describe, it, expect, vi, beforeAll } from "vitest";

// ── DOMPurify mock ────────────────────────────────────────────────────────

const _domPurifyHook = { fn: /** @type {Function|null} */ (null) };

vi.mock("dompurify", () => {
  const sanitize = vi.fn((dirty, config) => {
    if (!dirty) return "";
    // Simulate plain-text stripping when ALLOWED_TAGS=[]
    if (Array.isArray(config?.ALLOWED_TAGS) && config.ALLOWED_TAGS.length === 0) {
      return String(dirty).replace(/<[^>]*>/g, "");
    }
    // Simulate URL extraction for href test
    if (config?.ALLOWED_TAGS?.join("") === "a") {
      if (String(dirty).includes("javascript:")) return '<a>x</a>';
      if (String(dirty).includes("data:")) return '<a>x</a>';
      return String(dirty); // return with href intact
    }
    return `sanitized:${dirty}`;
  });
  return {
    default: {
      sanitize,
      addHook: vi.fn((_event, fn) => { _domPurifyHook.fn = fn; }),
    },
  };
});

// ── Import after mock ─────────────────────────────────────────────────────

const { purify, purifyText, purifyUrl } = await import("../../src/utils/purify.js");

// ── purify ────────────────────────────────────────────────────────────────

describe("purify", () => {
  it("returns empty string for non-string input", () => {
    expect(purify(/** @type {any} */ (null))).toBe("");
    expect(purify(/** @type {any} */ (undefined))).toBe("");
    expect(purify(/** @type {any} */ (42))).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(purify("")).toBe("");
  });

  it("passes string through DOMPurify.sanitize", () => {
    const result = purify("<p>Hello</p>");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepts a custom config override", () => {
    const result = purify("<p>Hello</p>", { ALLOWED_TAGS: ["p"] });
    expect(typeof result).toBe("string");
  });
});

// ── purifyText ────────────────────────────────────────────────────────────

describe("purifyText", () => {
  it("returns empty string for non-string input", () => {
    expect(purifyText(/** @type {any} */ (null))).toBe("");
    expect(purifyText(/** @type {any} */ (undefined))).toBe("");
  });

  it("strips all HTML tags", () => {
    // With ALLOWED_TAGS=[], the mock strips tags
    const result = purifyText("<b>Hello</b> <script>evil</script>world");
    expect(result).not.toContain("<b>");
    expect(result).not.toContain("<script>");
  });

  it("returns plain text content", () => {
    const result = purifyText("<p>Plain text</p>");
    expect(result).toContain("Plain text");
    expect(result).not.toContain("<p>");
  });
});

// ── purifyUrl ─────────────────────────────────────────────────────────────

describe("purifyUrl", () => {
  it("returns empty string for non-string input", () => {
    expect(purifyUrl(/** @type {any} */ (null))).toBe("");
    expect(purifyUrl(/** @type {any} */ (42))).toBe("");
  });

  it("blocks javascript: URIs", () => {
    expect(purifyUrl("javascript:alert(1)")).toBe("");
  });

  it("blocks data: URIs", () => {
    expect(purifyUrl("data:text/html,<h1>hi</h1>")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(purifyUrl("")).toBe("");
  });
});
