/**
 * tests/unit/guests-batch.test.mjs — S371: guests.js batch/merge helpers
 * Covers: batchSetStatus · batchDeleteGuests · findDuplicates · mergeGuests
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { initStore, storeSet, storeGet } from "../../src/core/store.js";

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("../../src/core/i18n.js", () => ({ t: (k) => k, loadLocale: vi.fn(), applyI18n: vi.fn(), normalizeUiLanguage: vi.fn() }));
vi.mock("../../src/core/dom.js", () => ({ el: new Proxy({}, { get: () => null }) }));
vi.mock("../../src/core/sync.js", () => ({ enqueueWrite: vi.fn(), syncStoreKeyToSheets: vi.fn() }));
vi.mock("../../src/core/section-base.js", () => ({
  BaseSection: class { subscribe() {} },
  fromSection: () => ({ mount: vi.fn(), unmount: vi.fn(), capabilities: [] }),
}));
vi.mock("../../src/utils/misc.js", () => ({
  uid: vi.fn(() => `uid_${Math.random().toString(36).slice(2, 8)}`),
}));
vi.mock("../../src/utils/phone.js", () => ({
  cleanPhone: vi.fn((p) => p),
  isValidPhone: vi.fn(() => true),
}));
vi.mock("../../src/utils/sanitize.js", () => ({
  sanitize: (data) => ({ value: data, errors: [] }),
}));
vi.mock("../../src/utils/guest-search.js", () => ({
  guestMatchesQuery: vi.fn(() => true),
}));
vi.mock("../../src/utils/undo.js", () => ({ pushUndo: vi.fn() }));
vi.mock("../../src/core/constants.js", () => ({
  GUEST_STATUSES: ["confirmed", "pending", "declined", "maybe"],
  GUEST_SIDES: ["groom", "bride", "mutual"],
  GUEST_GROUPS: ["family", "friends", "work", "neighbors", "other"],
  MEAL_TYPES: ["regular", "vegetarian", "vegan", "gluten_free", "kosher"],
  DATA_CLASS: { PUBLIC: "public", OPERATIONAL: "operational", ADMIN_SENSITIVE: "admin-sensitive", GUEST_PRIVATE: "guest-private" },
  STORE_DATA_CLASS: {},
  TABLE_SHAPES: [],
  VENDOR_CATEGORIES: [],
  EXPENSE_CATEGORIES: [],
  MODALS: {},
  SECTION_LIST: [],
  EXTRA_SECTIONS: [],
  ALL_SECTIONS: [],
  PUBLIC_SECTIONS: new Set(),
  RSVP_RESPONSE_STATUSES: [],
  STORAGE_KEYS: {},
}));

import {
  batchSetStatus,
  batchDeleteGuests,
  findDuplicates,
  mergeGuests,
} from "../../src/sections/guests.js";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeGuest(overrides = {}) {
  const base = { id: `g_${Math.random().toString(36).slice(2, 8)}`, firstName: "Test", lastName: "", phone: "", status: "pending", tableId: null };
  return { ...base, ...overrides };
}

/** Inject selected IDs via hidden checkboxes in DOM */
function selectGuests(ids) {
  // Remove existing
  document.querySelectorAll(".guest-select-cb").forEach((el) => el.remove());
  for (const id of ids) {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "guest-select-cb";
    cb.checked = true;
    cb.dataset.guestId = id;
    document.body.appendChild(cb);
  }
}

beforeEach(() => {
  initStore({ guests: { value: [] } });
  document.querySelectorAll(".guest-select-cb").forEach((el) => el.remove());
});

// ── batchSetStatus ────────────────────────────────────────────────────────

describe("batchSetStatus", () => {
  it("does nothing when no guests selected", () => {
    const g = makeGuest({ id: "g1" });
    storeSet("guests", [g]);
    batchSetStatus("confirmed");
    expect(storeGet("guests")[0].status).toBe("pending");
  });

  it("updates status for selected guests", () => {
    const g1 = makeGuest({ id: "g1" });
    const g2 = makeGuest({ id: "g2" });
    storeSet("guests", [g1, g2]);
    selectGuests(["g1"]);
    batchSetStatus("confirmed");
    const guests = storeGet("guests");
    expect(guests.find((g) => g.id === "g1").status).toBe("confirmed");
    expect(guests.find((g) => g.id === "g2").status).toBe("pending");
  });

  it("does nothing for empty status", () => {
    const g1 = makeGuest({ id: "g1" });
    storeSet("guests", [g1]);
    selectGuests(["g1"]);
    batchSetStatus("");
    expect(storeGet("guests")[0].status).toBe("pending");
  });
});

// ── batchDeleteGuests ─────────────────────────────────────────────────────

describe("batchDeleteGuests", () => {
  it("does nothing when no guests selected", () => {
    storeSet("guests", [makeGuest({ id: "g1" })]);
    batchDeleteGuests();
    expect(storeGet("guests")).toHaveLength(1);
  });

  it("removes selected guests", () => {
    const g1 = makeGuest({ id: "g1" });
    const g2 = makeGuest({ id: "g2" });
    storeSet("guests", [g1, g2]);
    selectGuests(["g1"]);
    batchDeleteGuests();
    const guests = storeGet("guests");
    expect(guests).toHaveLength(1);
    expect(guests[0].id).toBe("g2");
  });

  it("removes multiple selected guests", () => {
    const g1 = makeGuest({ id: "g1" });
    const g2 = makeGuest({ id: "g2" });
    const g3 = makeGuest({ id: "g3" });
    storeSet("guests", [g1, g2, g3]);
    selectGuests(["g1", "g3"]);
    batchDeleteGuests();
    const guests = storeGet("guests");
    expect(guests).toHaveLength(1);
    expect(guests[0].id).toBe("g2");
  });
});

// ── findDuplicates ────────────────────────────────────────────────────────

describe("findDuplicates", () => {
  it("returns empty array when no guests", () => {
    expect(findDuplicates()).toEqual([]);
  });

  it("returns empty array when no duplicates exist", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "Avi", phone: "050" }),
      makeGuest({ id: "g2", firstName: "Sara", phone: "051" }),
    ]);
    expect(findDuplicates()).toEqual([]);
  });

  it("detects duplicate by exact phone match", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", phone: "0501234567" }),
      makeGuest({ id: "g2", phone: "0501234567" }),
    ]);
    const dupes = findDuplicates();
    expect(dupes).toHaveLength(1);
    expect(dupes[0].reason).toBe("phone");
  });

  it("detects duplicate by exact name match", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "Avi", lastName: "Cohen", phone: "" }),
      makeGuest({ id: "g2", firstName: "Avi", lastName: "Cohen", phone: "" }),
    ]);
    const dupes = findDuplicates();
    expect(dupes).toHaveLength(1);
    expect(dupes[0].reason).toBe("name");
  });

  it("does not count same pair twice", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", phone: "050", firstName: "A", lastName: "" }),
      makeGuest({ id: "g2", phone: "050", firstName: "A", lastName: "" }),
    ]);
    // Phone match found first; name match would be the same pair
    expect(findDuplicates()).toHaveLength(1);
  });
});

// ── mergeGuests ───────────────────────────────────────────────────────────

describe("mergeGuests", () => {
  it("does nothing when keepId not found", () => {
    storeSet("guests", [makeGuest({ id: "g1" })]);
    mergeGuests("nonexistent", "g1");
    expect(storeGet("guests")).toHaveLength(1);
  });

  it("does nothing when mergeId not found", () => {
    storeSet("guests", [makeGuest({ id: "g1" })]);
    mergeGuests("g1", "nonexistent");
    expect(storeGet("guests")).toHaveLength(1);
  });

  it("removes the merged guest after merge", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "Avi" }),
      makeGuest({ id: "g2", firstName: "Avi2" }),
    ]);
    mergeGuests("g1", "g2");
    const guests = storeGet("guests");
    expect(guests).toHaveLength(1);
    expect(guests[0].id).toBe("g1");
  });

  it("transfers non-empty field from merged to kept", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "Avi", phone: "" }),
      makeGuest({ id: "g2", firstName: "Avi2", phone: "0501234567" }),
    ]);
    mergeGuests("g1", "g2");
    const kept = storeGet("guests").find((g) => g.id === "g1");
    expect(kept.phone).toBe("0501234567");
  });

  it("keeps existing field in kept when not empty", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "Avi", phone: "051" }),
      makeGuest({ id: "g2", firstName: "Avi2", phone: "050" }),
    ]);
    mergeGuests("g1", "g2");
    const kept = storeGet("guests").find((g) => g.id === "g1");
    expect(kept.phone).toBe("051");
  });

  it("concatenates notes from both guests", () => {
    storeSet("guests", [
      makeGuest({ id: "g1", notes: "note A" }),
      makeGuest({ id: "g2", notes: "note B" }),
    ]);
    mergeGuests("g1", "g2");
    const kept = storeGet("guests").find((g) => g.id === "g1");
    expect(kept.notes).toContain("note A");
    expect(kept.notes).toContain("note B");
  });
});
