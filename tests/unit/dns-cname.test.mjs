/**
 * tests/unit/dns-cname.test.mjs — S128 vanity-domain DNS helpers.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  validateDomain,
  isApex,
  buildDnsInstructions,
} from "../../src/utils/dns-cname.js";

describe("S128 — dns-cname", () => {
  it("normalizeDomain strips protocol/path/case/trailing dot", () => {
    expect(normalizeDomain("HTTPS://Wedding.Example.com/path?x=1")).toBe(
      "wedding.example.com",
    );
    expect(normalizeDomain("Example.COM.")).toBe("example.com");
    expect(normalizeDomain("")).toBe("");
  });

  it("validateDomain rejects empty / reserved / malformed", () => {
    expect(validateDomain("").ok).toBe(false);
    expect(validateDomain("localhost").ok).toBe(false);
    expect(validateDomain("not a domain").ok).toBe(false);
    expect(validateDomain("foo.bar").ok).toBe(true);
  });

  it("isApex detects 2-label vs subdomain", () => {
    expect(isApex("foo.com")).toBe(true);
    expect(isApex("www.foo.com")).toBe(false);
  });

  it("buildDnsInstructions returns 4 A-records + ALIAS for apex", () => {
    const r = buildDnsInstructions("foo.com");
    expect(r.ok).toBe(true);
    expect(r.records.filter((x) => x.type === "A")).toHaveLength(4);
    expect(r.records[0].type).toBe("ALIAS");
  });

  it("buildDnsInstructions returns single CNAME for subdomain", () => {
    const r = buildDnsInstructions("rsvp.foo.com", "myapp.io");
    expect(r.records).toEqual([
      { type: "CNAME", host: "rsvp", value: "myapp.io", ttl: 3600 },
    ]);
  });

  it("buildDnsInstructions surfaces validation error", () => {
    expect(buildDnsInstructions("").ok).toBe(false);
    expect(buildDnsInstructions("localhost").error).toBe("reserved");
  });
});
