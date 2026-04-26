/**
 * src/services/crypto.js — Web Crypto AES-GCM field encryption (Sprint 83)
 *
 * Uses the browser/Node.js Web Crypto API (SubtleCrypto) — no dependencies.
 * Keys are non-extractable CryptoKey objects; the ciphertext format is:
 *   base64( iv[12 bytes] ++ ciphertext )
 */

const ALGO = "AES-GCM";
const IV_LEN = 12; // bytes

/**
 * Generate a fresh AES-256-GCM key.
 * @returns {Promise<CryptoKey>}
 */
export async function generateKey() {
  return crypto.subtle.generateKey(
    { name: ALGO, length: 256 },
    false, // non-extractable
    ["encrypt", "decrypt"],
  );
}

/**
 * Import a raw 32-byte key (Uint8Array or ArrayBuffer) as AES-256-GCM.
 * @param {Uint8Array | ArrayBuffer} rawKey  32 bytes
 * @returns {Promise<CryptoKey>}
 */
export async function importRawKey(rawKey) {
  return crypto.subtle.importKey("raw", rawKey, { name: ALGO, length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * @param {CryptoKey} key
 * @param {string} plaintext
 * @returns {Promise<string>}  base64-encoded IV+ciphertext
 */
export async function encryptField(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherbuf = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
  const combined = new Uint8Array(IV_LEN + cipherbuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherbuf), IV_LEN);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded IV+ciphertext produced by `encryptField`.
 * @param {CryptoKey} key
 * @param {string} ciphertext  base64-encoded IV+ciphertext
 * @returns {Promise<string>}  plaintext
 */
export async function decryptField(key, ciphertext) {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LEN);
  const encrypted = combined.slice(IV_LEN);
  const plainbuf = await crypto.subtle.decrypt({ name: ALGO, iv }, key, encrypted);
  return new TextDecoder().decode(plainbuf);
}
