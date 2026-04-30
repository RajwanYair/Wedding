/**
 * tests/unit/guest-dedup.test.mjs — S454: coverage for src/utils/guest-dedup.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { findDuplicates, mergeGuests } from "../../src/utils/guest-dedup.js";

describe("guest-dedup — findDuplicates()", () => {
  it("returns empty array for empty input", () => {
    expect(findDuplicates([])).toEqual([]);
  });

  it("returns empty array when no duplicates", () => {
    const guests = [
      { id: "1", name: "Alice", phone: "0501111111" },
      { id: "2", name: "Bob", phone: "0502222222" },
    ];
    expect(findDuplicates(guests)).toEqual([]);
  });

  it("detects duplicates by phone (formatted variants)", () => {
    const guests = [
      { id: "1", name: "Alice", phone: "050-111-1111" },
      { id: "2", name: "Alicia", phone: "0501111111" },
    ];
    const pairs = findDuplicates(guests);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].reason).toBe("phone");
    expect(pairs[0].a.id).toBe("1");
    expect(pairs[0].b.id).toBe("2");
  });

  it("detects duplicates by name (case-insensitive, whitespace-tolerant)", () => {
    const guests = [
      { id: "1", name: "Alice Cohen", phone: "0501111111" },
      { id: "2", name: "alice  cohen", phone: "0509999999" },
    ];
    const pairs = findDuplicates(guests);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].reason).toBe("name");
  });

  it("does not double-pair when phone and name both match", () => {
    const guests = [
      { id: "1", name: "Alice", phone: "0501111111" },
      { id: "2", name: "Alice", phone: "0501111111" },
    ];
    const pairs = findDuplicates(guests);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].reason).toBe("phone");
  });

  it("ignores empty phone/name fields", () => {
    const guests = [
      { id: "1", name: "", phone: "" },
      { id: "2", name: "", phone: "" },
    ];
    expect(findDuplicates(guests)).toEqual([]);
  });
});

describe("guest-dedup — mergeGuests()", () => {
  it("removes the duplicate and keeps the primary", () => {
    const guests = [
      { id: "1", name: "Alice", phone: "0501111111" },
      { id: "2", name: "Alice", phone: "0501111111" },
    ];
    const result = mergeGuests("1", "2", guests);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("enriches primary with non-empty fields from duplicate", () => {
    const guests = [
      { id: "1", name: "Alice", phone: "" },
      { id: "2", name: "Alice", phone: "0501111111", email: "a@b.com" },
    ];
    const result = mergeGuests("1", "2", guests);
    expect(result[0].phone).toBe("0501111111");
    expect(result[0].email).toBe("a@b.com");
  });

  it("does not overwrite existing primary fields", () => {
    const guests = [
      { id: "1", name: "Alice", phone: "0501111111" },
      { id: "2", name: "Alicia", phone: "0509999999" },
    ];
    const result = mergeGuests("1", "2", guests);
    expect(result[0].name).toBe("Alice");
    expect(result[0].phone).toBe("0501111111");
  });

  it("returns original list if primary or dup not found", () => {
    const guests = [{ id: "1", name: "Alice" }];
    expect(mergeGuests("1", "missing", guests)).toEqual(guests);
    expect(mergeGuests("missing", "1", guests)).toEqual(guests);
  });
});
