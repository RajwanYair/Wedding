/**
 * src/utils/push-manager.js
 * Web Push subscription lifecycle helpers — pure data, no browser API calls.
 * Serialises/deserialises PushSubscription objects, validates VAPID keys,
 * compares subscriptions, and builds endpoint metadata.
 *
 * @module push-manager
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Push permission state strings */
export const PUSH_PERMISSION = Object.freeze({
  GRANTED: "granted",
  DENIED: "denied",
  PROMPT: "prompt",
  UNSUPPORTED: "unsupported",
});

/** Well-known push service endpoint prefixes */
export const PUSH_SERVICES = Object.freeze({
  FCM: "fcm.googleapis.com",
  FCM_V1: "fcm.googleapis.com/v1",
  MOZILLA: "updates.push.services.mozilla.com",
  APPLE: "web.push.apple.com",
  WINDOWS: "wns.windows.com",
});

// ── Feature detection (pure data, no side-effects) ────────────────────────

/**
 * Returns true when the Push API + ServiceWorker are available.
 * Relies on globals — will return false in Node / test environments without stubs.
 * @returns {boolean}
 */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  );
}

/**
 * Returns the current notification permission state as one of PUSH_PERMISSION values.
 * Falls back to "unsupported" when the Notification API is absent.
 * @returns {string}
 */
export function getPermissionState() {
  if (typeof Notification === "undefined") return PUSH_PERMISSION.UNSUPPORTED;
  const p = Notification.permission;
  if (p === "granted") return PUSH_PERMISSION.GRANTED;
  if (p === "denied") return PUSH_PERMISSION.DENIED;
  return PUSH_PERMISSION.PROMPT;
}

// ── Serialisation ──────────────────────────────────────────────────────────

/**
 * Converts a PushSubscription (or subscription-shaped object) to a plain JSON-safe object.
 * @param {PushSubscription|{ endpoint: string, keys?: { p256dh?: string, auth?: string } }} sub
 * @returns {{ endpoint: string, keys: { p256dh: string, auth: string } }}
 */
export function serializeSubscription(sub) {
  if (!sub || typeof sub.endpoint !== "string") {
    throw new Error("Invalid subscription: missing endpoint");
  }

  let p256dh = "";
  let auth = "";

  if (typeof sub.getKey === "function") {
    const p256dhBuf = sub.getKey("p256dh");
    const authBuf = sub.getKey("auth");
    p256dh = p256dhBuf ? btoa(String.fromCharCode(...new Uint8Array(p256dhBuf))) : "";
    auth = authBuf ? btoa(String.fromCharCode(...new Uint8Array(authBuf))) : "";
  } else if (sub.keys) {
    p256dh = sub.keys.p256dh ?? "";
    auth = sub.keys.auth ?? "";
  }

  return { endpoint: sub.endpoint, keys: { p256dh, auth } };
}

/**
 * Validates and deserialises a plain push subscription object.
 * Returns null for invalid input.
 * @param {object|null} plain
 * @returns {{ endpoint: string, keys: { p256dh: string, auth: string } } | null}
 */
export function deserializeSubscription(plain) {
  if (!plain || typeof plain.endpoint !== "string" || !plain.endpoint) return null;
  const p256dh = plain.keys?.p256dh ?? "";
  const auth = plain.keys?.auth ?? "";
  return { endpoint: plain.endpoint, keys: { p256dh, auth } };
}

// ── Comparison ─────────────────────────────────────────────────────────────

/**
 * Returns true if two serialised push subscriptions refer to the same endpoint.
 * @param {{ endpoint: string }|null} a
 * @param {{ endpoint: string }|null} b
 * @returns {boolean}
 */
export function compareSubscriptions(a, b) {
  if (!a || !b) return false;
  return a.endpoint === b.endpoint;
}

/**
 * Returns true if a subscription is likely expired based on its expiration time.
 * @param {{ expirationTime?: number|null }} sub
 * @param {number} [nowMs=Date.now()]
 * @returns {boolean}
 */
export function isSubscriptionExpired(sub, nowMs = Date.now()) {
  if (!sub) return true;
  if (!sub.expirationTime) return false;
  return sub.expirationTime < nowMs;
}

// ── VAPID helpers ──────────────────────────────────────────────────────────

/**
 * Validates that a VAPID public key looks like a base64url string of the right length.
 * @param {string} key
 * @returns {boolean}
 */
export function isValidVapidKey(key) {
  if (typeof key !== "string") return false;
  // Unpadded base64url: 65 bytes uncompressed public key → 87 base64url chars
  return /^[A-Za-z0-9\-_]{86,88}$/.test(key);
}

/**
 * Builds the `applicationServerKey` Uint8Array from a VAPID base64url public key.
 * Suitable for passing to `pushManager.subscribe({ applicationServerKey })`.
 * Returns null for invalid keys.
 * @param {string} base64urlKey
 * @returns {Uint8Array|null}
 */
export function buildApplicationServerKey(base64urlKey) {
  if (!isValidVapidKey(base64urlKey)) return null;
  try {
    // Convert base64url → base64 → binary
    const padded = base64urlKey.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (padded.length % 4)) % 4;
    const b64 = padded + "=".repeat(pad);
    const binary = atob(b64);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

// ── Endpoint metadata ──────────────────────────────────────────────────────

/**
 * Returns metadata about a push subscription endpoint.
 * @param {string} endpoint
 * @returns {{ service: string, isKnown: boolean, origin: string }}
 */
export function buildPushEndpointInfo(endpoint) {
  if (typeof endpoint !== "string" || !endpoint) {
    return { service: "unknown", isKnown: false, origin: "" };
  }

  let origin = "";
  try {
    origin = new URL(endpoint).origin;
  } catch {
    return { service: "unknown", isKnown: false, origin: "" };
  }

  for (const [name, fragment] of Object.entries(PUSH_SERVICES)) {
    if (endpoint.includes(fragment)) {
      return { service: name, isKnown: true, origin };
    }
  }

  return { service: "unknown", isKnown: false, origin };
}

/**
 * Builds a VAPID Authorization header value string (without network calls).
 * In production use a proper JWT library; this helper only assembles the header text.
 * @param {{ token: string, publicKey: string }} opts
 * @returns {string}
 */
export function buildVapidAuthHeader({ token, publicKey }) {
  if (!token || !publicKey) throw new Error("token and publicKey are required");
  return `vapid t=${token},k=${publicKey}`;
}
