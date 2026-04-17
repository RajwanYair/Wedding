/**
 * tests/unit/command-palette.test.mjs — Sprint 104
 */

import { describe, it, expect, vi } from "vitest";
import { createCommandPalette } from "../../src/utils/command-palette.js";

function makeCmd(overrides = {}) {
  return {
    id:     "cmd:test",
    label:  "Test Command",
    group:  "Testing",
    action: vi.fn(),
    ...overrides,
  };
}

describe("createCommandPalette — registration", () => {
  it("registers and retrieves a command", () => {
    const p = createCommandPalette();
    p.register(makeCmd({ id: "cmd:a", label: "Alpha" }));
    expect(p.size()).toBe(1);
  });

  it("overwrites duplicate id on re-register", () => {
    const p = createCommandPalette();
    p.register(makeCmd({ id: "cmd:a", label: "Alpha" }));
    p.register(makeCmd({ id: "cmd:a", label: "Alpha 2" }));
    expect(p.size()).toBe(1);
    expect(p.getAll()[0].label).toBe("Alpha 2");
  });

  it("unregisters a command", () => {
    const p = createCommandPalette();
    p.register(makeCmd({ id: "cmd:a" }));
    p.unregister("cmd:a");
    expect(p.size()).toBe(0);
  });

  it("registerGroup assigns group to all commands", () => {
    const p = createCommandPalette();
    p.registerGroup("Nav", [
      { id: "n:1", label: "Guests", action: vi.fn() },
      { id: "n:2", label: "Tables", action: vi.fn() },
    ]);
    const all = p.getAll();
    expect(all.every((c) => c.group === "Nav")).toBe(true);
  });

  it("getGroups returns unique sorted group names", () => {
    const p = createCommandPalette();
    p.register(makeCmd({ id: "a", group: "Beta" }));
    p.register(makeCmd({ id: "b", group: "Alpha" }));
    expect(p.getGroups()).toEqual(["Alpha", "Beta"]);
  });
});

describe("createCommandPalette — search", () => {
  it("returns all non-disabled commands for empty query", () => {
    const p = createCommandPalette();
    p.register(makeCmd({ id: "a", label: "Alpha" }));
    p.register(makeCmd({ id: "b", label: "Beta" }));
    expect(p.search("").length).toBe(2);
  });

  it("matches by label prefix (high score)", () => {
    const p = createCommandPalette();
    p.register(makeCmd({ id: "a", label: "Guests section" }));
    p.register(makeCmd({ id: "b", label: "Settings" }));
    const results = p.search("guest");
    expect(results[0].command.id).toBe("a");
  });

  it("excludes disabled commands", () => {
    const p = createCommandPalette();
    p.register(makeCmd({ id: "a", label: "Hidden", disabled: true }));
    expect(p.search("hidden")).toHaveLength(0);
  });

  it("matches keywords", () => {
    const p = createCommandPalette();
    p.register(makeCmd({ id: "a", label: "Open seating", keywords: ["table assign"] }));
    const results = p.search("table");
    expect(results.length).toBeGreaterThan(0);
  });

  it("respects maxResults", () => {
    const p = createCommandPalette({ maxResults: 3 });
    for (let i = 0; i < 10; i++) {
      p.register(makeCmd({ id: `cmd:${i}`, label: `Command ${i}` }));
    }
    expect(p.search("command").length).toBe(3);
  });
});

describe("createCommandPalette — execute", () => {
  it("calls the registered action", async () => {
    const action = vi.fn();
    const p = createCommandPalette();
    p.register(makeCmd({ id: "do:it", action }));
    await p.execute("do:it");
    expect(action).toHaveBeenCalledOnce();
  });

  it("throws for unknown command id", async () => {
    const p = createCommandPalette();
    await expect(p.execute("unknown")).rejects.toThrow(/unknown command/);
  });

  it("does not call action for disabled command", async () => {
    const action = vi.fn();
    const p = createCommandPalette();
    p.register(makeCmd({ id: "do:it", action, disabled: true }));
    await p.execute("do:it");
    expect(action).not.toHaveBeenCalled();
  });
});

describe("createCommandPalette — open/close", () => {
  it("open/close/toggle change isOpen state", () => {
    const p = createCommandPalette();
    expect(p.isOpen()).toBe(false);
    p.open();
    expect(p.isOpen()).toBe(true);
    p.close();
    expect(p.isOpen()).toBe(false);
    p.toggle();
    expect(p.isOpen()).toBe(true);
  });

  it("calls onOpen/onClose callbacks", () => {
    const onOpen  = vi.fn();
    const onClose = vi.fn();
    const p = createCommandPalette({ onOpen, onClose });
    p.open();
    expect(onOpen).toHaveBeenCalledOnce();
    p.close();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
