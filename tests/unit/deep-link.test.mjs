/**
 * tests/unit/deep-link.test.mjs — Sprint 133
 */

import { describe, it, expect } from "vitest";
import {
  parseDeepLink, buildDeepLink, isKnownSection, validateDeepLink,
} from "../../src/utils/deep-link.js";

describe("parseDeepLink", () => {
  it("parses section from URL", () => {
    const p = parseDeepLink("https://app.com?section=rsvp");
    expect(p.section).toBe("rsvp");
  });

  it("parses phone and guestId", () => {
    const p = parseDeepLink("https://app.com?guestId=g1&phone=%2B972541234567");
    expect(p.guestId).toBe("g1");
    expect(p.phone).toBe("+972541234567");
  });

  it("places unknown params in extra", () => {
    const p = parseDeepLink("https://app.com?foo=bar");
    expect(p.extra.foo).toBe("bar");
  });

  it("accepts search-params string without base", () => {
    const p = parseDeepLink("section=guests&eventId=e1");
    expect(p.section).toBe("guests");
    expect(p.eventId).toBe("e1");
  });

  it("returns empty result for garbage input", () => {
    const p = parseDeepLink(":::bad:::");
    expect(p.section).toBeUndefined();
  });
});

describe("buildDeepLink", () => {
  it("builds URL with section", () => {
    const url = buildDeepLink("https://example.com", { section: "rsvp" });
    expect(url).toContain("section=rsvp");
  });

  it("builds URL with all params", () => {
    const url = buildDeepLink("https://example.com", {
      section: "guests", guestId: "g1", eventId: "e1", action: "checkin",
    });
    expect(url).toContain("section=guests");
    expect(url).toContain("guestId=g1");
    expect(url).toContain("eventId=e1");
    expect(url).toContain("action=checkin");
  });

  it("adds extra params", () => {
    const url = buildDeepLink("https://example.com", { extra: { ref: "wa" } });
    expect(url).toContain("ref=wa");
  });
});

describe("isKnownSection", () => {
  it("returns true for known sections", () => {
    expect(isKnownSection("rsvp")).toBe(true);
    expect(isKnownSection("guests")).toBe(true);
  });

  it("returns false for unknown section", () => {
    expect(isKnownSection("foobar")).toBe(false);
    expect(isKnownSection(undefined)).toBe(false);
  });
});

describe("validateDeepLink", () => {
  it("no errors for valid params", () => {
    expect(validateDeepLink({ section: "rsvp", phone: "+972541234567", extra: {} })).toHaveLength(0);
  });

  it("errors on unknown section", () => {
    const errors = validateDeepLink({ section: "unknown", extra: {} });
    expect(errors).toHaveLength(1);
  });

  it("errors on invalid phone", () => {
    const errors = validateDeepLink({ phone: "abc", extra: {} });
    expect(errors).toHaveLength(1);
  });
});
