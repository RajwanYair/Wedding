/**
 * tests/unit/registry.test.mjs — Unit tests for registry section
 * Covers: addLink (pure store operations)
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import { addLink } from "../../src/sections/registry.js";

function seedStore() {
  initStore({
    weddingInfo: { value: {} },
    guests: { value: [] },
    tables: { value: [] },
  });
}

describe("addLink", () => {
  beforeEach(() => seedStore());

  it("adds an HTTPS link to registryLinks", () => {
    addLink({ url: "https://example.com/registry" });
    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo"));
    const links = JSON.parse(info.registryLinks || "[]");
    expect(links).toContain("https://example.com/registry");
  });

  it("rejects non-HTTPS links", () => {
    addLink({ url: "http://insecure.com/registry" });
    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo"));
    const links = JSON.parse(info.registryLinks || "[]");
    expect(links).toHaveLength(0);
  });

  it("prevents duplicate links", () => {
    addLink({ url: "https://example.com" });
    addLink({ url: "https://example.com" });
    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo"));
    const links = JSON.parse(info.registryLinks || "[]");
    expect(links).toHaveLength(1);
  });

  it("allows multiple different links", () => {
    addLink({ url: "https://a.com" });
    addLink({ url: "https://b.com" });
    addLink({ url: "https://c.com" });
    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo"));
    const links = JSON.parse(info.registryLinks || "[]");
    expect(links).toHaveLength(3);
  });

  it("preserves existing registryLinks", () => {
    storeSet("weddingInfo", { registryLinks: JSON.stringify(["https://existing.com"]) });
    addLink({ url: "https://new.com" });
    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo"));
    const links = JSON.parse(info.registryLinks || "[]");
    expect(links).toContain("https://existing.com");
    expect(links).toContain("https://new.com");
  });

  it("preserves other weddingInfo fields", () => {
    storeSet("weddingInfo", { groom: "Test", bride: "User" });
    addLink({ url: "https://example.com" });
    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo"));
    expect(info.groom).toBe("Test");
    expect(info.bride).toBe("User");
  });
});
