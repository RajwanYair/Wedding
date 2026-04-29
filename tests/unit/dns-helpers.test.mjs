/**
 * tests/unit/dns-helpers.test.mjs — S210 coverage ratchet: dns-helpers (merged dns-instructions + domain-validator)
 */
import { describe, it, expect } from "vitest";
import {
  DNS_PROVIDERS,
  getDnsInstructions,
  formatDnsRecord,
  getProviderKeys,
  validateGuest,
  validateVendor,
  validateTable,
  validateExpense,
} from "../../src/services/dns-helpers.js";

describe("dns-helpers — DNS_PROVIDERS", () => {
  it("is a non-empty frozen array", () => {
    expect(Array.isArray(DNS_PROVIDERS)).toBe(true);
    expect(DNS_PROVIDERS.length).toBeGreaterThan(0);
    expect(Object.isFrozen(DNS_PROVIDERS)).toBe(true);
  });

  it("each provider has type, name, value on each record", () => {
    for (const provider of DNS_PROVIDERS) {
      for (const rec of provider.records) {
        expect(rec).toHaveProperty("type");
        expect(rec).toHaveProperty("name");
        expect(rec).toHaveProperty("value");
      }
    }
  });
});

describe("dns-helpers — getDnsInstructions", () => {
  it("returns github-pages instructions", () => {
    const inst = getDnsInstructions("github-pages");
    expect(inst).toBeDefined();
    expect(inst.provider).toBe("github-pages");
    expect(inst.records.length).toBeGreaterThan(0);
  });

  it("returns undefined for unknown provider", () => {
    expect(getDnsInstructions("unknown-host")).toBeUndefined();
  });

  it("returns vercel instructions", () => {
    const inst = getDnsInstructions("vercel");
    expect(inst).toBeDefined();
  });
});

describe("dns-helpers — formatDnsRecord", () => {
  it("formats a CNAME record with default TTL", () => {
    const result = formatDnsRecord({ type: "CNAME", name: "www", value: "cname.vercel-dns.com" });
    expect(result).toBe("CNAME\twww\tcname.vercel-dns.com\t3600");
  });

  it("uses provided TTL", () => {
    const result = formatDnsRecord({ type: "A", name: "@", value: "76.76.21.21", ttl: "300" });
    expect(result).toBe("A\t@\t76.76.21.21\t300");
  });
});

describe("dns-helpers — getProviderKeys", () => {
  it("returns an array of string keys", () => {
    const keys = getProviderKeys();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.every((k) => typeof k === "string")).toBe(true);
  });

  it("includes github-pages and vercel", () => {
    const keys = getProviderKeys();
    expect(keys).toContain("github-pages");
    expect(keys).toContain("vercel");
  });
});

describe("dns-helpers — validateGuest", () => {
  it("returns valid for minimal guest", () => {
    const r = validateGuest({ firstName: "Alice", lastName: "Smith" });
    expect(r.valid).toBe(true);
    expect(Object.keys(r.errors)).toHaveLength(0);
  });

  it("returns error when firstName missing", () => {
    const r = validateGuest({ lastName: "Smith" });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveProperty("firstName");
  });

  it("accepts valid guest with phone", () => {
    const r = validateGuest({ firstName: "A", lastName: "B", phone: "+972501234567" });
    expect(r.valid).toBe(true);
  });
});

describe("dns-helpers — validateVendor", () => {
  it("returns valid for minimal vendor", () => {
    const r = validateVendor({ name: "DJ Max" });
    expect(r.valid).toBe(true);
  });

  it("returns error when name missing", () => {
    const r = validateVendor({});
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveProperty("name");
  });

  it("returns error for negative price", () => {
    const r = validateVendor({ name: "DJ", price: -1 });
    expect(r.valid).toBe(false);
  });
});

describe("dns-helpers — validateTable", () => {
  it("returns valid for minimal table", () => {
    const r = validateTable({ name: "Table 1", capacity: 8 });
    expect(r.valid).toBe(true);
  });

  it("returns error when name missing", () => {
    const r = validateTable({ capacity: 8 });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveProperty("name");
  });

  it("returns error when capacity missing", () => {
    const r = validateTable({ name: "T1" });
    expect(r.valid).toBe(false);
  });
});

describe("dns-helpers — validateExpense", () => {
  it("returns valid for minimal expense", () => {
    const r = validateExpense({ description: "Venue deposit", amount: 1000 });
    expect(r.valid).toBe(true);
  });

  it("returns error for negative amount", () => {
    const r = validateExpense({ description: "X", amount: -1 });
    expect(r.valid).toBe(false);
  });

  it("returns error when description missing", () => {
    const r = validateExpense({ amount: 500 });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveProperty("description");
  });
});
