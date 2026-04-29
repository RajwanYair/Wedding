/**
 * tests/unit/dirty-state.test.mjs — Unit tests for dirty-state.js (Sprint 59)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  markDirty, markClean, markAllClean,
  isDirty, hasUnsavedChanges, getDirtyKeys, dirtyCount,
  snapshotBaseline, checkDirty, clearBaselines,
  getDirtyStateSummary,
} from "../../src/services/event-manager.js";

beforeEach(() => {
  markAllClean();
  clearBaselines();
});

// ── markDirty / markClean / isDirty ───────────────────────────────────────

describe("markDirty / isDirty", () => {
  it("markDirty marks a key dirty", () => {
    markDirty("guests");
    expect(isDirty("guests")).toBe(true);
  });

  it("untracked key is not dirty", () => {
    expect(isDirty("guests")).toBe(false);
  });

  it("markClean clears dirty state", () => {
    markDirty("guests");
    markClean("guests");
    expect(isDirty("guests")).toBe(false);
  });

  it("markAllClean clears all dirty keys", () => {
    markDirty("guests");
    markDirty("tables");
    markAllClean();
    expect(isDirty("guests")).toBe(false);
    expect(isDirty("tables")).toBe(false);
  });
});

// ── hasUnsavedChanges / getDirtyKeys / dirtyCount ─────────────────────────

describe("hasUnsavedChanges", () => {
  it("returns false when nothing dirty", () => {
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("returns true when at least one dirty key", () => {
    markDirty("vendors");
    expect(hasUnsavedChanges()).toBe(true);
  });
});

describe("getDirtyKeys", () => {
  it("returns all dirty key names", () => {
    markDirty("guests");
    markDirty("tables");
    expect(getDirtyKeys()).toContain("guests");
    expect(getDirtyKeys()).toContain("tables");
    expect(getDirtyKeys()).toHaveLength(2);
  });

  it("returns empty array when nothing dirty", () => {
    expect(getDirtyKeys()).toStrictEqual([]);
  });
});

describe("dirtyCount", () => {
  it("returns 0 by default", () => {
    expect(dirtyCount()).toBe(0);
  });

  it("increments with each markDirty", () => {
    markDirty("a");
    markDirty("b");
    expect(dirtyCount()).toBe(2);
  });
});

// ── snapshotBaseline / checkDirty ─────────────────────────────────────────

describe("checkDirty / snapshotBaseline", () => {
  it("returns false when no baseline recorded", () => {
    expect(checkDirty("guests", [{ id: "1" }])).toBe(false);
    expect(isDirty("guests")).toBe(false);
  });

  it("returns false when value matches baseline", () => {
    const guests = [{ id: "g1", name: "Alice" }];
    snapshotBaseline("guests", guests);
    expect(checkDirty("guests", guests)).toBe(false);
    expect(isDirty("guests")).toBe(false);
  });

  it("returns true when value differs from baseline", () => {
    const guests = [{ id: "g1", name: "Alice" }];
    snapshotBaseline("guests", guests);
    const updated = [{ id: "g1", name: "Bob" }];
    expect(checkDirty("guests", updated)).toBe(true);
    expect(isDirty("guests")).toBe(true);
  });

  it("auto-marks clean when value reverts to baseline", () => {
    const guests = [{ id: "g1" }];
    snapshotBaseline("guests", guests);
    checkDirty("guests", [{ id: "g1", extra: true }]); // dirty
    checkDirty("guests", guests); // reverts
    expect(isDirty("guests")).toBe(false);
  });
});

// ── getDirtyStateSummary ──────────────────────────────────────────────────

describe("getDirtyStateSummary", () => {
  it("returns summary object with correct keys", () => {
    markDirty("guests");
    snapshotBaseline("tables", []);
    const summary = getDirtyStateSummary();
    expect(summary.dirtyKeys).toContain("guests");
    expect(summary.baselineKeys).toContain("tables");
    expect(summary.hasUnsaved).toBe(true);
  });

  it("hasUnsaved is false when nothing dirty", () => {
    expect(getDirtyStateSummary().hasUnsaved).toBe(false);
  });
});
