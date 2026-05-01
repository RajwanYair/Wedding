import { describe, it, expect } from "vitest";
import { uuid, isUuid } from "../../src/utils/uuid.js";

describe("uuid", () => {
  it("generates RFC-4122 v4 UUIDs", () => {
    for (let i = 0; i < 50; i += 1) {
      const u = uuid();
      expect(isUuid(u)).toBe(true);
      expect(u[14]).toBe("4");
      expect("89ab").toContain(u[19]);
    }
  });

  it("generates unique values", () => {
    const set = new Set();
    for (let i = 0; i < 1000; i += 1) set.add(uuid());
    expect(set.size).toBe(1000);
  });

  it("isUuid accepts canonical form", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("isUuid accepts uppercase", () => {
    expect(isUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("isUuid rejects wrong version", () => {
    expect(isUuid("550e8400-e29b-61d4-a716-446655440000")).toBe(false);
  });

  it("isUuid rejects wrong variant", () => {
    expect(isUuid("550e8400-e29b-41d4-c716-446655440000")).toBe(false);
  });

  it("isUuid rejects malformed strings", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it("output length is 36", () => {
    expect(uuid()).toHaveLength(36);
  });

  it("contains 4 hyphens at fixed positions", () => {
    const u = uuid();
    expect([u[8], u[13], u[18], u[23]]).toEqual(["-", "-", "-", "-"]);
  });

  it("only hex chars elsewhere", () => {
    const u = uuid().replace(/-/g, "");
    expect(/^[0-9a-f]{32}$/.test(u)).toBe(true);
  });
});
