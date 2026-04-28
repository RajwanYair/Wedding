/**
 * tests/unit/dns-instructions.test.mjs — Sprint 154 DNS instructions UI
 */

import { describe, it, expect } from "vitest";
import {
  DNS_PROVIDERS,
  getDnsInstructions,
  formatDnsRecord,
  getProviderKeys,
} from "../../src/services/dns-instructions.js";

describe("DNS Instructions (Sprint 154)", () => {
  describe("DNS_PROVIDERS", () => {
    it("has 5 providers", () => {
      expect(DNS_PROVIDERS).toHaveLength(5);
    });

    it("includes github-pages, vercel, netlify, cloudflare-pages, render", () => {
      const keys = DNS_PROVIDERS.map((p) => p.provider);
      expect(keys).toContain("github-pages");
      expect(keys).toContain("vercel");
      expect(keys).toContain("netlify");
      expect(keys).toContain("cloudflare-pages");
      expect(keys).toContain("render");
    });

    it("each provider has docsUrl, labelKey, and records", () => {
      for (const p of DNS_PROVIDERS) {
        expect(p.docsUrl).toMatch(/^https:\/\//);
        expect(p.labelKey).toBeTruthy();
        expect(p.records.length).toBeGreaterThan(0);
      }
    });

    it("github-pages has 5 records (1 CNAME + 4 A)", () => {
      const gh = DNS_PROVIDERS.find((p) => p.provider === "github-pages");
      expect(gh.records).toHaveLength(5);
      expect(gh.records.filter((r) => r.type === "A")).toHaveLength(4);
      expect(gh.records.filter((r) => r.type === "CNAME")).toHaveLength(1);
    });
  });

  describe("getDnsInstructions", () => {
    it("returns provider for valid key", () => {
      const result = getDnsInstructions("vercel");
      expect(result).toBeDefined();
      expect(result.provider).toBe("vercel");
    });

    it("returns undefined for unknown key", () => {
      expect(getDnsInstructions("nonexistent")).toBeUndefined();
    });
  });

  describe("formatDnsRecord", () => {
    it("formats a record with default TTL", () => {
      const line = formatDnsRecord({ type: "A", name: "@", value: "1.2.3.4" });
      expect(line).toBe("A\t@\t1.2.3.4\t3600");
    });

    it("uses custom TTL when provided", () => {
      const line = formatDnsRecord({ type: "CNAME", name: "www", value: "example.com", ttl: "600" });
      expect(line).toContain("600");
    });
  });

  describe("getProviderKeys", () => {
    it("returns 5 keys", () => {
      expect(getProviderKeys()).toHaveLength(5);
    });

    it("returns strings", () => {
      for (const key of getProviderKeys()) {
        expect(typeof key).toBe("string");
      }
    });
  });
});
