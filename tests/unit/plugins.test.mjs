/**
 * tests/unit/plugins.test.mjs — Plugin system unit tests (F5.2.1)
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  registerPlugin,
  unregisterPlugin,
  mountPlugin,
  unmountPlugin,
  listPlugins,
  getPlugin,
  isPluginMounted,
  getPluginRoutes,
  resetPlugins,
} from "../../src/core/plugins.js";

describe("Plugin system", () => {
  beforeEach(() => {
    resetPlugins();
    delete globalThis.__pluginI18n;
  });

  /** @returns {import("../../src/core/plugins.js").PluginDef} */
  function makeDef(name = "test-plugin") {
    return {
      name,
      mount: () => {},
      unmount: () => {},
    };
  }

  it("registers a plugin", () => {
    registerPlugin(makeDef());
    expect(listPlugins()).toContain("test-plugin");
  });

  it("throws on duplicate name", () => {
    registerPlugin(makeDef());
    expect(() => registerPlugin(makeDef())).toThrow("already registered");
  });

  it("throws on missing name", () => {
    expect(() => registerPlugin({ mount: () => {}, unmount: () => {} })).toThrow("must have a name");
  });

  it("throws on missing mount", () => {
    expect(() => registerPlugin({ name: "x", unmount: () => {} })).toThrow("mount");
  });

  it("throws on missing unmount", () => {
    expect(() => registerPlugin({ name: "x", mount: () => {} })).toThrow("unmount");
  });

  it("retrieves plugin by name", () => {
    const def = makeDef();
    registerPlugin(def);
    expect(getPlugin("test-plugin")).toBe(def);
  });

  it("returns undefined for unregistered plugin", () => {
    expect(getPlugin("nope")).toBeUndefined();
  });

  it("mounts and unmounts a plugin", () => {
    let mounted = false;
    registerPlugin({
      name: "m",
      mount() { mounted = true; },
      unmount() { mounted = false; },
    });
    const container = document.createElement("div");
    mountPlugin("m", container);
    expect(mounted).toBe(true);
    expect(isPluginMounted("m")).toBe(true);

    unmountPlugin("m");
    expect(mounted).toBe(false);
    expect(isPluginMounted("m")).toBe(false);
  });

  it("mount is idempotent if already mounted", () => {
    let count = 0;
    registerPlugin({
      name: "idem",
      mount() { count++; },
      unmount() {},
    });
    const c = document.createElement("div");
    mountPlugin("idem", c);
    mountPlugin("idem", c);
    expect(count).toBe(1);
  });

  it("unmount is safe when not mounted", () => {
    registerPlugin(makeDef("safe"));
    expect(() => unmountPlugin("safe")).not.toThrow();
  });

  it("throws when mounting unregistered plugin", () => {
    const c = document.createElement("div");
    expect(() => mountPlugin("nope", c)).toThrow("not registered");
  });

  it("unregister calls unmount if mounted", () => {
    let unmounted = false;
    registerPlugin({
      name: "unreg",
      mount() {},
      unmount() { unmounted = true; },
    });
    const c = document.createElement("div");
    mountPlugin("unreg", c);
    unregisterPlugin("unreg");
    expect(unmounted).toBe(true);
    expect(listPlugins()).not.toContain("unreg");
  });

  it("collects routes from plugins", () => {
    registerPlugin({ ...makeDef("a"), routes: ["r1", "r2"] });
    registerPlugin({ ...makeDef("b"), routes: ["r3"] });
    registerPlugin(makeDef("c")); // no routes
    expect(getPluginRoutes()).toEqual(["r1", "r2", "r3"]);
  });

  it("merges i18n keys into globalThis", () => {
    registerPlugin({
      ...makeDef("i18n-test"),
      i18n: { he: { foo: "בדיקה" }, en: { foo: "test" } },
    });
    expect(globalThis.__pluginI18n.he.foo).toBe("בדיקה");
    expect(globalThis.__pluginI18n.en.foo).toBe("test");
  });

  it("resetPlugins clears everything", () => {
    registerPlugin(makeDef("x"));
    const c = document.createElement("div");
    mountPlugin("x", c);
    resetPlugins();
    expect(listPlugins()).toHaveLength(0);
    expect(isPluginMounted("x")).toBe(false);
  });
});
