import { describe, it, expect } from "vitest";
import {
  uuidV4,
  formatUuid,
  isUuid,
  isUuidV4,
} from "../../src/utils/uuid-generate.js";

describe("uuid-generate", () => {
  it("uuidV4 produces canonical format", () => {
    const id = uuidV4();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("uuidV4 sets version nibble to 4", () => {
    const id = uuidV4();
    expect(id[14]).toBe("4");
  });

  it("uuidV4 sets variant bits to 10xx", () => {
    const id = uuidV4();
    expect("89ab").toContain(id[19]);
  });

  it("uuidV4 returns unique values", () => {
    const set = new Set();
    for (let i = 0; i < 50; i += 1) set.add(uuidV4());
    expect(set.size).toBe(50);
  });

  it("formatUuid throws on bad length", () => {
    expect(() => formatUuid(new Uint8Array(15))).toThrow();
  });

  it("formatUuid pads bytes with leading zero", () => {
    const bytes = new Uint8Array(16);
    expect(formatUuid(bytes)).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("isUuid accepts valid UUID strings", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("isUuid rejects malformed strings", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("550e8400e29b41d4a716446655440000")).toBe(false);
  });

  it("isUuid handles non-string input", () => {
    expect(isUuid(/** @type {any} */ (null))).toBe(false);
    expect(isUuid(/** @type {any} */ (123))).toBe(false);
  });

  it("isUuidV4 accepts only v4 + RFC variant", () => {
    expect(isUuidV4("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUuidV4("550e8400-e29b-31d4-a716-446655440000")).toBe(false);
    expect(isUuidV4("550e8400-e29b-41d4-c716-446655440000")).toBe(false);
  });

  it("uuidV4 round-trips through validators", () => {
    const id = uuidV4();
    expect(isUuid(id)).toBe(true);
    expect(isUuidV4(id)).toBe(true);
  });
});
