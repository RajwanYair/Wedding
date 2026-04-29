/**
 * tests/unit/checkin-section.test.mjs — S343: data helpers in src/sections/checkin.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Store ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
  storeSubscribe: vi.fn(() => () => {}),
  storeSubscribeScoped: vi.fn(() => () => {}),
  cleanupScope: vi.fn(),
}));

// ── Deps ──────────────────────────────────────────────────────────────────

vi.mock("../../src/core/i18n.js", () => ({ t: (k) => k }));
vi.mock("../../src/core/dom.js", () => ({ el: new Proxy({}, { get: () => null }) }));
vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ announce: vi.fn() }));
vi.mock("../../src/utils/haptic.js", () => ({
  vibrate: vi.fn(),
  HAPTIC: { SUCCESS: "success", ERROR: "error" },
}));
vi.mock("../../src/services/security.js", () => ({
  isNFCSupported: vi.fn(() => false),
  startNFCScan: vi.fn(),
}));
vi.mock("../../src/utils/orientation.js", () => ({
  lockOrientation: vi.fn(() => Promise.resolve()),
  unlockOrientation: vi.fn(),
}));
vi.mock("../../src/utils/qr-code.js", () => ({
  buildCheckinUrl: vi.fn((id) => `https://example.com/checkin/${id}`),
  getQrDataUrl: vi.fn(() => "data:image/png;base64,mock"),
}));
vi.mock("../../src/core/section-base.js", () => ({
  BaseSection: class {
    constructor(_name) {}
    subscribe() {}
  },
  fromSection: (_s) => ({ mount: vi.fn(), unmount: vi.fn(), capabilities: [] }),
}));
vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));

vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock"),
  revokeObjectURL: vi.fn(),
});

afterEach(() => vi.unstubAllGlobals());

import {
  setKioskMode,
  isKioskMode,
  setCheckinSearch,
  checkInGuest,
  getCheckinStats,
  getCheckinRateBySide,
  getCheckinRateByTable,
  getVipNotCheckedIn,
  getAccessibilityNotCheckedIn,
  getCheckinTimeline,
  resetAllCheckins,
  toggleGiftMode,
} from "../../src/sections/checkin.js";

// ── Helpers ───────────────────────────────────────────────────────────────

const mkGuest = (overrides = {}) => ({
  id: "g1",
  firstName: "Yair",
  lastName: "Test",
  status: "confirmed",
  count: 1,
  checkedIn: false,
  checkedInAt: null,
  side: "groom",
  group: "family",
  tableId: null,
  vip: false,
  accessibility: false,
  ...overrides,
});

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
  // reset kiosk mode
  document.body.classList.remove("kiosk-mode");
  document.body.removeAttribute("data-kiosk");
});

// ── setKioskMode / isKioskMode ────────────────────────────────────────────

describe("setKioskMode / isKioskMode", () => {
  it("enables kiosk mode on document.body", () => {
    setKioskMode(true);
    expect(document.body.classList.contains("kiosk-mode")).toBe(true);
    expect(isKioskMode()).toBe(true);
  });

  it("disables kiosk mode", () => {
    setKioskMode(true);
    setKioskMode(false);
    expect(document.body.classList.contains("kiosk-mode")).toBe(false);
    expect(isKioskMode()).toBe(false);
  });

  it("toggles kiosk mode when called without argument", () => {
    expect(isKioskMode()).toBe(false);
    setKioskMode();
    expect(isKioskMode()).toBe(true);
    setKioskMode();
    expect(isKioskMode()).toBe(false);
  });

  it("sets data-kiosk attribute accordingly", () => {
    setKioskMode(true);
    expect(document.body.getAttribute("data-kiosk")).toBe("on");
    setKioskMode(false);
    expect(document.body.getAttribute("data-kiosk")).toBe("off");
  });
});

// ── setCheckinSearch ──────────────────────────────────────────────────────

describe("setCheckinSearch", () => {
  it("does not throw", () => {
    expect(() => setCheckinSearch("test")).not.toThrow();
  });

  it("accepts empty string", () => {
    expect(() => setCheckinSearch("")).not.toThrow();
  });
});

// ── checkInGuest ──────────────────────────────────────────────────────────

describe("checkInGuest", () => {
  it("marks guest as checked-in", () => {
    _store.set("guests", [mkGuest({ id: "g1" })]);
    checkInGuest("g1");
    const guests = _store.get("guests");
    expect(guests[0].checkedIn).toBe(true);
    expect(guests[0].checkedInAt).toBeTruthy();
  });

  it("does nothing for unknown guest id", () => {
    _store.set("guests", [mkGuest({ id: "g1" })]);
    checkInGuest("nonexistent");
    expect(_store.get("guests")[0].checkedIn).toBe(false);
  });

  it("leaves other guests unchanged", () => {
    _store.set("guests", [mkGuest({ id: "g1" }), mkGuest({ id: "g2" })]);
    checkInGuest("g1");
    expect(_store.get("guests")[1].checkedIn).toBe(false);
  });
});

// ── getCheckinStats ───────────────────────────────────────────────────────

describe("getCheckinStats", () => {
  it("returns zeros for empty guests", () => {
    _store.set("guests", []);
    expect(getCheckinStats()).toEqual({ total: 0, checkedIn: 0, checkinRate: 0, remaining: 0 });
  });

  it("counts only confirmed guests", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", status: "pending" }),
      mkGuest({ id: "g2", status: "confirmed", checkedIn: true }),
      mkGuest({ id: "g3", status: "confirmed", checkedIn: false }),
    ]);
    const stats = getCheckinStats();
    expect(stats.total).toBe(2);
    expect(stats.checkedIn).toBe(1);
    expect(stats.checkinRate).toBe(50);
    expect(stats.remaining).toBe(1);
  });

  it("handles 100% check-in rate", () => {
    _store.set("guests", [mkGuest({ status: "confirmed", checkedIn: true })]);
    const stats = getCheckinStats();
    expect(stats.checkinRate).toBe(100);
  });
});

// ── getCheckinRateBySide ──────────────────────────────────────────────────

describe("getCheckinRateBySide", () => {
  it("returns empty array for no confirmed guests", () => {
    _store.set("guests", []);
    expect(getCheckinRateBySide()).toEqual([]);
  });

  it("groups by side and calculates rate", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", status: "confirmed", side: "groom", checkedIn: true }),
      mkGuest({ id: "g2", status: "confirmed", side: "groom", checkedIn: false }),
      mkGuest({ id: "g3", status: "confirmed", side: "bride", checkedIn: true }),
    ]);
    const result = getCheckinRateBySide();
    const groom = result.find((r) => r.side === "groom");
    const bride = result.find((r) => r.side === "bride");
    expect(groom?.total).toBe(2);
    expect(groom?.checkedIn).toBe(1);
    expect(groom?.rate).toBe(50);
    expect(bride?.total).toBe(1);
    expect(bride?.rate).toBe(100);
  });
});

// ── getCheckinRateByTable ─────────────────────────────────────────────────

describe("getCheckinRateByTable", () => {
  it("returns empty array for no confirmed guests with tableId", () => {
    _store.set("guests", []);
    _store.set("tables", []);
    expect(getCheckinRateByTable()).toEqual([]);
  });

  it("groups by table and calculates rate", () => {
    _store.set("tables", [{ id: "t1", name: "Table 1" }]);
    _store.set("guests", [
      mkGuest({ id: "g1", status: "confirmed", tableId: "t1", checkedIn: true }),
      mkGuest({ id: "g2", status: "confirmed", tableId: "t1", checkedIn: false }),
    ]);
    const result = getCheckinRateByTable();
    expect(result).toHaveLength(1);
    expect(result[0].tableName).toBe("Table 1");
    expect(result[0].total).toBe(2);
    expect(result[0].checkedIn).toBe(1);
    expect(result[0].rate).toBe(50);
  });
});

// ── getVipNotCheckedIn ────────────────────────────────────────────────────

describe("getVipNotCheckedIn", () => {
  it("returns empty when no vip guests", () => {
    _store.set("guests", [mkGuest({ vip: false, status: "confirmed" })]);
    expect(getVipNotCheckedIn()).toHaveLength(0);
  });

  it("returns confirmed VIPs not yet checked in", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", vip: true, status: "confirmed", checkedIn: false }),
      mkGuest({ id: "g2", vip: true, status: "confirmed", checkedIn: true }),
      mkGuest({ id: "g3", vip: true, status: "pending", checkedIn: false }),
    ]);
    const result = getVipNotCheckedIn();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });
});

// ── getAccessibilityNotCheckedIn ──────────────────────────────────────────

describe("getAccessibilityNotCheckedIn", () => {
  it("returns confirmed accessibility guests not checked in", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", accessibility: true, status: "confirmed", checkedIn: false }),
      mkGuest({ id: "g2", accessibility: true, status: "confirmed", checkedIn: true }),
    ]);
    const result = getAccessibilityNotCheckedIn();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });
});

// ── getCheckinTimeline ────────────────────────────────────────────────────

describe("getCheckinTimeline", () => {
  it("returns empty for no checked-in guests", () => {
    _store.set("guests", [mkGuest({ checkedIn: false })]);
    expect(getCheckinTimeline()).toEqual([]);
  });

  it("buckets check-ins by hour", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", checkedIn: true, checkedInAt: "2024-01-01T18:00:00.000Z" }),
      mkGuest({ id: "g2", checkedIn: true, checkedInAt: "2024-01-01T18:30:00.000Z" }),
      mkGuest({ id: "g3", checkedIn: true, checkedInAt: "2024-01-01T19:00:00.000Z" }),
    ]);
    const timeline = getCheckinTimeline();
    expect(timeline.length).toBeGreaterThanOrEqual(2);
    const hour18 = timeline.find((t) => t.hour === "18:00");
    expect(hour18?.count).toBe(2);
  });

  it("ignores invalid timestamps", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", checkedIn: true, checkedInAt: "not-a-date" }),
    ]);
    expect(getCheckinTimeline()).toEqual([]);
  });
});

// ── resetAllCheckins ──────────────────────────────────────────────────────

describe("resetAllCheckins", () => {
  it("resets all checkedIn flags to false", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", checkedIn: true, checkedInAt: "2024-01-01T18:00:00.000Z" }),
      mkGuest({ id: "g2", checkedIn: true }),
    ]);
    resetAllCheckins();
    const guests = _store.get("guests");
    expect(guests.every((g) => !g.checkedIn)).toBe(true);
    expect(guests.every((g) => g.checkedInAt === undefined)).toBe(true);
  });
});

// ── toggleGiftMode ────────────────────────────────────────────────────────

describe("toggleGiftMode", () => {
  it("toggles without throwing", () => {
    expect(() => toggleGiftMode()).not.toThrow();
    expect(() => toggleGiftMode()).not.toThrow();
  });
});
