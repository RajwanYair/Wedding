/**
 * tests/unit/background-sync.test.mjs — Background Sync API wrapper (Sprint 52)
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  isBgSyncSupported,
  isPeriodicSyncSupported,
  buildSyncTag,
  parseSyncTag,
  registerSync,
  getPendingSyncs,
  registerPeriodicSync,
  unregisterPeriodicSync,
  getPeriodicSyncs,
  enqueueSync,
} from "../../src/utils/background-sync.js";

// ── Mock ServiceWorker infra ───────────────────────────────────────────────

function buildMockRegistration({
  hasSyncApi = true,
  hasPeriodicApi = true,
} = {}) {
  const syncTags = [];
  const periodicTags = [];

  const mock = {
    sync: hasSyncApi
      ? {
          register: vi.fn(async (tag) => {
            syncTags.push(tag);
          }),
          getTags: vi.fn(async () => [...syncTags]),
        }
      : undefined,
    periodicSync: hasPeriodicApi
      ? {
          register: vi.fn(async (tag) => {
            periodicTags.push(tag);
          }),
          unregister: vi.fn(async (tag) => {
            const idx = periodicTags.indexOf(tag);
            if (idx !== -1) periodicTags.splice(idx, 1);
          }),
          getTags: vi.fn(async () => [...periodicTags]),
        }
      : undefined,
    _syncTags: syncTags,
    _periodicTags: periodicTags,
  };
  return mock;
}

function installServiceWorkerAPIs({
  hasSyncApi = true,
  hasPeriodicApi = true,
} = {}) {
  const mockReg = buildMockRegistration({ hasSyncApi, hasPeriodicApi });

  // Install ServiceWorkerRegistration.prototype markers
  globalThis.ServiceWorkerRegistration = class ServiceWorkerRegistration {};
  if (hasSyncApi) {
    globalThis.ServiceWorkerRegistration.prototype.sync = {};
  } else {
    delete globalThis.ServiceWorkerRegistration.prototype.sync;
  }
  if (hasPeriodicApi) {
    globalThis.ServiceWorkerRegistration.prototype.periodicSync = {};
  } else {
    delete globalThis.ServiceWorkerRegistration.prototype.periodicSync;
  }

  globalThis.navigator = {
    serviceWorker: {
      ready: Promise.resolve(mockReg),
    },
  };

  return mockReg;
}

function uninstallServiceWorkerAPIs() {
  delete globalThis.ServiceWorkerRegistration;
  delete globalThis.navigator;
}

afterEach(() => {
  uninstallServiceWorkerAPIs();
  vi.restoreAllMocks();
});

// ── isBgSyncSupported ──────────────────────────────────────────────────────

describe("isBgSyncSupported()", () => {
  it("returns false when navigator is absent", () => {
    expect(isBgSyncSupported()).toBe(false);
  });

  it("returns true when full API is available", () => {
    installServiceWorkerAPIs({ hasSyncApi: true });
    expect(isBgSyncSupported()).toBe(true);
  });

  it("returns false when sync is not on prototype", () => {
    installServiceWorkerAPIs({ hasSyncApi: false });
    expect(isBgSyncSupported()).toBe(false);
  });
});

// ── isPeriodicSyncSupported ────────────────────────────────────────────────

describe("isPeriodicSyncSupported()", () => {
  it("returns false when navigator is absent", () => {
    expect(isPeriodicSyncSupported()).toBe(false);
  });

  it("returns true when periodicSync is on prototype", () => {
    installServiceWorkerAPIs({ hasPeriodicApi: true });
    expect(isPeriodicSyncSupported()).toBe(true);
  });

  it("returns false when periodicSync missing from prototype", () => {
    installServiceWorkerAPIs({ hasPeriodicApi: false });
    expect(isPeriodicSyncSupported()).toBe(false);
  });
});

// ── buildSyncTag ───────────────────────────────────────────────────────────

describe("buildSyncTag()", () => {
  it("builds tag with key only", () => {
    expect(buildSyncTag("guests")).toBe("wedding/guests");
  });

  it("builds tag with key and id", () => {
    expect(buildSyncTag("guests", "abc-123")).toBe("wedding/guests/abc-123");
  });

  it("builds tag with undefined id (omits id segment)", () => {
    expect(buildSyncTag("vendors", undefined)).toBe("wedding/vendors");
  });
});

// ── parseSyncTag ───────────────────────────────────────────────────────────

describe("parseSyncTag()", () => {
  it("parses key-only tag", () => {
    expect(parseSyncTag("wedding/guests")).toEqual({ key: "guests" });
  });

  it("parses tag with id", () => {
    expect(parseSyncTag("wedding/guests/abc-123")).toEqual({
      key: "guests",
      id: "abc-123",
    });
  });

  it("returns null for non-wedding tag", () => {
    expect(parseSyncTag("other/guests")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSyncTag("")).toBeNull();
  });
});

// ── registerSync ──────────────────────────────────────────────────────────

describe("registerSync()", () => {
  it("resolves silently when API is not supported", async () => {
    await expect(registerSync("wedding/guests")).resolves.toBeUndefined();
  });

  it("calls reg.sync.register with the tag", async () => {
    installServiceWorkerAPIs();
    const reg = buildMockRegistration();
    await registerSync("wedding/guests", reg);
    expect(reg.sync.register).toHaveBeenCalledWith("wedding/guests");
  });

  it("uses serviceWorker.ready when no registration provided", async () => {
    const reg = installServiceWorkerAPIs();
    await registerSync("wedding/vendors");
    expect(reg.sync.register).toHaveBeenCalledWith("wedding/vendors");
  });
});

// ── getPendingSyncs ────────────────────────────────────────────────────────

describe("getPendingSyncs()", () => {
  it("returns empty array when API unavailable", async () => {
    await expect(getPendingSyncs()).resolves.toEqual([]);
  });

  it("returns tags from registration", async () => {
    installServiceWorkerAPIs();
    const reg = buildMockRegistration();
    reg._syncTags.push("wedding/guests", "wedding/vendors");
    const tags = await getPendingSyncs(reg);
    expect(tags).toEqual(["wedding/guests", "wedding/vendors"]);
  });
});

// ── registerPeriodicSync ──────────────────────────────────────────────────

describe("registerPeriodicSync()", () => {
  it("resolves silently when API is not supported", async () => {
    await expect(
      registerPeriodicSync("wedding/sync", 3600000),
    ).resolves.toBeUndefined();
  });

  it("calls reg.periodicSync.register with tag and minInterval", async () => {
    installServiceWorkerAPIs();
    const reg = buildMockRegistration();
    await registerPeriodicSync("wedding/sync", 3600000, reg);
    expect(reg.periodicSync.register).toHaveBeenCalledWith("wedding/sync", {
      minInterval: 3600000,
    });
  });
});

// ── unregisterPeriodicSync ────────────────────────────────────────────────

describe("unregisterPeriodicSync()", () => {
  it("resolves silently when API is not supported", async () => {
    await expect(
      unregisterPeriodicSync("wedding/sync"),
    ).resolves.toBeUndefined();
  });

  it("removes the tag from periodic sync", async () => {
    installServiceWorkerAPIs();
    const reg = buildMockRegistration();
    reg._periodicTags.push("wedding/sync");
    await unregisterPeriodicSync("wedding/sync", reg);
    expect(reg.periodicSync.unregister).toHaveBeenCalledWith("wedding/sync");
    expect(reg._periodicTags).toHaveLength(0);
  });
});

// ── getPeriodicSyncs ──────────────────────────────────────────────────────

describe("getPeriodicSyncs()", () => {
  it("returns empty array when API unavailable", async () => {
    await expect(getPeriodicSyncs()).resolves.toEqual([]);
  });

  it("returns registered periodic tags", async () => {
    installServiceWorkerAPIs();
    const reg = buildMockRegistration();
    reg._periodicTags.push("wedding/nightly");
    const tags = await getPeriodicSyncs(reg);
    expect(tags).toContain("wedding/nightly");
  });
});

// ── enqueueSync ───────────────────────────────────────────────────────────

describe("enqueueSync()", () => {
  it("resolves without error when API unavailable", async () => {
    await expect(enqueueSync("guests")).resolves.toBeUndefined();
  });

  it("registers namespaced tag via registerSync", async () => {
    installServiceWorkerAPIs();
    const reg = buildMockRegistration();
    await enqueueSync("guests", "guest-007", reg);
    expect(reg.sync.register).toHaveBeenCalledWith("wedding/guests/guest-007");
  });

  it("registers without id when id is undefined", async () => {
    installServiceWorkerAPIs();
    const reg = buildMockRegistration();
    await enqueueSync("vendors", undefined, reg);
    expect(reg.sync.register).toHaveBeenCalledWith("wedding/vendors");
  });
});
