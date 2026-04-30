/**
 * tests/unit/webhooks.test.mjs — S451: coverage for src/utils/webhooks.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── localStorage mock ─────────────────────────────────────────────────────

const _store = new Map();
const _localStorage = {
  getItem: vi.fn((k) => _store.get(k) ?? null),
  setItem: vi.fn((k, v) => _store.set(k, v)),
  removeItem: vi.fn((k) => _store.delete(k)),
  clear: vi.fn(() => _store.clear()),
};
vi.stubGlobal("localStorage", _localStorage);

// UUID mock
let _uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => `uuid-${++_uuidCounter}`),
});

// Fetch mock
const _fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
vi.stubGlobal("fetch", _fetchMock);

import {
  addWebhook,
  listWebhooks,
  removeWebhook,
  pingWebhook,
} from "../../src/utils/webhooks.js";

const STORAGE_KEY = "wedding_v1_webhooks";

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
  _uuidCounter = 0;
  _fetchMock.mockResolvedValue({ ok: true });
});

describe("webhooks — addWebhook()", () => {
  it("adds a new webhook and returns the entry", () => {
    const entry = addWebhook({ url: "https://example.com/hook", events: ["rsvp.confirmed"] });
    expect(entry.id).toBe("uuid-1");
    expect(entry.url).toBe("https://example.com/hook");
    expect(entry.events).toEqual(["rsvp.confirmed"]);
    expect(typeof entry.createdAt).toBe("string");
  });

  it("persists to localStorage", () => {
    addWebhook({ url: "https://a.com", events: ["guest.added"] });
    expect(_localStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining("https://a.com"),
    );
  });

  it("accumulates multiple webhooks", () => {
    addWebhook({ url: "https://a.com", events: ["rsvp.confirmed"] });
    addWebhook({ url: "https://b.com", events: ["rsvp.declined"] });
    const list = listWebhooks();
    expect(list).toHaveLength(2);
  });
});

describe("webhooks — listWebhooks()", () => {
  it("returns empty array when no webhooks stored", () => {
    expect(listWebhooks()).toEqual([]);
  });

  it("returns stored webhooks", () => {
    addWebhook({ url: "https://x.com", events: ["rsvp.confirmed"] });
    const list = listWebhooks();
    expect(list).toHaveLength(1);
    expect(list[0].url).toBe("https://x.com");
  });

  it("handles corrupt localStorage gracefully", () => {
    _store.set(STORAGE_KEY, "{{invalid json}}");
    expect(listWebhooks()).toEqual([]);
  });
});

describe("webhooks — removeWebhook()", () => {
  it("removes the webhook with the given id", () => {
    const entry = addWebhook({ url: "https://a.com", events: ["rsvp.confirmed"] });
    addWebhook({ url: "https://b.com", events: ["rsvp.declined"] });
    removeWebhook(entry.id);
    const list = listWebhooks();
    expect(list).toHaveLength(1);
    expect(list[0].url).toBe("https://b.com");
  });

  it("is a no-op for unknown id", () => {
    addWebhook({ url: "https://a.com", events: ["rsvp.confirmed"] });
    removeWebhook("non-existent-id");
    expect(listWebhooks()).toHaveLength(1);
  });
});

describe("webhooks — pingWebhook()", () => {
  it("returns false for unknown id", async () => {
    const result = await pingWebhook("missing");
    expect(result).toBe(false);
  });

  it("calls fetch with the webhook URL and returns true on ok response", async () => {
    const entry = addWebhook({ url: "https://hook.example.com/ping", events: ["rsvp.confirmed"] });
    const result = await pingWebhook(entry.id);
    expect(result).toBe(true);
    expect(_fetchMock).toHaveBeenCalledWith(
      "https://hook.example.com/ping",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns false when fetch throws", async () => {
    _fetchMock.mockRejectedValueOnce(new Error("network error"));
    const entry = addWebhook({ url: "https://fail.example.com", events: [] });
    const result = await pingWebhook(entry.id);
    expect(result).toBe(false);
  });

  it("returns false when response is not ok", async () => {
    _fetchMock.mockResolvedValueOnce({ ok: false });
    const entry = addWebhook({ url: "https://bad.example.com", events: [] });
    const result = await pingWebhook(entry.id);
    expect(result).toBe(false);
  });
});
