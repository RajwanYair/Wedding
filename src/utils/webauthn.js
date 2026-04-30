/**
 * src/utils/webauthn.js — WebAuthn / Passkey scaffold (S433)
 *
 * Thin wrappers around navigator.credentials.create / get.
 * All operations are pure-browser; no server round-trip required for the
 * scaffold phase — credentials are stored in localStorage for demo purposes.
 *
 * Security note: a production implementation must validate assertions server-side.
 */

const STORAGE_KEY = "wedding_v1_passkey_creds";

/**
 * Check if the current environment supports WebAuthn passkeys.
 * @returns {boolean}
 */
export function isPasskeySupported() {
  return (
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials?.create === "function" &&
    typeof navigator.credentials?.get === "function"
  );
}

/**
 * Register a passkey for the given user.
 * Stores the credential ID in localStorage for future authentication.
 *
 * @param {{ id: string, name: string, displayName: string }} user
 * @returns {Promise<{ credentialId: string } | null>} null on failure or cancellation
 */
export async function registerPasskey(user) {
  if (!isPasskeySupported()) return null;

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = new TextEncoder().encode(user.id).slice(0, 64);

  /** @type {PublicKeyCredentialCreationOptions} */
  const options = {
    challenge,
    rp: {
      name: "Wedding Manager",
      id: typeof location !== "undefined" ? location.hostname : "localhost",
    },
    user: {
      id: userId,
      name: user.name,
      displayName: user.displayName,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },   // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "preferred",
    },
    timeout: 60_000,
    attestation: "none",
  };

  try {
    const credential = /** @type {PublicKeyCredential} */ (
      await navigator.credentials.create({ publicKey: options })
    );
    if (!credential) return null;

    const credentialId = _bufToBase64(credential.rawId);
    // Scaffold: persist credential ID locally
    try {
      const existing = _loadCredentials();
      existing.push({ credentialId, userId: user.id, ts: Date.now() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch { /* storage disabled */ }

    return { credentialId };
  } catch (err) {
    // User cancelled or platform error — not a throw
    if (err instanceof Error && err.name !== "NotAllowedError") {
      console.warn("[webauthn] register failed:", err.message);
    }
    return null;
  }
}

/**
 * Authenticate using a stored passkey.
 *
 * @returns {Promise<{ credentialId: string } | null>} null on failure or cancellation
 */
export async function authenticatePasskey() {
  if (!isPasskeySupported()) return null;

  const stored = _loadCredentials();
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  /** @type {PublicKeyCredentialRequestOptions} */
  const options = {
    challenge,
    allowCredentials: stored.map((c) => ({
      id: _base64ToBuf(c.credentialId),
      type: /** @type {"public-key"} */ ("public-key"),
    })),
    userVerification: "preferred",
    timeout: 60_000,
    rpId: typeof location !== "undefined" ? location.hostname : "localhost",
  };

  try {
    const assertion = /** @type {PublicKeyCredential} */ (
      await navigator.credentials.get({ publicKey: options })
    );
    if (!assertion) return null;
    return { credentialId: _bufToBase64(assertion.rawId) };
  } catch (err) {
    if (err instanceof Error && err.name !== "NotAllowedError") {
      console.warn("[webauthn] authenticate failed:", err.message);
    }
    return null;
  }
}

/**
 * Remove all stored passkey credentials (sign-out / revoke).
 */
export function clearPasskeys() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage disabled */ }
}

/**
 * Return stored passkey credential stubs.
 * @returns {{ credentialId: string, userId: string, ts: number }[]}
 */
export function listPasskeys() {
  return _loadCredentials();
}

// ── Private helpers ────────────────────────────────────────────────────────

/** @returns {{ credentialId: string, userId: string, ts: number }[]} */
function _loadCredentials() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * @param {ArrayBuffer | ArrayBufferLike} buf
 * @returns {string}
 */
function _bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/**
 * @param {string} b64
 * @returns {ArrayBuffer}
 */
function _base64ToBuf(b64) {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}
