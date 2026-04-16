/**
 * src/utils/crypto.js — AES-GCM encrypt / decrypt via Web Crypto API
 *
 * Provides client-side encryption for PII fields (phone, email) before
 * storing in IndexedDB or syncing to external backends. Uses AES-GCM
 * with per-encryption random IVs for semantic security.
 *
 * Key derivation: PBKDF2 from a passphrase + random salt.
 * Format: base64( salt[16] || iv[12] || ciphertext || tag[16] )
 */

const ALGO = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;

/**
 * Derive an AES-GCM key from a passphrase using PBKDF2.
 * @param {string} passphrase
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
async function _deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a plaintext string.
 * Returns a base64 string containing salt + IV + ciphertext.
 *
 * @param {string} plaintext
 * @param {string} passphrase
 * @returns {Promise<string>} base64-encoded ciphertext blob
 */
export async function encrypt(plaintext, passphrase) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await _deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    enc.encode(plaintext),
  );
  // Concatenate salt + iv + ciphertext
  const blob = new Uint8Array(
    salt.byteLength + iv.byteLength + ciphertext.byteLength,
  );
  blob.set(salt, 0);
  blob.set(iv, salt.byteLength);
  blob.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);
  return btoa(String.fromCharCode(...blob));
}

/**
 * Decrypt a base64-encoded ciphertext blob.
 *
 * @param {string} encoded  base64 string from `encrypt()`
 * @param {string} passphrase
 * @returns {Promise<string>} decrypted plaintext
 */
export async function decrypt(encoded, passphrase) {
  const raw = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const salt = raw.slice(0, SALT_LENGTH);
  const iv = raw.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = raw.slice(SALT_LENGTH + IV_LENGTH);
  const key = await _deriveKey(passphrase, salt);
  const plainBuf = await crypto.subtle.decrypt(
    { name: ALGO, iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plainBuf);
}
