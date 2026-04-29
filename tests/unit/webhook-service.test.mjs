/**
 * tests/unit/webhook-service.test.mjs — Sprint 111
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  registerWebhook, getWebhook, listWebhooks,
  updateWebhook, removeWebhook,
  dispatchWebhookEvent, getWebhookDeliveries,
  verifyWebhookSignature,
} = await import("../../src/services/outreach.js");

function seed() {
  initStore({
    webhooks:          { value: [] },
    webhookDeliveries: { value: [] },
    guests:            { value: [] },
    weddingInfo:       { value: {} },
  });
}

beforeEach(seed);

describe("registerWebhook", () => {
  it("returns a string id", () => {
    const id = registerWebhook({ url: "https://example.com", events: ["guest.rsvp"] });
    expect(typeof id).toBe("string");
  });

  it("stores the webhook", () => {
    const id = registerWebhook({ url: "https://a.com", events: ["x"] });
    expect(getWebhook(id)).toBeTruthy();
  });

  it("throws for missing url", () => {
    expect(() => registerWebhook({ url: "", events: ["x"] })).toThrow("url");
  });

  it("throws for empty events array", () => {
    expect(() => registerWebhook({ url: "https://a.com", events: [] })).toThrow();
  });

  it("deduplicates events", () => {
    const id = registerWebhook({ url: "https://a.com", events: ["x", "x", "y"] });
    expect(getWebhook(id)?.events).toHaveLength(2);
  });
});

describe("listWebhooks", () => {
  it("lists all without filter", () => {
    registerWebhook({ url: "https://a.com", events: ["a"] });
    registerWebhook({ url: "https://b.com", events: ["b"] });
    expect(listWebhooks()).toHaveLength(2);
  });

  it("filters by event", () => {
    registerWebhook({ url: "https://a.com", events: ["guest.rsvp"] });
    registerWebhook({ url: "https://b.com", events: ["vendor.added"] });
    expect(listWebhooks("guest.rsvp")).toHaveLength(1);
  });
});

describe("updateWebhook / removeWebhook", () => {
  it("updates active flag", () => {
    const id = registerWebhook({ url: "https://a.com", events: ["x"] });
    updateWebhook(id, { active: false });
    expect(getWebhook(id)?.active).toBe(false);
  });

  it("removes a webhook", () => {
    const id = registerWebhook({ url: "https://a.com", events: ["x"] });
    removeWebhook(id);
    expect(getWebhook(id)).toBeNull();
  });

  it("returns false for unknown id", () => {
    expect(updateWebhook("unknown", { active: false })).toBe(false);
    expect(removeWebhook("unknown")).toBe(false);
  });
});

describe("dispatchWebhookEvent", () => {
  it("delivers to matching active webhooks", async () => {
    registerWebhook({ url: "https://hook.io/test", events: ["guest.rsvp"] });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const result = await dispatchWebhookEvent("guest.rsvp", { id: "g1" }, { fetcher: fetchMock });
    expect(result.delivered).toBe(1);
    expect(result.failed).toBe(0);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("skips inactive webhooks", async () => {
    const id = registerWebhook({ url: "https://a.com", events: ["x"] });
    updateWebhook(id, { active: false });
    const fetchMock = vi.fn();
    const result = await dispatchWebhookEvent("x", {}, { fetcher: fetchMock });
    expect(result.delivered).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records failed delivery on HTTP error", async () => {
    const id = registerWebhook({ url: "https://a.com", events: ["x"] });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const result = await dispatchWebhookEvent("x", {}, { fetcher: fetchMock });
    expect(result.failed).toBe(1);
    const deliveries = getWebhookDeliveries(id);
    expect(deliveries[0].status).toBe("failed");
  });

  it("records failed delivery on fetch throw", async () => {
    const id = registerWebhook({ url: "https://a.com", events: ["x"] });
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    const result = await dispatchWebhookEvent("x", {}, { fetcher: fetchMock });
    expect(result.failed).toBe(1);
    expect(getWebhookDeliveries(id)[0].error).toMatch(/network error/);
  });
});

describe("verifyWebhookSignature", () => {
  it("returns true for valid signature", async () => {
    const secret = "my-secret-key";
    const body   = JSON.stringify({ event: "test", payload: {} });
    // Generate a real HMAC via webhook-service then verify it
    const id = registerWebhook({ url: "https://a.com", events: ["test"], secret });
    const fetchMock = vi.fn().mockImplementation((_url, opts) => {
      const sig = opts.headers["x-webhook-signature"];
      return Promise.resolve({ ok: true, status: 200, _sig: sig });
    });
    await dispatchWebhookEvent("test", {}, { fetcher: fetchMock });
    const callArgs = fetchMock.mock.calls[0][1];
    const sig = callArgs.headers["x-webhook-signature"];
    expect(typeof sig).toBe("string");
    expect(sig).toMatch(/^sha256=/);
    // Verify the signature against the dispatched body
    const verifyResult = await verifyWebhookSignature(secret, callArgs.body, sig);
    expect(verifyResult).toBe(true);
  });

  it("returns false for invalid signature", async () => {
    const result = await verifyWebhookSignature("secret", "body", "sha256=badhash");
    expect(result).toBe(false);
  });

  it("returns false for missing sha256= prefix", async () => {
    const result = await verifyWebhookSignature("secret", "body", "invalid");
    expect(result).toBe(false);
  });
});
