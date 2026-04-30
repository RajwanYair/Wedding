/**
 * tests/unit/whatsapp-dnc.test.mjs — S455: coverage for src/utils/whatsapp-dnc.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const _store = new Map();
vi.stubGlobal("localStorage", {
  getItem: (k) => _store.get(k) ?? null,
  setItem: (k, v) => _store.set(k, v),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear(),
});

const {
  addToDnc,
  removeFromDnc,
  isOnDnc,
  listDnc,
  clearDnc,
  filterDnc,
} = await import("../../src/utils/whatsapp-dnc.js");

beforeEach(() => {
  _store.clear();
});

describe("whatsapp-dnc — add/remove/isOnDnc", () => {
  it("adds and detects a phone (formatted variants match)", () => {
    expect(addToDnc("050-111-1111")).toBe(true);
    expect(isOnDnc("0501111111")).toBe(true);
    expect(isOnDnc("+972501111111")).toBe(true);
  });

  it("does not add duplicates", () => {
    expect(addToDnc("0501111111")).toBe(true);
    expect(addToDnc("050-111-1111")).toBe(false);
    expect(listDnc()).toHaveLength(1);
  });

  it("rejects empty/invalid input", () => {
    expect(addToDnc("")).toBe(false);
    expect(addToDnc(undefined)).toBe(false);
    expect(isOnDnc("")).toBe(false);
  });

  it("removes a phone", () => {
    addToDnc("0501111111");
    expect(removeFromDnc("050-111-1111")).toBe(true);
    expect(isOnDnc("0501111111")).toBe(false);
  });

  it("returns false when removing absent phone", () => {
    expect(removeFromDnc("0501111111")).toBe(false);
  });
});

describe("whatsapp-dnc — listDnc / clearDnc", () => {
  it("returns a copy of the list", () => {
    addToDnc("0501111111");
    const a = listDnc();
    a.push("hacked");
    expect(listDnc()).toHaveLength(1);
  });

  it("clearDnc empties the list", () => {
    addToDnc("0501111111");
    clearDnc();
    expect(listDnc()).toEqual([]);
  });
});

describe("whatsapp-dnc — filterDnc", () => {
  it("removes opted-out numbers from a phone list", () => {
    addToDnc("0501111111");
    const out = filterDnc(["0501111111", "0502222222", "050-111-1111"]);
    expect(out).toEqual(["0502222222"]);
  });

  it("drops empty phones from output", () => {
    expect(filterDnc(["", "0501111111"])).toEqual(["0501111111"]);
  });
});
