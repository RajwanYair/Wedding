/**
 * tests/unit/crypto.test.mjs — AES-GCM encrypt/decrypt tests (v6.0-S3)
 */

import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../../src/utils/crypto.js";

describe("crypto — AES-GCM encrypt/decrypt", () => {
  const passphrase = "test-passphrase-2025";

  it.each([
    ["simple string", "Hello, World!"],
    ["Hebrew text", "שלום עולם"],
    ["phone number", "+972541234567"],
    ["email address", "user@example.com"],
    ["empty string", ""],
    ["long text (1000+ chars)", "A".repeat(2000)],
  ])("round-trips %s", async (_label, plain) => {
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
});
