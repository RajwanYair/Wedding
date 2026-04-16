/**
 * tests/unit/crypto.test.mjs — AES-GCM encrypt/decrypt tests (v6.0-S3)
 */

import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../../src/utils/crypto.js";

describe("crypto — AES-GCM encrypt/decrypt", () => {
  const passphrase = "test-passphrase-2025";

  it("round-trips a simple string", async () => {
    const plain = "Hello, World!";
    const cipher = await encrypt(plain, passphrase);
    const result = await decrypt(cipher, passphrase);
    expect(result).toBe(plain);
  });

  it("round-trips Hebrew text", async () => {
    const plain = "שלום עולם";
    const cipher = await encrypt(plain, passphrase);
    const result = await decrypt(cipher, passphrase);
    expect(result).toBe(plain);
  });

  it("round-trips a phone number", async () => {
    const plain = "+972541234567";
    const cipher = await encrypt(plain, passphrase);
    const result = await decrypt(cipher, passphrase);
    expect(result).toBe(plain);
  });

  it("round-trips an email address", async () => {
    const plain = "user@example.com";
    const cipher = await encrypt(plain, passphrase);
    const result = await decrypt(cipher, passphrase);
    expect(result).toBe(plain);
  });

  it("produces different ciphertexts for the same plaintext (random IV+salt)", async () => {
    const plain = "same input";
    const c1 = await encrypt(plain, passphrase);
    const c2 = await encrypt(plain, passphrase);
    expect(c1).not.toBe(c2);
  });

  it("returns a base64 string", async () => {
    const cipher = await encrypt("test", passphrase);
    expect(typeof cipher).toBe("string");
    // Valid base64 chars only
    expect(cipher).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("fails to decrypt with wrong passphrase", async () => {
    const cipher = await encrypt("secret", passphrase);
    await expect(decrypt(cipher, "wrong-pass")).rejects.toThrow();
  });

  it("handles empty string", async () => {
    const cipher = await encrypt("", passphrase);
    const result = await decrypt(cipher, passphrase);
    expect(result).toBe("");
  });

  it("handles long text (1000+ chars)", async () => {
    const plain = "A".repeat(2000);
    const cipher = await encrypt(plain, passphrase);
    const result = await decrypt(cipher, passphrase);
    expect(result).toBe(plain);
  });
});
