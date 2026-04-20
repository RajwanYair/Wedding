import { describe, it, expect, vi, afterEach } from "vitest";
import {
  PUSH_PERMISSION,
  PUSH_SERVICES,
  isPushSupported,
  getPermissionState,
  serializeSubscription,
  deserializeSubscription,
  compareSubscriptions,
  isSubscriptionExpired,
  isValidVapidKey,
  buildApplicationServerKey,
  buildPushEndpointInfo,
  buildVapidAuthHeader,
} from "../../src/utils/push-manager.js";

// ── Constants ─────────────────────────────────────────────────────────────

describe("PUSH_PERMISSION", () => {
  it("is frozen", () => expect(Object.isFrozen(PUSH_PERMISSION)).toBe(true));
  it("has expected values", () => {
    expect(PUSH_PERMISSION.GRANTED).toBe("granted");
    expect(PUSH_PERMISSION.DENIED).toBe("denied");
    expect(PUSH_PERMISSION.PROMPT).toBe("prompt");
    expect(PUSH_PERMISSION.UNSUPPORTED).toBe("unsupported");
  });
});

describe("PUSH_SERVICES", () => {
  it("is frozen", () => expect(Object.isFrozen(PUSH_SERVICES)).toBe(true));
  it("has FCM", () => expect(PUSH_SERVICES.FCM).toBe("fcm.googleapis.com"));
  it("has MOZILLA", () => expect(PUSH_SERVICES.MOZILLA).toBeDefined());
});

// ── isPushSupported ───────────────────────────────────────────────────────

describe("isPushSupported()", () => {
  it("returns false in non-browser env", () => {
    expect(isPushSupported()).toBe(false);
  });
});

// ── getPermissionState ────────────────────────────────────────────────────

describe("getPermissionState()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns unsupported when Notification is not defined", () => {
    expect(getPermissionState()).toBe(PUSH_PERMISSION.UNSUPPORTED);
  });

  it("returns granted", () => {
    vi.stubGlobal("Notification", { permission: "granted" });
    expect(getPermissionState()).toBe(PUSH_PERMISSION.GRANTED);
  });

  it("returns denied", () => {
    vi.stubGlobal("Notification", { permission: "denied" });
    expect(getPermissionState()).toBe(PUSH_PERMISSION.DENIED);
  });

  it("returns prompt for default", () => {
    vi.stubGlobal("Notification", { permission: "default" });
    expect(getPermissionState()).toBe(PUSH_PERMISSION.PROMPT);
  });
});

// ── serializeSubscription ─────────────────────────────────────────────────

describe("serializeSubscription()", () => {
  it("throws for null", () => {
    expect(() => serializeSubscription(null)).toThrow("Invalid subscription");
  });

  it("throws for object without endpoint", () => {
    expect(() => serializeSubscription({ keys: {} })).toThrow();
  });

  it("serialises plain subscription with keys", () => {
    const sub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "AAAA", auth: "BBBB" },
    };
    const result = serializeSubscription(sub);
    expect(result.endpoint).toBe(sub.endpoint);
    expect(result.keys.p256dh).toBe("AAAA");
    expect(result.keys.auth).toBe("BBBB");
  });

  it("uses getKey() when available", () => {
    // Build minimal ArrayBuffer-returning mock
    const enc = new TextEncoder();
    const p256dhBuf = enc.encode("fakekey").buffer;
    const authBuf = enc.encode("fakeauth").buffer;
    const sub = {
      endpoint: "https://fcm.googleapis.com/test",
      getKey(type) {
        return type === "p256dh" ? p256dhBuf : authBuf;
      },
    };
    const result = serializeSubscription(sub);
    expect(result.keys.p256dh).toBeTruthy();
    expect(result.keys.auth).toBeTruthy();
  });
});

// ── deserializeSubscription ───────────────────────────────────────────────

describe("deserializeSubscription()", () => {
  it("returns null for null", () => expect(deserializeSubscription(null)).toBeNull());
  it("returns null for empty endpoint", () => expect(deserializeSubscription({ endpoint: "" })).toBeNull());

  it("returns normalised object", () => {
    const plain = { endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "A", auth: "B" } };
    const result = deserializeSubscription(plain);
    expect(result.endpoint).toBe(plain.endpoint);
    expect(result.keys.p256dh).toBe("A");
    expect(result.keys.auth).toBe("B");
  });

  it("defaults keys to empty strings when missing", () => {
    const result = deserializeSubscription({ endpoint: "https://example.com/push" });
    expect(result.keys.p256dh).toBe("");
    expect(result.keys.auth).toBe("");
  });
});

// ── compareSubscriptions ──────────────────────────────────────────────────

describe("compareSubscriptions()", () => {
  it("returns false for null inputs", () => expect(compareSubscriptions(null, null)).toBe(false));
  it("returns false when one is null", () => {
    expect(compareSubscriptions({ endpoint: "https://a.com" }, null)).toBe(false);
  });

  it("returns true for same endpoint", () => {
    const a = { endpoint: "https://fcm.googleapis.com/abc" };
    expect(compareSubscriptions(a, { ...a })).toBe(true);
  });

  it("returns false for different endpoints", () => {
    expect(compareSubscriptions({ endpoint: "https://a.com" }, { endpoint: "https://b.com" })).toBe(false);
  });
});

// ── isSubscriptionExpired ─────────────────────────────────────────────────

describe("isSubscriptionExpired()", () => {
  it("returns true for null subscription", () => expect(isSubscriptionExpired(null)).toBe(true));

  it("returns false when expirationTime is null", () => {
    expect(isSubscriptionExpired({ expirationTime: null })).toBe(false);
  });

  it("returns true when expiration is in the past", () => {
    expect(isSubscriptionExpired({ expirationTime: Date.now() - 1000 })).toBe(true);
  });

  it("returns false when expiration is in the future", () => {
    expect(isSubscriptionExpired({ expirationTime: Date.now() + 60_000 })).toBe(false);
  });
});

// ── isValidVapidKey ───────────────────────────────────────────────────────

// A 87-char all-zero base64url key (65 zero bytes — valid VAPID key shape)
const VALID_VAPID_KEY = "A".repeat(87);

describe("isValidVapidKey()", () => {
  it("accepts an 87-char base64url string", () => {
    expect(isValidVapidKey(VALID_VAPID_KEY)).toBe(true);
  });

  it("rejects non-string", () => expect(isValidVapidKey(12345)).toBe(false));
  it("rejects short key", () => expect(isValidVapidKey("abc")).toBe(false));
  it("rejects key with invalid chars", () => {
    const bad = "A".repeat(84) + "==";
    expect(isValidVapidKey(bad)).toBe(false);
  });
});

// ── buildApplicationServerKey ─────────────────────────────────────────────

describe("buildApplicationServerKey()", () => {
  it("returns null for invalid key", () => {
    expect(buildApplicationServerKey("short")).toBeNull();
  });

  it("returns Uint8Array for valid key", () => {
    const result = buildApplicationServerKey(VALID_VAPID_KEY);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(65);
  });
});

// ── buildPushEndpointInfo ─────────────────────────────────────────────────

describe("buildPushEndpointInfo()", () => {
  it("returns unknown for empty string", () => {
    expect(buildPushEndpointInfo("").isKnown).toBe(false);
  });

  it("identifies FCM endpoint", () => {
    const info = buildPushEndpointInfo("https://fcm.googleapis.com/fcm/send/abc");
    expect(info.service).toBe("FCM");
    expect(info.isKnown).toBe(true);
  });

  it("identifies Mozilla endpoint", () => {
    const info = buildPushEndpointInfo("https://updates.push.services.mozilla.com/wpush/v2/abc");
    expect(info.isKnown).toBe(true);
  });

  it("returns unknown for unrecognised origin", () => {
    const info = buildPushEndpointInfo("https://push.example.com/endpoint");
    expect(info.service).toBe("unknown");
    expect(info.isKnown).toBe(false);
    expect(info.origin).toBe("https://push.example.com");
  });

  it("returns unknown for malformed URL", () => {
    const info = buildPushEndpointInfo("not-a-url");
    expect(info.isKnown).toBe(false);
    expect(info.origin).toBe("");
  });
});

// ── buildVapidAuthHeader ──────────────────────────────────────────────────

describe("buildVapidAuthHeader()", () => {
  it("returns vapid header string", () => {
    const header = buildVapidAuthHeader({ token: "tok123", publicKey: "pubkey456" });
    expect(header).toMatch(/^vapid t=tok123,k=pubkey456$/);
  });

  it("throws without token", () => {
    expect(() => buildVapidAuthHeader({ token: "", publicKey: "k" })).toThrow();
  });

  it("throws without publicKey", () => {
    expect(() => buildVapidAuthHeader({ token: "t", publicKey: "" })).toThrow();
  });
});
