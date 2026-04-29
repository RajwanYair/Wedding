/**
 * tests/unit/push-notifications.test.mjs — Sprint 101
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isPushSupported,
  urlBase64ToUint8Array,
  serializeSubscription,
  getCachedSubscription,
  dispatchPush,
  sendPushToAdmins,
} from "../../src/services/notifications.js";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSub(overrides = {}) {
  return {
    endpoint: "https://push.example.com/sub/abc123",
    expirationTime: null,
    keys: { p256dh: "key-data", auth: "auth-data" },
    ...overrides,
  };
}

vi.mock("../../src/services/backend.js", () => ({
  callEdgeFunction: vi.fn().mockResolvedValue({ sent: 1, failed: 0 }),
}));

describe("isPushSupported", () => {
  it("returns false outside a browser context", () => {
    expect(isPushSupported()).toBe(false);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodes a URL-safe base64 string to Uint8Array", () => {
    const b64 = "AAAA"; // 3 zero bytes in base64
    const arr = urlBase64ToUint8Array(b64);
    expect(arr).toBeInstanceOf(Uint8Array);
    expect(arr.length).toBe(3);
  });

  it("handles URL-safe characters (- and _)", () => {
    const b64 = "SGVsbG8-V29ybGQ_"; // "Hello>World?" URL-safe encoded
    const arr = urlBase64ToUint8Array(b64);
    expect(arr).toBeInstanceOf(Uint8Array);
  });
});

describe("serializeSubscription", () => {
  it("extracts endpoint and keys from PushSubscription-like object", () => {
    const fakeSub = {
      endpoint: "https://push.example.com/abc",
      expirationTime: null,
      toJSON: () => ({ keys: { p256dh: "pkey", auth: "akey" } }),
    };
    const data = serializeSubscription(/** @type {any} */ (fakeSub));
    expect(data.endpoint).toBe("https://push.example.com/abc");
    expect(data.keys.p256dh).toBe("pkey");
    expect(data.keys.auth).toBe("akey");
    expect(data.expirationTime).toBeNull();
  });

  it("handles missing keys gracefully", () => {
    const fakeSub = {
      endpoint: "https://push.example.com/abc",
      expirationTime: null,
      toJSON: () => ({}),
    };
    const data = serializeSubscription(/** @type {any} */ (fakeSub));
    expect(data.keys.p256dh).toBe("");
    expect(data.keys.auth).toBe("");
  });
});

describe("getCachedSubscription", () => {
  it("returns null when nothing stored", () => {
    vi.stubGlobal("localStorage", /** @type {any} */ ({
      getItem: vi.fn().mockReturnValue(null),
    }));
    expect(getCachedSubscription()).toBeNull();
    vi.unstubAllGlobals();
  });

  it("returns parsed subscription data when stored", () => {
    const sub = makeSub();
    vi.stubGlobal("localStorage", /** @type {any} */ ({
      getItem: vi.fn().mockReturnValue(JSON.stringify(sub)),
    }));
    const result = getCachedSubscription();
    expect(result?.endpoint).toBe(sub.endpoint);
    vi.unstubAllGlobals();
  });

  it("returns null on parse error", () => {
    vi.stubGlobal("localStorage", /** @type {any} */ ({
      getItem: vi.fn().mockReturnValue("NOT JSON"),
    }));
    expect(getCachedSubscription()).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe("dispatchPush", () => {
  it("returns sent:0, failed:0 for empty subscriptions", async () => {
    const result = await dispatchPush([], { title: "Test" });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("calls callEdgeFunction with subs and payload", async () => {
    const { callEdgeFunction } = await import("../../src/services/backend.js");
    vi.mocked(callEdgeFunction).mockResolvedValueOnce({ sent: 2, failed: 0 });
    const result = await dispatchPush([makeSub(), makeSub()], { title: "Wedding" });
    expect(callEdgeFunction).toHaveBeenCalledWith("push-dispatcher", expect.objectContaining({
      subscriptions: expect.any(Array),
      payload: { title: "Wedding" },
    }));
    expect(result.sent).toBe(2);
  });
});

describe("sendPushToAdmins", () => {
  it("sends to subscriptions from store", async () => {
    const subs = [makeSub()];
    const storeGet = vi.fn().mockReturnValue(subs);
    const { callEdgeFunction } = await import("../../src/services/backend.js");
    vi.mocked(callEdgeFunction).mockResolvedValueOnce({ sent: 1, failed: 0 });
    const result = await sendPushToAdmins({ title: "Alert" }, storeGet);
    expect(result.sent).toBe(1);
  });

  it("returns sent:0 when store is empty", async () => {
    const storeGet = vi.fn().mockReturnValue([]);
    const result = await sendPushToAdmins({ title: "Alert" }, storeGet);
    expect(result.sent).toBe(0);
  });
});
