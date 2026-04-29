/**
 * tests/unit/contact-dedup.test.mjs — Sprint 136
 */

import { describe, it, expect } from "vitest";
import { jaroSimilarity, findDuplicates, mergeContacts } from "../../src/services/guest-identity.js";

describe("jaroSimilarity", () => {
  it("identical strings = 1", () => {
    expect(jaroSimilarity("hello", "hello")).toBe(1);
  });

  it("empty string = 0", () => {
    expect(jaroSimilarity("", "abc")).toBe(0);
    expect(jaroSimilarity("abc", "")).toBe(0);
  });

  it("similar names score > 0.8", () => {
    expect(jaroSimilarity("yosef cohen", "yosef kohen")).toBeGreaterThan(0.8);
  });

  it("completely different strings score < 0.5", () => {
    expect(jaroSimilarity("alice", "zxcvb")).toBeLessThan(0.5);
  });
});

describe("findDuplicates", () => {
  const contacts = [
    { id: "g1", firstName: "Alice",  lastName: "Cohen",  phone: "054-111-1111" },
    { id: "g2", firstName: "Alice",  lastName: "Cohen",  phone: "054-222-2222" },
    { id: "g3", firstName: "Bob",    lastName: "Smith",  phone: "054-111-1111" },
    { id: "g4", firstName: "Charlie",lastName: "Brown",  phone: "054-333-3333" },
  ];

  it("detects phone duplicate", () => {
    const dupes = findDuplicates(contacts);
    const phoneDupe = dupes.find((d) => d.reason === "phone");
    expect(phoneDupe).toBeTruthy();
    expect([phoneDupe?.a, phoneDupe?.b].sort()).toEqual(["g1", "g3"]);
  });

  it("detects name duplicate", () => {
    const dupes = findDuplicates(contacts, { nameThreshold: 0.9 });
    const nameDupe = dupes.find((d) => d.reason === "name");
    expect(nameDupe).toBeTruthy();
    expect([nameDupe?.a, nameDupe?.b].sort()).toEqual(["g1", "g2"]);
  });

  it("returns empty for no duplicates", () => {
    const unique = [
      { id: "a", firstName: "Alice", lastName: "Smith", phone: "111" },
      { id: "b", firstName: "Bob",   lastName: "Jones", phone: "222" },
    ];
    expect(findDuplicates(unique)).toHaveLength(0);
  });
});

describe("mergeContacts", () => {
  it("primary wins for non-empty fields", () => {
    const primary   = { id: "g1", firstName: "Alice", lastName: "Cohen", phone: "+972111" };
    const secondary = { id: "g2", firstName: "Alice", lastName: "Koen",  phone: "+972222" };
    const merged = mergeContacts(primary, secondary);
    expect(merged.lastName).toBe("Cohen");
    expect(merged.phone).toBe("+972111");
  });

  it("secondary fills missing fields", () => {
    const primary   = { id: "g1", firstName: "Alice", lastName: "Cohen", phone: "" };
    const secondary = { id: "g2", firstName: "Alice", lastName: "Cohen", phone: "+972222" };
    const merged = mergeContacts(primary, secondary);
    expect(merged.phone).toBe("+972222");
  });
});
