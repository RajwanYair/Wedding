/**
 * S720 integration tests
 * - startKioskSession / recordKioskScan / getGuestBadgeData / getKioskStats
 *   (checkin.js ← checkin-kiosk.js)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn() }));
vi.mock("../../src/services/security.js", () => ({
  isNFCSupported: vi.fn(() => false),
  startNFCScan: vi.fn(),
}));

beforeEach(() => {
  initStore({ guests: { value: [] }, tables: { value: [] } });
});

import {
  startKioskSession,
  recordKioskScan,
  getGuestBadgeData,
  getKioskStats,
} from "../../src/sections/checkin.js";

describe("S720 — startKioskSession + recordKioskScan + getGuestBadgeData + getKioskStats", () => {
  it("startKioskSession returns a fresh session with zero scans", () => {
    const session = startKioskSession("kiosk_1");
    expect(session.kioskId).toBe("kiosk_1");
    expect(session.scansProcessed).toBe(0);
    expect(session.failedScans).toBe(0);
  });

  it("recordKioskScan increments scansProcessed", () => {
    const session = startKioskSession("kiosk_2");
    const updated = recordKioskScan(session);
    expect(updated.scansProcessed).toBe(1);
  });

  it("getGuestBadgeData returns badge data for known guest", () => {
    storeSet("guests", [{ id: "g1", name: "Alice", tableId: "t1", meal: "vegan", checkedInAt: "2026-09-12T18:00:00Z" }]);
    storeSet("tables", [{ id: "t1", number: 5 }]);
    const badge = getGuestBadgeData("g1");
    expect(badge).not.toBeNull();
    expect(badge.guestName).toBe("Alice");
    expect(badge.tableNumber).toBe(5);
    expect(badge.meal).toBe("vegan");
  });

  it("getGuestBadgeData returns null for unknown guest", () => {
    storeSet("guests", []);
    expect(getGuestBadgeData("missing")).toBeNull();
  });

  it("getKioskStats returns scan totals", () => {
    let session = startKioskSession("k3");
    session = recordKioskScan(session);
    session = recordKioskScan(session);
    const stats = getKioskStats(session);
    expect(stats.scansProcessed).toBe(2);
  });
});
