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


// ────────────────────────────────────────────────────────────
// Merged from: session-security.js
// ────────────────────────────────────────────────────────────

/**
 * src/services/session-security.js — Session timeout guard (Sprint 87)
 *
 * Creates a watcher that calls `onTimeout` after a period of inactivity.
 * Activity is tracked via `recordActivity()`.  Runs entirely in-memory
 * using setTimeout — no DOM deps (DOM-free for testing).
 */

/**
 * @typedef {{
 *   timeoutMs: number,
 *   warningMs?: number,
 *   onTimeout: () => void,
 *   onWarning?: () => void
 * }} SessionGuardOptions
 *
 * @typedef {{
 *   recordActivity(): void,
 *   destroy(): void,
 *   remainingMs(): number,
 *   reset(): void
 * }} SessionGuard
 */

/**
 * Create a session inactivity guard.
 *
 * @param {SessionGuardOptions} opts
 * @returns {SessionGuard}
 */
export function createSessionGuard(opts) {
  const { timeoutMs, warningMs, onTimeout, onWarning } = opts;
  if (timeoutMs < 1) throw new RangeError("timeoutMs must be >= 1");

  let lastActivity = Date.now();
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timeoutHandle = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let warningHandle = null;
  let destroyed = false;

  function clearTimers() {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    if (warningHandle !== null) {
      clearTimeout(warningHandle);
      warningHandle = null;
    }
  }

  function scheduleTimers() {
    if (destroyed) return;
    clearTimers();
    timeoutHandle = setTimeout(() => {
      if (!destroyed) onTimeout();
    }, timeoutMs);

    if (typeof warningMs === "number" && warningMs < timeoutMs && onWarning) {
      warningHandle = setTimeout(() => {
        if (!destroyed) onWarning();
      }, timeoutMs - warningMs);
    }
  }

  scheduleTimers();

  return {
    /** Call whenever the user performs an action. */
    recordActivity() {
      if (destroyed) return;
      lastActivity = Date.now();
      scheduleTimers();
    },

    /** Tear down all timers. */
    destroy() {
      destroyed = true;
      clearTimers();
    },

    /** Approximate remaining ms before timeout. */
    remainingMs() {
      return Math.max(0, lastActivity + timeoutMs - Date.now());
    },

    /** Reset the timer without recording a user gesture. */
    reset() {
      if (destroyed) return;
      lastActivity = Date.now();
      scheduleTimers();
    },
  };
}
