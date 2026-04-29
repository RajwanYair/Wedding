/**
 * tests/unit/services-crypto.test.mjs — Sprint 83
 *
 * Tests for src/services/crypto.js (key-based AES-GCM).
 * Uses happy-dom's Web Crypto implementation (available in Vitest).
 */

import { describe, it, expect } from "vitest";
import {
  generateKey,
  importRawKey,
  encryptField,
  decryptField,
} from "../../src/services/crypto-security.js";

describe("generateKey", () => {
  it("returns a CryptoKey", async () => {
    const key = await generateKey();
    expect(key).toBeDefined();
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  it("generates unique keys each call (different encryptions)", async () => {
    const k1 = await generateKey();
    const k2 = await generateKey();
    const ct = await encryptField(k1, "hello");
    await expect(decryptField(k2, ct)).rejects.toBeDefined();
  });
});

describe("importRawKey", () => {
  it("imports 32 random bytes as AES-GCM key", async () => {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const key = await importRawKey(raw);
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  it("can roundtrip encrypt/decrypt with imported key", async () => {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const key = await importRawKey(raw);
    const ct = await encryptField(key, "secret value");
    const pt = await decryptField(key, ct);
    expect(pt).toBe("secret value");
  });
});

describe("encryptField / decryptField", () => {
  it("roundtrips plain ASCII string", async () => {
    const key = await generateKey();
    const ct = await encryptField(key, "hello world");
    expect(typeof ct).toBe("string");
    expect(ct).not.toBe("hello world");
    const pt = await decryptField(key, ct);
    expect(pt).toBe("hello world");
  });

  it("roundtrips Unicode / Hebrew string", async () => {
    const key = await generateKey();
    const hebrew = "שלום עולם";
    const ct = await encryptField(key, hebrew);
    const pt = await decryptField(key, ct);
    expect(pt).toBe(hebrew);
  });

  it("roundtrips empty string", async () => {
    const key = await generateKey();
    const ct = await encryptField(key, "");
    const pt = await decryptField(key, ct);
    expect(pt).toBe("");
  });

  it("produces different ciphertext each call (random IV)", async () => {
    const key = await generateKey();
    const ct1 = await encryptField(key, "same");
    const ct2 = await encryptField(key, "same");
    expect(ct1).not.toBe(ct2);
  });

  it("throws when decrypting with wrong key", async () => {
    const k1 = await generateKey();
    const k2 = await generateKey();
    const ct = await encryptField(k1, "data");
    await expect(decryptField(k2, ct)).rejects.toBeDefined();
  });

  it("throws when ciphertext is corrupted", async () => {
    const key = await generateKey();
    const ct = await encryptField(key, "data");
    const corrupted = `${ct.slice(0, -4)}AAAA`;
    await expect(decryptField(key, corrupted)).rejects.toBeDefined();
  });
});
