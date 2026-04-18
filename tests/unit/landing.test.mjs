/**
 * tests/unit/landing.test.mjs — Unit tests for landing section
 * Covers: findTableByQuery (pure function)
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";
import { findTableByQuery, renderLanding } from "../../src/sections/landing.js";

function seedStore() {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    weddingInfo: { value: {} },
    timeline: { value: [] },
  });
}

describe("findTableByQuery", () => {
  beforeEach(() => seedStore());

  it("returns { found: false } for empty query", () => {
    expect(findTableByQuery("")).toEqual({ found: false });
  });

  it("returns { found: false } for whitespace-only query", () => {
    expect(findTableByQuery("   ")).toEqual({ found: false });
  });

  it("returns { found: false } when no guests match", () => {
    storeSet("guests", [{ id: "g1", firstName: "Dan", lastName: "Cohen", phone: "972501234567" }]);
    expect(findTableByQuery("xyz")).toEqual({ found: false });
  });

  it("finds guest by first name (case-insensitive)", () => {
    storeSet("guests", [{ id: "g1", firstName: "Dan", lastName: "Cohen", tableId: "t1" }]);
    storeSet("tables", [{ id: "t1", name: "Table 1", capacity: 10 }]);
    const result = findTableByQuery("dan");
    expect(result.found).toBe(true);
    expect(result.guest.id).toBe("g1");
    expect(result.table.name).toBe("Table 1");
  });

  it("finds guest by last name", () => {
    storeSet("guests", [{ id: "g1", firstName: "Dan", lastName: "Cohen", tableId: "t1" }]);
    storeSet("tables", [{ id: "t1", name: "VIP", capacity: 8 }]);
    const result = findTableByQuery("cohen");
    expect(result.found).toBe(true);
  });

  it("finds guest by phone number", () => {
    storeSet("guests", [{ id: "g1", firstName: "Dan", lastName: "", phone: "972501234567", tableId: "t1" }]);
    storeSet("tables", [{ id: "t1", name: "Table 2" }]);
    const result = findTableByQuery("972501234567");
    expect(result.found).toBe(true);
  });

  it("returns found:false when guest exists but has no table", () => {
    storeSet("guests", [{ id: "g1", firstName: "Dan", lastName: "" }]);
    storeSet("tables", []);
    const result = findTableByQuery("dan");
    expect(result.found).toBe(false);
    expect(result.guest).toBeDefined();
  });

  it("returns found:false when guest's tableId doesn't match any table", () => {
    storeSet("guests", [{ id: "g1", firstName: "Dan", lastName: "", tableId: "t_missing" }]);
    storeSet("tables", [{ id: "t1", name: "Table 1" }]);
    const result = findTableByQuery("Dan");
    expect(result.found).toBe(false);
  });

  it("matches partial name", () => {
    storeSet("guests", [{ id: "g1", firstName: "Daniel", lastName: "Levy", tableId: "t1" }]);
    storeSet("tables", [{ id: "t1", name: "T1" }]);
    const result = findTableByQuery("ani");
    expect(result.found).toBe(true);
  });

  it("returns first matching guest when multiple match", () => {
    storeSet("guests", [
      { id: "g1", firstName: "Dan", lastName: "A", tableId: "t1" },
      { id: "g2", firstName: "Dan", lastName: "B", tableId: "t2" },
    ]);
    storeSet("tables", [
      { id: "t1", name: "T1" },
      { id: "t2", name: "T2" },
    ]);
    const result = findTableByQuery("Dan");
    expect(result.guest.id).toBe("g1");
  });
});

describe("renderLanding", () => {
  beforeEach(() => {
    seedStore();
    document.body.innerHTML = `
      <section id="landingRegistrySection" class="u-hidden">
        <div id="landingRegistryList"></div>
      </section>
      <div id="landingTimeline"></div>
      <div id="landingCoupleName"></div>
      <div id="landingHebrewDate"></div>
      <div id="landingDate"></div>
      <div id="landingVenue"></div>
      <div id="landingAddress"></div>
      <a id="landingWazeLink" class="u-hidden"></a>
    `;
  });

  it("renders registry links from weddingInfo.registryLinks", () => {
    storeSet("weddingInfo", {
      registryLinks: JSON.stringify([
        "https://example.com/list",
        { url: "https://shop.example.com/gifts", name: "Gift Shop" },
      ]),
    });

    renderLanding();

    const section = document.getElementById("landingRegistrySection");
    const links = [...document.querySelectorAll("#landingRegistryList a")];
    expect(section?.classList.contains("u-hidden")).toBe(false);
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("https://example.com/list");
    expect(links[1].textContent).toBe("Gift Shop");
  });
});
