/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isCacheApiSupported,
  isSwSupported,
  listCacheNames,
  getCacheUrls,
  getCacheEntryCount,
  deleteCache,
  pruneOldCaches,
  pruneVersionedCaches,
  prefetchUrls,
  isCached,
  getCachedResponse,
  postMessageToSW,
  skipWaiting,
} from "../../src/utils/service-worker-utils.js";

// ── helpers ────────────────────────────────────────────────────────────────

/** Build a minimal mock Cache object backed by a Map. */
function makeMockCache(initialEntries = {}) {
  const store = new Map();
  for (const [url, body] of Object.entries(initialEntries)) {
    store.set(url, new Response(body, { status: 200 }));
  }
  return {
    keys: vi.fn(async () => [...store.keys()].map((url) => new Request(url))),
    match: vi.fn(async (urlOrReq) => {
      const url = typeof urlOrReq === "string" ? urlOrReq : urlOrReq.url;
      return store.get(url) ?? undefined;
    }),
    put: vi.fn(async (urlOrReq, resp) => {
      const url = typeof urlOrReq === "string" ? urlOrReq : urlOrReq.url;
      store.set(url, resp);
    }),
    delete: vi.fn(async (urlOrReq) => {
      const url = typeof urlOrReq === "string" ? urlOrReq : urlOrReq.url;
      return store.delete(url);
    }),
    _store: store,
  };
}

/** Build a minimal CacheStorage mock. */
function makeMockCaches(cacheMap = {}) {
  const cacheObjects = new Map(
    Object.entries(cacheMap).map(([name, entries]) => [
      name,
      makeMockCache(entries),
    ]),
  );
  return {
    keys: vi.fn(async () => [...cacheObjects.keys()]),
    open: vi.fn(async (name) => {
      if (!cacheObjects.has(name)) cacheObjects.set(name, makeMockCache());
      return cacheObjects.get(name);
    }),
    delete: vi.fn(async (name) => cacheObjects.delete(name)),
    match: vi.fn(async (url) => {
      for (const cache of cacheObjects.values()) {
        const hit = await cache.match(url);
        if (hit) return hit;
      }
      return undefined;
    }),
    _caches: cacheObjects,
  };
}

// ── isCacheApiSupported ─────────────────────────────────────────────────────

describe("isCacheApiSupported()", () => {
  it("returns false when caches is undefined", () => {
    const orig = globalThis.caches;
    Object.defineProperty(globalThis, "caches", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(isCacheApiSupported()).toBe(false);
    Object.defineProperty(globalThis, "caches", {
      value: orig,
      writable: true,
      configurable: true,
    });
  });

  it("returns true when caches.open is a function", () => {
    const mockCaches = makeMockCaches();
    Object.defineProperty(globalThis, "caches", {
      value: mockCaches,
      writable: true,
      configurable: true,
    });
    expect(isCacheApiSupported()).toBe(true);
  });
});

// ── isSwSupported ───────────────────────────────────────────────────────────

describe("isSwSupported()", () => {
  it("returns false when navigator is undefined", () => {
    const orig = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(isSwSupported()).toBe(false);
    Object.defineProperty(globalThis, "navigator", {
      value: orig,
      writable: true,
      configurable: true,
    });
  });

  it("returns false when navigator has no serviceWorker property", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(isSwSupported()).toBe(false);
  });

  it("returns true when navigator.serviceWorker exists", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { serviceWorker: {} },
      writable: true,
      configurable: true,
    });
    expect(isSwSupported()).toBe(true);
  });
});

// ── listCacheNames ──────────────────────────────────────────────────────────

describe("listCacheNames()", () => {
  it("returns empty array when Cache API unavailable", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(await listCacheNames()).toEqual([]);
  });

  it("returns array of cache names", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: makeMockCaches({ "v1-static": {}, "v1-dynamic": {} }),
      writable: true,
      configurable: true,
    });
    const names = await listCacheNames();
    expect(names).toContain("v1-static");
    expect(names).toContain("v1-dynamic");
  });
});

// ── getCacheUrls ─────────────────────────────────────────────────────────────

describe("getCacheUrls()", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "caches", {
      value: makeMockCaches({
        assets: {
          "https://example.com/app.js": "// js",
          "https://example.com/app.css": "/* css */",
        },
      }),
      writable: true,
      configurable: true,
    });
  });

  it("returns empty array when API unavailable", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(await getCacheUrls("assets")).toEqual([]);
  });

  it("returns list of cached URLs for a named cache", async () => {
    const urls = await getCacheUrls("assets");
    expect(urls).toHaveLength(2);
    expect(urls).toContain("https://example.com/app.js");
    expect(urls).toContain("https://example.com/app.css");
  });

  it("returns empty array for non-existent cache (opens empty cache)", async () => {
    const urls = await getCacheUrls("nonexistent");
    expect(urls).toEqual([]);
  });
});

// ── getCacheEntryCount ────────────────────────────────────────────────────────

describe("getCacheEntryCount()", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "caches", {
      value: makeMockCaches({
        a: { "https://x.com/1": "1", "https://x.com/2": "2" },
        b: { "https://x.com/3": "3" },
      }),
      writable: true,
      configurable: true,
    });
  });

  it("returns 0 when API unavailable", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(await getCacheEntryCount()).toBe(0);
  });

  it("returns total across all caches when no name given", async () => {
    expect(await getCacheEntryCount()).toBe(3);
  });

  it("returns count for a specific named cache", async () => {
    expect(await getCacheEntryCount("a")).toBe(2);
    expect(await getCacheEntryCount("b")).toBe(1);
  });
});

// ── deleteCache ───────────────────────────────────────────────────────────────

describe("deleteCache()", () => {
  it("returns false when API unavailable", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(await deleteCache("x")).toBe(false);
  });

  it("returns true when named cache exists and is deleted", async () => {
    const mockCaches = makeMockCaches({ "old-v1": {} });
    Object.defineProperty(globalThis, "caches", {
      value: mockCaches,
      writable: true,
      configurable: true,
    });
    const result = await deleteCache("old-v1");
    expect(result).toBe(true);
    expect(await mockCaches.keys()).not.toContain("old-v1");
  });

  it("returns false when cache does not exist", async () => {
    const mockCaches = makeMockCaches({});
    Object.defineProperty(globalThis, "caches", {
      value: mockCaches,
      writable: true,
      configurable: true,
    });
    expect(await deleteCache("missing")).toBe(false);
  });
});

// ── pruneOldCaches ────────────────────────────────────────────────────────────

describe("pruneOldCaches()", () => {
  it("returns empty array when API unavailable", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(await pruneOldCaches()).toEqual([]);
  });

  it("deletes all caches when no keepPattern given", async () => {
    const mockCaches = makeMockCaches({ a: {}, b: {}, c: {} });
    Object.defineProperty(globalThis, "caches", {
      value: mockCaches,
      writable: true,
      configurable: true,
    });
    const deleted = await pruneOldCaches();
    expect(deleted).toHaveLength(3);
    expect(await mockCaches.keys()).toHaveLength(0);
  });

  it("keeps caches matching keepPattern", async () => {
    const mockCaches = makeMockCaches({
      "wedding-v9.6.0": {},
      "wedding-v9.5.0": {},
      "third-party-lib": {},
    });
    Object.defineProperty(globalThis, "caches", {
      value: mockCaches,
      writable: true,
      configurable: true,
    });
    const deleted = await pruneOldCaches(/^wedding-v9\.6\.0$/);
    expect(deleted).toContain("wedding-v9.5.0");
    expect(deleted).toContain("third-party-lib");
    expect(deleted).not.toContain("wedding-v9.6.0");
    expect(await mockCaches.keys()).toContain("wedding-v9.6.0");
  });
});

// ── pruneVersionedCaches ──────────────────────────────────────────────────────

describe("pruneVersionedCaches()", () => {
  it("returns empty array when API unavailable", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(await pruneVersionedCaches("wedding-v", "wedding-v9.6.0")).toEqual(
      [],
    );
  });

  it("deletes old versioned caches, keeps current and unrelated", async () => {
    const mockCaches = makeMockCaches({
      "wedding-v9.6.0": {},
      "wedding-v9.5.0": {},
      "wedding-v9.4.0": {},
      "other-cache": {},
    });
    Object.defineProperty(globalThis, "caches", {
      value: mockCaches,
      writable: true,
      configurable: true,
    });
    const deleted = await pruneVersionedCaches("wedding-v", "wedding-v9.6.0");
    expect(deleted).toContain("wedding-v9.5.0");
    expect(deleted).toContain("wedding-v9.4.0");
    expect(deleted).not.toContain("wedding-v9.6.0");
    expect(deleted).not.toContain("other-cache");
  });

  it("deletes nothing when all versioned caches match current", async () => {
    const mockCaches = makeMockCaches({ "wedding-v9.6.0": {} });
    Object.defineProperty(globalThis, "caches", {
      value: mockCaches,
      writable: true,
      configurable: true,
    });
    expect(await pruneVersionedCaches("wedding-v", "wedding-v9.6.0")).toEqual(
      [],
    );
  });
});

// ── isCached ──────────────────────────────────────────────────────────────────

describe("isCached()", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "caches", {
      value: makeMockCaches({
        assets: { "https://example.com/a.js": "data" },
      }),
      writable: true,
      configurable: true,
    });
  });

  it("returns false when API unavailable", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(await isCached("assets", "https://example.com/a.js")).toBe(false);
  });

  it("returns true for a cached URL", async () => {
    expect(await isCached("assets", "https://example.com/a.js")).toBe(true);
  });

  it("returns false for a URL not in cache", async () => {
    expect(await isCached("assets", "https://example.com/missing.js")).toBe(
      false,
    );
  });
});

// ── getCachedResponse ─────────────────────────────────────────────────────────

describe("getCachedResponse()", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "caches", {
      value: makeMockCaches({
        assets: { "https://example.com/b.css": "body{}" },
      }),
      writable: true,
      configurable: true,
    });
  });

  it("returns null when API unavailable", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(
      await getCachedResponse("assets", "https://example.com/b.css"),
    ).toBeNull();
  });

  it("returns Response when URL is cached", async () => {
    const resp = await getCachedResponse("assets", "https://example.com/b.css");
    expect(resp).not.toBeNull();
    expect(resp).toBeInstanceOf(Response);
  });

  it("returns null when URL is not cached", async () => {
    expect(
      await getCachedResponse("assets", "https://example.com/nope.css"),
    ).toBeNull();
  });
});

// ── prefetchUrls ─────────────────────────────────────────────────────────────

describe("prefetchUrls()", () => {
  it("returns all as errors when API unavailable", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const result = await prefetchUrls("assets", ["https://a.com/f.js"]);
    expect(result.errors).toContain("https://a.com/f.js");
  });

  it("skips URLs already in cache", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: makeMockCaches({
        assets: { "https://example.com/c.js": "data" },
      }),
      writable: true,
      configurable: true,
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("body", { status: 200 }));
    const result = await prefetchUrls("assets", ["https://example.com/c.js"]);
    expect(result.skipped).toContain("https://example.com/c.js");
    expect(result.added).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it("adds new URLs to cache via fetch", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: makeMockCaches({ assets: {} }),
      writable: true,
      configurable: true,
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("body", { status: 200 }));
    const result = await prefetchUrls("assets", ["https://example.com/new.js"]);
    expect(result.added).toContain("https://example.com/new.js");
    expect(result.errors).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it("records error when fetch fails", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: makeMockCaches({ assets: {} }),
      writable: true,
      configurable: true,
    });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));
    const result = await prefetchUrls("assets", [
      "https://example.com/fail.js",
    ]);
    expect(result.errors).toContain("https://example.com/fail.js");
    vi.restoreAllMocks();
  });

  it("records error when response is not ok", async () => {
    Object.defineProperty(globalThis, "caches", {
      value: makeMockCaches({ assets: {} }),
      writable: true,
      configurable: true,
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 404 }),
    );
    const result = await prefetchUrls("assets", ["https://example.com/404.js"]);
    expect(result.errors).toContain("https://example.com/404.js");
    vi.restoreAllMocks();
  });
});

// ── postMessageToSW ────────────────────────────────────────────────────────────

describe("postMessageToSW()", () => {
  it("returns false when SW not supported", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(postMessageToSW({ type: "PING" })).toBe(false);
  });

  it("returns false when no active controller", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { serviceWorker: { controller: null } },
      writable: true,
      configurable: true,
    });
    expect(postMessageToSW({ type: "PING" })).toBe(false);
  });

  it("posts message and returns true when controller exists", () => {
    const postMessage = vi.fn();
    Object.defineProperty(globalThis, "navigator", {
      value: { serviceWorker: { controller: { postMessage } } },
      writable: true,
      configurable: true,
    });
    const result = postMessageToSW({ type: "PING" });
    expect(result).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({ type: "PING" });
  });
});

// ── skipWaiting ────────────────────────────────────────────────────────────────

describe("skipWaiting()", () => {
  it("returns false when no waiting worker", () => {
    const reg = { waiting: null };
    expect(skipWaiting(reg)).toBe(false);
  });

  it("posts SKIP_WAITING and returns true when waiting worker exists", () => {
    const postMessage = vi.fn();
    const reg = { waiting: { postMessage } };
    expect(skipWaiting(reg)).toBe(true);
    expect(postMessage).toHaveBeenCalledWith("SKIP_WAITING");
  });
});
