// tests/unit/plugin-loader.test.mjs — S631 plugin loader
import { describe, it, expect } from "vitest";
import {
  createRegistry,
  registerPlugin,
  unregisterPlugin,
  pluginCanCall,
  listPlugins,
  pluginSummaries,
} from "../../src/utils/plugin-loader.js";

const manifest = {
  id: "com.acme.greet",
  name: "Greeter",
  version: "1.0.0",
  entry: "index.js",
  permissions: ["guests:read", "ui:section"],
};

describe("plugin-loader", () => {
  describe("createRegistry", () => {
    it("creates empty registry", () => {
      const reg = createRegistry();
      expect(listPlugins(reg)).toEqual([]);
    });
  });

  describe("registerPlugin", () => {
    it("registers valid plugin", () => {
      const reg = createRegistry();
      const { ok, plugin } = registerPlugin(reg, manifest);
      expect(ok).toBe(true);
      expect(plugin.loadState).toBe("loaded");
      expect(plugin.manifest.id).toBe("com.acme.greet");
    });
    it("rejects duplicate registration", () => {
      const reg = createRegistry();
      registerPlugin(reg, manifest);
      const { ok, errors } = registerPlugin(reg, manifest);
      expect(ok).toBe(false);
      expect(errors[0]).toContain("already registered");
    });
    it("rejects invalid manifest", () => {
      const reg = createRegistry();
      const { ok, errors } = registerPlugin(reg, { id: "" });
      expect(ok).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });
    it("rejects disallowed scopes", () => {
      const reg = createRegistry();
      const bad = { ...manifest, permissions: ["admin:nuke"] };
      const { ok } = registerPlugin(reg, bad);
      expect(ok).toBe(false);
    });
  });

  describe("unregisterPlugin", () => {
    it("removes registered plugin", () => {
      const reg = createRegistry();
      registerPlugin(reg, manifest);
      expect(unregisterPlugin(reg, "com.acme.greet")).toBe(true);
      expect(listPlugins(reg)).toEqual([]);
    });
    it("returns false for unknown plugin", () => {
      const reg = createRegistry();
      expect(unregisterPlugin(reg, "com.unknown")).toBe(false);
    });
  });

  describe("pluginCanCall", () => {
    it("grants permitted methods", () => {
      const reg = createRegistry();
      registerPlugin(reg, manifest);
      expect(pluginCanCall(reg, "com.acme.greet", "guests.list")).toBe(true);
    });
    it("denies unpermitted methods", () => {
      const reg = createRegistry();
      registerPlugin(reg, manifest);
      expect(pluginCanCall(reg, "com.acme.greet", "vendors.update")).toBe(false);
    });
    it("denies unknown plugin", () => {
      const reg = createRegistry();
      expect(pluginCanCall(reg, "com.unknown", "guests.list")).toBe(false);
    });
  });

  describe("listPlugins", () => {
    it("lists registered IDs", () => {
      const reg = createRegistry();
      registerPlugin(reg, manifest);
      const m2 = { ...manifest, id: "com.acme.second" };
      registerPlugin(reg, m2);
      expect(listPlugins(reg)).toEqual(["com.acme.greet", "com.acme.second"]);
    });
  });

  describe("pluginSummaries", () => {
    it("returns summary for each plugin", () => {
      const reg = createRegistry();
      registerPlugin(reg, manifest);
      const sums = pluginSummaries(reg);
      expect(sums).toHaveLength(1);
      expect(sums[0]).toEqual({
        id: "com.acme.greet",
        name: "Greeter",
        version: "1.0.0",
        loadState: "loaded",
      });
    });
  });
});
