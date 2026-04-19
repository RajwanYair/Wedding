/**
 * tests/unit/error-monitor.test.mjs — Sprint 178
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TEST_STORAGE_KEYS } from "../test-constants.mjs";

let initErrorMonitor, getClientErrors, clearClientErrors;
let _store = {};

vi.stubGlobal("localStorage", {
  getItem: (key) => (_store[key] ?? null),
  setItem: (key, value) => {
    _store[key] = String(value);
  },
  removeItem: (key) => {
    delete _store[key];
  },
  clear: () => {
    _store = {};
  },
});

beforeEach(async () => {
  vi.resetModules();
  _store = {};
  ({ initErrorMonitor, getClientErrors, clearClientErrors } =
    await import("../../src/utils/error-monitor.js"));
  clearClientErrors();
});

describe("clearClientErrors", () => {
  it("results in empty errors array", () => {
    clearClientErrors();
    expect(getClientErrors()).toHaveLength(0);
  });

  it("removes errors from localStorage (checked via getClientErrors)", () => {
    // Seed via initErrorMonitor
    const cleanup = initErrorMonitor();
    const evt = new ErrorEvent("error", { message: "seeded", error: new Error("seeded") });
    window.dispatchEvent(evt);
    cleanup();
    clearClientErrors();
    expect(getClientErrors()).toHaveLength(0);
  });
});

describe("initErrorMonitor + getClientErrors", () => {
  afterEach(() => {
    // Clean up any leftover error handlers registered to window
    // (not trivial without the cleanup fn, but subsequent tests each create their own)
  });

  it("returns cleanup function", () => {
    const cleanup = initErrorMonitor();
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("captures ErrorEvent fired on window", () => {
    const cleanup = initErrorMonitor();
    const err = new Error("test-error");
    err.stack = "Error: test-error\n  at test";
    const evt = new ErrorEvent("error", {
      message: "test-error",
      filename: "test.js",
      error: err,
    });
    window.dispatchEvent(evt);
    const errors = getClientErrors();
    expect(errors.some((e) => e.message === "test-error")).toBe(true);
    cleanup();
  });

  it("captures unhandledrejection fired on window", () => {
    const cleanup = initErrorMonitor();
    // happy-dom may not support PromiseRejectionEvent constructor; dispatch manually
    const reason = new Error("rejected-promise");
    let evt;
    if (typeof PromiseRejectionEvent !== "undefined") {
      evt = new PromiseRejectionEvent("unhandledrejection", { promise: Promise.resolve(), reason });
    } else {
      // Fallback: construct a bare Event with .reason property
      evt = Object.assign(new Event("unhandledrejection"), { reason });
    }
    window.dispatchEvent(evt);
    const errors = getClientErrors();
    expect(errors.some((e) => e.message === "rejected-promise")).toBe(true);
    cleanup();
  });

  it("caps entries at 50", () => {
    clearClientErrors();
    const cleanup = initErrorMonitor();
    for (let i = 0; i < 60; i++) {
      const evt = new ErrorEvent("error", { message: `err-${i}`, error: new Error(`err-${i}`) });
      window.dispatchEvent(evt);
    }
    expect(getClientErrors().length).toBeLessThanOrEqual(50);
    cleanup();
  });

  it("orders entries newest-first", () => {
    clearClientErrors();
    const cleanup = initErrorMonitor();
    const ev1 = new ErrorEvent("error", { message: "first", error: new Error("first") });
    const ev2 = new ErrorEvent("error", { message: "second", error: new Error("second") });
    window.dispatchEvent(ev1);
    window.dispatchEvent(ev2);
    const errs = getClientErrors();
    expect(errs[0].message).toBe("second");
    cleanup();
  });

  it("truncates message to 300 chars", () => {
    clearClientErrors();
    const cleanup = initErrorMonitor();
    const long = "x".repeat(500);
    const evt = new ErrorEvent("error", { message: long, error: new Error(long) });
    window.dispatchEvent(evt);
    const first = getClientErrors()[0];
    expect(first.message.length).toBeLessThanOrEqual(300);
    cleanup();
  });

  it("cleanup prevents further capture", () => {
    clearClientErrors();
    const cleanup = initErrorMonitor();
    cleanup();
    const evt = new ErrorEvent("error", { message: "after-cleanup", error: new Error("after-cleanup") });
    window.dispatchEvent(evt);
    expect(getClientErrors().some((e) => e.message === "after-cleanup")).toBe(false);
  });
});

describe("getClientErrors", () => {
  it("returns previously persisted errors from localStorage", () => {
    // Seed errors by triggering real recording
    const cleanup = initErrorMonitor();
    const evt = new ErrorEvent("error", { message: "persisted", error: new Error("persisted") });
    window.dispatchEvent(evt);
    cleanup();
    // Read them back
    expect(getClientErrors().some((e) => e.message === "persisted")).toBe(true);
  });

  it("handles corrupt localStorage gracefully", () => {
    // Force corrupt data by writing via the storage key used by the module
    try {
      localStorage.setItem(TEST_STORAGE_KEYS.ERRORS, "THIS IS NOT JSON{{");
    } catch { /* ignore if setItem fails */ }
    expect(() => getClientErrors()).not.toThrow();
  });
});
