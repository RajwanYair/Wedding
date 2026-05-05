/**
 * tests/unit/s709-plugin-loader-runtime.test.mjs — S709 Plugin Loader Runtime
 *
 * Tests for plugin registry lifecycle wired into settings.js.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
  queueSize: vi.fn(() => 0),
  queueKeys: vi.fn(() => []),
  onSyncStatus: vi.fn(() => () => {}),
}));
vi.mock("../../src/services/realtime.js", () => ({
  subscribeToTable: vi.fn(),
  unsubscribeAll: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(),
  announce: vi.fn(),
  getActiveTheme: vi.fn(() => "default"),
}));
vi.mock("../../src/services/notifications.js", () => ({
  isPushSupported: vi.fn(() => false),
  requestPushPermission: vi.fn(),
  subscribePush: vi.fn(),
  unsubscribePush: vi.fn(),
  getCachedSubscription: vi.fn(() => null),
  getPreferences: vi.fn(() => ({})),
  updatePreferences: vi.fn(),
}));

import {
  initPluginRuntime,
  registerPluginRuntime,
  unregisterPluginRuntime,
  getPluginCanCall,
  listLoadedPlugins,
  getLoadedPluginSummaries,
} from "../../src/sections/settings.js";

function makeManifest(overrides = {}) {
  return {
    id: "com.example.test-plugin",
    name: "Test Plugin",
    version: "1.0.0",
    entry: "./test-plugin.js",
    permissions: ["guests:read"],
    ...overrides,
  };
}

beforeEach(() => {
  initPluginRuntime();
});

describe("initPluginRuntime", () => {
  it("resets the registry so plugins can be re-registered", () => {
    const manifest = makeManifest();
    registerPluginRuntime(manifest);
    initPluginRuntime();
    const result = registerPluginRuntime(manifest);
    expect(result.ok).toBe(true);
  });
});

describe("registerPluginRuntime", () => {
  it("registers a valid plugin and returns ok=true", () => {
    const result = registerPluginRuntime(makeManifest());
    expect(result.ok).toBe(true);
    expect(result.plugin).toBeDefined();
  });

  it("returns ok=false when registering the same plugin twice", () => {
    const manifest = makeManifest();
    registerPluginRuntime(manifest);
    const result2 = registerPluginRuntime(manifest);
    expect(result2.ok).toBe(false);
    expect(result2.errors).toBeDefined();
  });

  it("returns ok=false for invalid manifest (empty id)", () => {
    const result = registerPluginRuntime(makeManifest({ id: "" }));
    expect(result.ok).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it("returns ok=false for invalid manifest (no version)", () => {
    const result = registerPluginRuntime(makeManifest({ version: "" }));
    expect(result.ok).toBe(false);
  });

  it("adds the plugin to the list after registration", () => {
    registerPluginRuntime(makeManifest({ id: "com.example.alpha" }));
    expect(listLoadedPlugins()).toContain("com.example.alpha");
  });

  it("supports registering multiple distinct plugins", () => {
    registerPluginRuntime(makeManifest({ id: "com.example.a" }));
    registerPluginRuntime(makeManifest({ id: "com.example.b" }));
    const list = listLoadedPlugins();
    expect(list).toContain("com.example.a");
    expect(list).toContain("com.example.b");
    expect(list).toHaveLength(2);
  });
});

describe("unregisterPluginRuntime", () => {
  it("removes a loaded plugin and returns true", () => {
    registerPluginRuntime(makeManifest({ id: "com.example.x" }));
    const ok = unregisterPluginRuntime("com.example.x");
    expect(ok).toBe(true);
    expect(listLoadedPlugins()).not.toContain("com.example.x");
  });

  it("returns false for a plugin that was never registered", () => {
    const ok = unregisterPluginRuntime("com.example.nonexistent");
    expect(ok).toBe(false);
  });
});

describe("getPluginCanCall", () => {
  it("returns true for a granted permission", () => {
    registerPluginRuntime(makeManifest({ id: "com.example.perms", permissions: ["guests:read"] }));
    // hasPermission resolves "guests.list" → "guests:read"
    expect(getPluginCanCall("com.example.perms", "guests.list")).toBe(true);
  });

  it("returns false for a permission not in the manifest", () => {
    registerPluginRuntime(makeManifest({ id: "com.example.limited", permissions: ["guests:read"] }));
    // hasPermission resolves "vendors.save" → "vendors:write" — not granted
    expect(getPluginCanCall("com.example.limited", "vendors.save")).toBe(false);
  });

  it("returns false for an unknown plugin", () => {
    expect(getPluginCanCall("com.example.ghost", "read:guests")).toBe(false);
  });
});

describe("listLoadedPlugins", () => {
  it("returns empty array on fresh registry", () => {
    expect(listLoadedPlugins()).toEqual([]);
  });
});

describe("getLoadedPluginSummaries", () => {
  it("returns empty on fresh registry", () => {
    expect(getLoadedPluginSummaries()).toEqual([]);
  });

  it("includes plugin id, name, version, loadState", () => {
    registerPluginRuntime(makeManifest({ id: "com.example.s", name: "S Plugin", version: "2.0.0" }));
    const summaries = getLoadedPluginSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].id).toBe("com.example.s");
    expect(summaries[0].name).toBe("S Plugin");
    expect(summaries[0].version).toBe("2.0.0");
    expect(summaries[0].loadState).toBe("loaded");
  });
});
