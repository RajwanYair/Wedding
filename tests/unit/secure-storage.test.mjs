/**
 * tests/unit/secure-storage.test.mjs — AES-GCM secure storage tests
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  setSecure,
  getSecure,
  removeSecure,
  rotateDeviceKey,
  _resetKeyForTests,
} from "../../src/services/secure-storage.js";

beforeEach(() => {
  // happy-dom's Storage doesn't implement clear(); remove keys manually.
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
  _resetKeyForTests();
});

describe("setSecure / getSecure", () => {
  it("round-trips a string value", async () => {
    await setSecure("token", "abc-123");
    expect(await getSecure("token")).toBe("abc-123");
  });

  it("round-trips an object", async () => {
    const session = { jwt: "eyJ.x.y", expiresAt: 1234567890, email: "a@b.com" };
    await setSecure("session", session);
    expect(await getSecure("session")).toEqual(session);
  });

  it("stores ciphertext, not plaintext", async () => {
    await setSecure("token", "super-secret-value-xyz");
    const raw = localStorage.getItem("wedding_v1_token");
    expect(raw).not.toContain("super-secret-value-xyz");
    expect(raw).toMatch(/"iv"/);
    expect(raw).toMatch(/"ct"/);
  });

  it("returns null for missing keys", async () => {
    expect(await getSecure("never-set")).toBeNull();
  });

  it("returns null for legacy plaintext entries and removes them", async () => {
    localStorage.setItem("wedding_v1_legacy", "raw-plaintext");
    expect(await getSecure("legacy")).toBeNull();
    expect(localStorage.getItem("wedding_v1_legacy")).toBeNull();
  });

  it("uses a fresh IV per write (non-deterministic ciphertext)", async () => {
    await setSecure("k", "same");
    const a = localStorage.getItem("wedding_v1_k");
    await setSecure("k", "same");
    const b = localStorage.getItem("wedding_v1_k");
    expect(a).not.toBe(b);
  });
});

describe("removeSecure", () => {
  it("removes a sealed entry", async () => {
    await setSecure("temp", "x");
    removeSecure("temp");
    expect(localStorage.getItem("wedding_v1_temp")).toBeNull();
  });
});

describe("rotateDeviceKey", () => {
  it("invalidates previously sealed entries", async () => {
    await setSecure("token", "abc");
    rotateDeviceKey();
    // After rotation, the stored ciphertext is undecryptable -> null + removed
    expect(await getSecure("token")).toBeNull();
  });
});
