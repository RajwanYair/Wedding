/**
 * tests/unit/sync-bridge.test.mjs — S316: coverage for src/core/sync.js re-export bridge.
 *
 * sync.js is a thin barrel that re-exports the write-queue API from services/sheets.js.
 * These tests confirm the re-exports are present and callable, exercising the bridge module.
 */
import { describe, it, expect, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: vi.fn(async (_key, fn) => fn()),
  syncStoreKeyToSheets: vi.fn(),
  appendToRsvpLog: vi.fn(),
  queueSize: vi.fn(() => 0),
  queueKeys: vi.fn(() => []),
  onSyncStatus: vi.fn(() => () => {}),
}));

// ── Module under test ────────────────────────────────────────────────────

import {
  enqueueWrite,
  syncStoreKeyToSheets,
  appendToRsvpLog,
  queueSize,
  queueKeys,
  onSyncStatus,
} from "../../src/core/sync.js";

// ── Tests ─────────────────────────────────────────────────────────────────

describe("S316 — sync.js — re-export bridge", () => {
  it("enqueueWrite is exported and callable", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await enqueueWrite("guests", fn);
    expect(fn).toHaveBeenCalled();
    expect(result).toBe("ok");
  });

  it("syncStoreKeyToSheets is exported and callable", () => {
    expect(() => syncStoreKeyToSheets("guests")).not.toThrow();
  });

  it("appendToRsvpLog is exported and callable", () => {
    expect(() => appendToRsvpLog({ name: "Test" })).not.toThrow();
  });

  it("queueSize returns a number", () => {
    expect(typeof queueSize()).toBe("number");
  });

  it("queueKeys returns an array", () => {
    expect(Array.isArray(queueKeys())).toBe(true);
  });

  it("onSyncStatus returns an unsubscribe function", () => {
    const unsub = onSyncStatus(vi.fn());
    expect(typeof unsub).toBe("function");
  });

  it("all 6 bridge exports are defined", () => {
    expect(enqueueWrite).toBeDefined();
    expect(syncStoreKeyToSheets).toBeDefined();
    expect(appendToRsvpLog).toBeDefined();
    expect(queueSize).toBeDefined();
    expect(queueKeys).toBeDefined();
    expect(onSyncStatus).toBeDefined();
  });
});
