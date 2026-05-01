import { describe, it, expect } from "vitest";
import { ulid, isUlid, ulidTimestamp } from "../../src/utils/ulid.js";

describe("ulid", () => {
  it("produces 26-char Crockford base32", () => {
    const u = ulid();
    expect(u).toHaveLength(26);
    expect(isUlid(u)).toBe(true);
  });

  it("isUlid validates positive cases", () => {
    expect(isUlid("01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe(true);
  });

  it("isUlid rejects lowercase / wrong length", () => {
    expect(isUlid("01arz3ndektsv4rrffq69g5fav")).toBe(false);
    expect(isUlid("01ARZ3NDEKTSV4RRFFQ69G5FA")).toBe(false);
    expect(isUlid("")).toBe(false);
    expect(isUlid(123)).toBe(false);
  });

  it("isUlid rejects forbidden chars I L O U", () => {
    expect(isUlid("01ARZ3NDEKTSVI4RRFFQ69G5FA")).toBe(false);
  });

  it("encodes injected timestamp", () => {
    const u = ulid({ now: () => 1_700_000_000_000, random: () => 0 });
    expect(ulidTimestamp(u)).toBe(1_700_000_000_000);
  });

  it("ulidTimestamp invalid → null", () => {
    expect(ulidTimestamp("not-a-ulid")).toBe(null);
  });

  it("monotonic by timestamp", () => {
    const a = ulid({ now: () => 1000, random: () => 0 });
    const b = ulid({ now: () => 2000, random: () => 0 });
    expect(b > a).toBe(true);
  });

  it("rejects negative timestamps", () => {
    expect(() => ulid({ now: () => -1 })).toThrow();
  });

  it("rejects out-of-range timestamps", () => {
    expect(() => ulid({ now: () => 2 ** 49 })).toThrow();
  });

  it("generates distinct values", () => {
    const set = new Set();
    for (let i = 0; i < 200; i += 1) set.add(ulid());
    expect(set.size).toBe(200);
  });
});
