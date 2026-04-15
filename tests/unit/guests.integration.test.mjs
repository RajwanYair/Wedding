/**
 * tests/unit/guests.integration.test.mjs — Integration tests for guests section (S6.7)
 *
 * Mounts the guests section against a real DOM, calls CRUD operations,
 * and verifies that the rendered output matches expectations.
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import { clearDomCache } from "../../src/core/dom.js";
import {
  mount,
  unmount,
  saveGuest,
  deleteGuest,
  setFilter,
  setSearchQuery,
  setSortField,
  renderGuests,
  getGuestStats,
  filterGuestsByStatus,
} from "../../src/sections/guests.js";

// ── DOM scaffold ──────────────────────────────────────────────────────────────

function setupDom() {
  document.body.innerHTML = `
    <table>
      <tbody id="guestTableBody"></tbody>
    </table>
    <div id="guestsEmpty" class="u-hidden">No guests</div>
  `;
  clearDomCache();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGuest(overrides = {}) {
  return {
    firstName: "Alice",
    lastName: "Smith",
    phone: "",
    email: "",
    count: 1,
    children: 0,
    status: "pending",
    side: "groom",
    group: "friends",
    meal: "regular",
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  initStore({ guests: { value: [] }, tables: { value: [] } });
  storeSet("guests", []);
  storeSet("tables", []);
  setupDom();
  mount(document.body);
});

afterEach(() => {
  unmount();
});

// ── mount / unmount ───────────────────────────────────────────────────────────

describe("mount / unmount", () => {
  it("renders an empty tbody when no guests exist", () => {
    const tbody = document.getElementById("guestTableBody");
    expect(tbody.children.length).toBe(0);
  });

  it("shows guestsEmpty when store is empty", () => {
    const empty = document.getElementById("guestsEmpty");
    expect(empty.classList.contains("u-hidden")).toBe(false);
  });
});

// ── saveGuest ─────────────────────────────────────────────────────────────────

describe("saveGuest", () => {
  it("returns ok:true for valid data", () => {
    const result = saveGuest(makeGuest());
    expect(result.ok).toBe(true);
  });

  it("returns ok:false when firstName is missing", () => {
    const result = saveGuest({ firstName: "" });
    expect(result.ok).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("inserts guest into the store", () => {
    saveGuest(makeGuest({ firstName: "Bob" }));
    const guests = storeGet("guests");
    expect(guests).toHaveLength(1);
    expect(guests[0].firstName).toBe("Bob");
  });

  it("generates a unique id for each guest", () => {
    saveGuest(makeGuest({ firstName: "Alice" }));
    saveGuest(makeGuest({ firstName: "Bob" }));
    const guests = storeGet("guests");
    expect(guests[0].id).not.toBe(guests[1].id);
  });

  it("normalises Israeli phone number", () => {
    saveGuest(makeGuest({ phone: "0541234567" }));
    const guests = storeGet("guests");
    expect(guests[0].phone).toBe("972541234567");
  });

  it("renders a table row after saving", async () => {
    saveGuest(makeGuest({ firstName: "Carol" }));
    await Promise.resolve(); // let store notify microtask flush
    const tbody = document.getElementById("guestTableBody");
    expect(tbody.children.length).toBe(1);
  });

  it("hides guestsEmpty after first guest is saved", async () => {
    saveGuest(makeGuest());
    await Promise.resolve(); // let store notify microtask flush
    const empty = document.getElementById("guestsEmpty");
    expect(empty.classList.contains("u-hidden")).toBe(true);
  });

  it("can update an existing guest", () => {
    saveGuest(makeGuest({ firstName: "Diana" }));
    const id = storeGet("guests")[0].id;
    const result = saveGuest({ firstName: "Diana Updated" }, id);
    expect(result.ok).toBe(true);
    expect(storeGet("guests")[0].firstName).toBe("Diana Updated");
  });

  it("returns error when updating non-existent id", () => {
    const result = saveGuest(makeGuest({ firstName: "Eve" }), "nonexistent-id");
    expect(result.ok).toBe(false);
  });
});

// ── deleteGuest ───────────────────────────────────────────────────────────────

describe("deleteGuest", () => {
  it("removes guest from store by id", () => {
    saveGuest(makeGuest({ firstName: "Frank" }));
    const id = storeGet("guests")[0].id;
    deleteGuest(id);
    expect(storeGet("guests")).toHaveLength(0);
  });

  it("re-renders to empty tbody after delete", async () => {
    saveGuest(makeGuest({ firstName: "Grace" }));
    await Promise.resolve();
    const id = storeGet("guests")[0].id;
    deleteGuest(id);
    await Promise.resolve(); // let delete notification flush
    const tbody = document.getElementById("guestTableBody");
    expect(tbody.children.length).toBe(0);
  });

  it("is a no-op for unknown id", () => {
    saveGuest(makeGuest({ firstName: "Henry" }));
    deleteGuest("unknown-id");
    expect(storeGet("guests")).toHaveLength(1);
  });
});

// ── setFilter ────────────────────────────────────────────────────────────────

describe("setFilter", () => {
  beforeEach(() => {
    saveGuest(makeGuest({ firstName: "Iris", status: "confirmed" }));
    saveGuest(makeGuest({ firstName: "John", status: "declined" }));
  });

  it("filters by status:confirmed", () => {
    setFilter("confirmed");
    const tbody = document.getElementById("guestTableBody");
    expect(tbody.children.length).toBe(1);
    setFilter("all"); // reset
  });

  it("shows all when filter is 'all'", () => {
    setFilter("all");
    const tbody = document.getElementById("guestTableBody");
    expect(tbody.children.length).toBe(2);
  });
});

// ── setSearchQuery ────────────────────────────────────────────────────────────

describe("setSearchQuery", () => {
  beforeEach(() => {
    saveGuest(makeGuest({ firstName: "Karen" }));
    saveGuest(makeGuest({ firstName: "Leo" }));
  });

  it("filters to matching guests", () => {
    setSearchQuery("karen");
    const tbody = document.getElementById("guestTableBody");
    expect(tbody.children.length).toBe(1);
    setSearchQuery(""); // reset
  });

  it("returns all when query is empty", () => {
    setSearchQuery("");
    const tbody = document.getElementById("guestTableBody");
    expect(tbody.children.length).toBe(2);
  });
});

// ── setSortField ──────────────────────────────────────────────────────────────

describe("setSortField", () => {
  beforeEach(() => {
    saveGuest(makeGuest({ firstName: "Zara" }));
    saveGuest(makeGuest({ firstName: "Aaron" }));
  });

  it("does not throw and re-renders", () => {
    expect(() => setSortField("firstName")).not.toThrow();
    const tbody = document.getElementById("guestTableBody");
    expect(tbody.children.length).toBe(2);
  });
});

// ── renderGuests (re-render idempotency) ──────────────────────────────────────

describe("renderGuests", () => {
  it("is idempotent — calling twice produces same result", () => {
    saveGuest(makeGuest({ firstName: "Oscar" }));
    renderGuests();
    renderGuests();
    const tbody = document.getElementById("guestTableBody");
    expect(tbody.children.length).toBe(1);
  });
});

// ── getGuestStats ─────────────────────────────────────────────────────────────

describe("getGuestStats", () => {
  it("returns zeros for empty guest list", () => {
    const stats = getGuestStats();
    expect(stats.total).toBe(0);
    expect(stats.confirmed).toBe(0);
    expect(stats.totalSeats).toBe(0);
  });

  it("counts guests by status correctly", () => {
    saveGuest(makeGuest({ status: "confirmed" }));
    saveGuest(makeGuest({ firstName: "Bob", status: "pending" }));
    saveGuest(makeGuest({ firstName: "Carol", status: "declined" }));
    saveGuest(makeGuest({ firstName: "Dan", status: "maybe" }));
    const stats = getGuestStats();
    expect(stats.total).toBe(4);
    expect(stats.confirmed).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.declined).toBe(1);
    expect(stats.maybe).toBe(1);
  });

  it("sums totalSeats from count field", () => {
    saveGuest(makeGuest({ count: 3, status: "confirmed" }));
    saveGuest(makeGuest({ firstName: "Eve", count: 2, status: "confirmed" }));
    const stats = getGuestStats();
    expect(stats.confirmedSeats).toBe(5);
  });

  it("counts meal preferences", () => {
    saveGuest(makeGuest({ meal: "vegetarian" }));
    saveGuest(makeGuest({ firstName: "F", meal: "vegan" }));
    saveGuest(makeGuest({ firstName: "G", meal: "kosher" }));
    const stats = getGuestStats();
    expect(stats.vegetarian).toBe(1);
    expect(stats.vegan).toBe(1);
    expect(stats.kosher).toBe(1);
  });

  it("counts seated vs unseated correctly", () => {
    // saveGuest strips unknown fields (tableId not in schema) — set directly
    storeSet("guests", [
      { id: "g1", firstName: "A", status: "pending", count: 1, tableId: "t1" },
      { id: "g2", firstName: "B", status: "pending", count: 1, tableId: null },
    ]);
    const stats = getGuestStats();
    expect(stats.seated).toBe(1);
    expect(stats.unseated).toBe(1);
  });
});

// ── duplicate phone detection ─────────────────────────────────────────────────

describe("saveGuest — duplicate phone detection", () => {
  it("rejects a guest with a duplicate phone number", () => {
    saveGuest(makeGuest({ phone: "0501234567" }));
    const result = saveGuest(makeGuest({ firstName: "Dup", phone: "0501234567" }));
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("allows updating existing guest with same phone", () => {
    saveGuest(makeGuest({ phone: "0507777777" }));
    const id = storeGet("guests")[0].id;
    // Update same guest — should succeed
    const r2 = saveGuest(makeGuest({ phone: "0507777777", firstName: "Updated" }), id);
    expect(r2.ok).toBe(true);
  });

  it("allows two guests with different phones", () => {
    saveGuest(makeGuest({ phone: "0501111111" }));
    const result = saveGuest(makeGuest({ firstName: "Other", phone: "0502222222" }));
    expect(result.ok).toBe(true);
  });
});

// ── filterGuestsByStatus ──────────────────────────────────────────────────────

describe("filterGuestsByStatus", () => {
  it("returns all guests when status is 'all'", () => {
    saveGuest(makeGuest({ status: "confirmed" }));
    saveGuest(makeGuest({ firstName: "B", status: "pending" }));
    expect(filterGuestsByStatus("all").length).toBe(2);
  });

  it("returns only matching guests for a given status", () => {
    saveGuest(makeGuest({ status: "confirmed" }));
    saveGuest(makeGuest({ firstName: "B", status: "pending" }));
    expect(filterGuestsByStatus("confirmed").length).toBe(1);
    expect(filterGuestsByStatus("pending").length).toBe(1);
    expect(filterGuestsByStatus("declined").length).toBe(0);
  });

  it("returns all guests when no status argument provided", () => {
    saveGuest(makeGuest({ status: "confirmed" }));
    saveGuest(makeGuest({ firstName: "B", status: "declined" }));
    expect(filterGuestsByStatus().length).toBe(2);
  });
});
