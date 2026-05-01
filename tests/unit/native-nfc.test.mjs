import { describe, it, expect } from "vitest";
import { encodeGuestPayload, decodeGuestPayload, isNfcAvailable } from "../../src/native/nfc.js";

describe("native/nfc payload codec", () => {
  it("encodes a guest id with the wedding prefix", () => {
    expect(encodeGuestPayload("g_42")).toBe("wedding:guest:g_42");
  });

  it("rejects empty/non-string ids when encoding", () => {
    expect(() => encodeGuestPayload("")).toThrow(TypeError);
    expect(() => encodeGuestPayload(null)).toThrow(TypeError);
  });

  it("decodes a wedding payload back to the id", () => {
    expect(decodeGuestPayload("wedding:guest:abc")).toBe("abc");
  });

  it("returns null for unrelated payloads", () => {
    expect(decodeGuestPayload("https://example.com")).toBeNull();
    expect(decodeGuestPayload("wedding:guest:")).toBeNull();
    expect(decodeGuestPayload(123)).toBeNull();
    expect(decodeGuestPayload(undefined)).toBeNull();
  });

  it("isNfcAvailable returns false when neither native nor Web NFC are present", async () => {
    delete globalThis.Capacitor;
    delete globalThis.NDEFReader;
    await expect(isNfcAvailable()).resolves.toBe(false);
  });
});
