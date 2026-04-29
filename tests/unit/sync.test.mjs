/**
 * tests/unit/sync.test.mjs — S336: coverage for src/core/sync.js re-export bridge
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";

// ── Mock the implementation layer ─────────────────────────────────────────

const _enqueueWriteMock = vi.fn();
const _syncStoreKeyMock = vi.fn();
const _appendToRsvpLogMock = vi.fn();
const _queueSizeMock = vi.fn(() => 0);
const _queueKeysMock = vi.fn(() => []);
const _onSyncStatusMock = vi.fn(() => () => {});

vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: (...a) => _enqueueWriteMock(...a),
  syncStoreKeyToSheets: (...a) => _syncStoreKeyMock(...a),
  appendToRsvpLog: (...a) => _appendToRsvpLogMock(...a),
  queueSize: () => _queueSizeMock(),
  queueKeys: () => _queueKeysMock(),
  onSyncStatus: (...a) => _onSyncStatusMock(...a),
}));

import {
  enqueueWrite,
  syncStoreKeyToSheets,
  appendToRsvpLog,
  queueSize,
  queueKeys,
  onSyncStatus,
} from "../../src/core/sync.js";

describe("core/sync.js — re-export bridge", () => {
  it("enqueueWrite delegates to sheets.js implementation", () => {
    enqueueWrite("guests", vi.fn());
    expect(_enqueueWriteMock).toHaveBeenCalledWith("guests", expect.any(Function));
  });

  it("syncStoreKeyToSheets delegates to sheets.js implementation", () => {
    syncStoreKeyToSheets("guests");
    expect(_syncStoreKeyMock).toHaveBeenCalledWith("guests");
  });

  it("appendToRsvpLog delegates to sheets.js implementation", () => {
    const entry = { phone: "972501234567", name: "Test" };
    appendToRsvpLog(entry);
    expect(_appendToRsvpLogMock).toHaveBeenCalledWith(entry);
  });

  it("queueSize delegates to sheets.js implementation", () => {
    _queueSizeMock.mockReturnValueOnce(3);
    expect(queueSize()).toBe(3);
  });

  it("queueKeys delegates to sheets.js implementation", () => {
    _queueKeysMock.mockReturnValueOnce(["guests", "tables"]);
    expect(queueKeys()).toEqual(["guests", "tables"]);
  });

  it("onSyncStatus delegates to sheets.js implementation", () => {
    const cb = vi.fn();
    onSyncStatus(cb);
    expect(_onSyncStatusMock).toHaveBeenCalledWith(cb);
  });

  it("all re-exports are functions", () => {
    expect(typeof enqueueWrite).toBe("function");
    expect(typeof syncStoreKeyToSheets).toBe("function");
    expect(typeof appendToRsvpLog).toBe("function");
    expect(typeof queueSize).toBe("function");
    expect(typeof queueKeys).toBe("function");
    expect(typeof onSyncStatus).toBe("function");
  });
});
