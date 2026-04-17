/**
 * tests/unit/metrics.test.mjs — Sprint 210
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  count,
  timing,
  startTimer,
  recordError,
  getAll,
  getByName,
  sum,
  avg,
  reset,
  exportSnapshot,
} from "../../src/utils/metrics.js";

beforeEach(() => reset());

describe("count", () => {
  it("records a counter", () => {
    count("page.view");
    expect(getByName("page.view")).toHaveLength(1);
    expect(getByName("page.view")[0].value).toBe(1);
  });
  it("records custom delta", () => {
    count("api.calls", 3);
    expect(getByName("api.calls")[0].value).toBe(3);
  });
  it("stores tags when provided", () => {
    count("btn.click", 1, { section: "guests" });
    expect(getByName("btn.click")[0].tags).toEqual({ section: "guests" });
  });
});

describe("timing", () => {
  it("records timing value", () => {
    timing("render", 42);
    expect(getByName("render")[0].value).toBe(42);
  });
});

describe("startTimer", () => {
  it("returns an object with stop()", () => {
    const t = startTimer("fetch");
    expect(t.stop).toBeTypeOf("function");
  });
  it("stop() records a timing entry", () => {
    const t = startTimer("load");
    t.stop();
    expect(getByName("load")).toHaveLength(1);
  });
  it("stop() returns elapsed ms >= 0", () => {
    const t = startTimer("x");
    const ms = t.stop();
    expect(ms).toBeGreaterThanOrEqual(0);
  });
});

describe("recordError", () => {
  it("records an error by name", () => {
    recordError("network.error", new Error("timeout"));
    const entries = getByName("network.error");
    expect(entries).toHaveLength(1);
    expect(entries[0].tags?.error).toBe("timeout");
  });
  it("accepts plain string error", () => {
    recordError("parse.error", "bad JSON");
    expect(getByName("parse.error")[0].tags?.error).toBe("bad JSON");
  });
});

describe("getAll", () => {
  it("returns all entries", () => {
    count("a");
    timing("b", 1);
    expect(getAll()).toHaveLength(2);
  });
  it("returns a copy, not the live store", () => {
    count("a");
    const snap = getAll();
    count("b");
    expect(snap).toHaveLength(1);
  });
});

describe("sum", () => {
  it("sums repeated counter", () => {
    count("hits", 2);
    count("hits", 3);
    expect(sum("hits")).toBe(5);
  });
  it("returns 0 for unknown name", () => {
    expect(sum("nope")).toBe(0);
  });
});

describe("avg", () => {
  it("averages timings", () => {
    timing("t", 100);
    timing("t", 200);
    expect(avg("t")).toBe(150);
  });
  it("returns 0 for no entries", () => {
    expect(avg("unknown")).toBe(0);
  });
});

describe("reset", () => {
  it("clears all entries", () => {
    count("x");
    reset();
    expect(getAll()).toHaveLength(0);
  });
});

describe("exportSnapshot", () => {
  it("returns entries and timestamp", () => {
    count("a", 1);
    const snap = exportSnapshot();
    expect(snap.entries).toHaveLength(1);
    expect(snap.timestamp).toMatch(/^\d{4}-/);
  });
});
