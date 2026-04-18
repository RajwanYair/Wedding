/**
 * tests/unit/guest-landing.test.mjs — Sprint 216
 *
 * Unit tests for src/sections/guest-landing.js
 *
 * Coverage: mount/unmount lifecycle, _renderFromHash (DOM writes via
 * data-* attribute selectors, guest lookup, table lookup, fallback text).
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";
import { mount, unmount } from "../../src/sections/guest-landing.js";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Build a realistic container with the data-* slots the section reads. */
function makeContainer() {
  const div = document.createElement("div");
  div.innerHTML = `
    <span data-guest-name></span>
    <span data-wedding-date></span>
    <span data-guest-table></span>
    <span data-rsvp-status></span>
  `;
  document.body.appendChild(div);
  return div;
}

/** Set ?guestId=<id> on window.location. */
function setGuestIdParam(id) {
  Object.defineProperty(window, "location", {
    writable: true,
    value: {
      ...window.location,
      search: id ? `?guestId=${id}` : "",
    },
  });
}

function seedStore(guests = [], tables = [], info = {}) {
  initStore({
    guests: { value: guests },
    tables: { value: tables },
    weddingInfo: { value: info },
  });
}

let container;

beforeEach(() => {
  container = makeContainer();
  seedStore();
  setGuestIdParam(null);
});

afterEach(() => {
  unmount();
  container.remove();
});

// ── mount / unmount lifecycle ────────────────────────────────────────────

describe("mount/unmount", () => {
  it("mount does not throw", () => {
    expect(() => mount(container)).not.toThrow();
  });

  it("unmount does not throw even when called before mount", () => {
    expect(() => unmount()).not.toThrow();
  });

  it("unmount can be called after mount without throwing", () => {
    mount(container);
    expect(() => unmount()).not.toThrow();
  });
});

// ── no guestId param ─────────────────────────────────────────────────────

describe("when no guestId param", () => {
  it("leaves all slots empty when no ?guestId in URL", () => {
    setGuestIdParam(null);
    mount(container);
    expect(container.querySelector("[data-guest-name]").textContent).toBe("");
    expect(container.querySelector("[data-guest-table]").textContent).toBe("");
  });
});

// ── guestId does not match any guest ───────────────────────────────────────

describe("when guestId has no matching guest", () => {
  it("leaves all slots empty for unknown guestId", () => {
    setGuestIdParam("nonexistent");
    seedStore(
      [{ id: "g1", firstName: "Alice", lastName: "Smith", status: "confirmed" }],
      [],
      {},
    );
    mount(container);
    expect(container.querySelector("[data-guest-name]").textContent).toBe("");
  });
});

// ── happy path — guest found, table assigned ──────────────────────────────

describe("renders guest info when guestId matches", () => {
  const GUEST = {
    id: "g1",
    firstName: "Alice",
    lastName: "Cohen",
    status: "confirmed",
    tableId: "t1",
  };
  const TABLE = { id: "t1", name: "Table 1", capacity: 8 };

  beforeEach(() => {
    seedStore([GUEST], [TABLE], { date: "2025-09-12" });
    setGuestIdParam("g1");
  });

  it("writes the guest full name", () => {
    mount(container);
    const slot = container.querySelector("[data-guest-name]");
    expect(slot.textContent.trim()).toBe("Alice Cohen");
  });

  it("writes the table name", () => {
    mount(container);
    const slot = container.querySelector("[data-guest-table]");
    expect(slot.textContent).toBe("Table 1");
  });

  it("writes the RSVP status i18n text", () => {
    mount(container);
    const slot = container.querySelector("[data-rsvp-status]");
    // t("status_confirmed") — whatever the i18n returns, it should be non-empty
    expect(slot.textContent.length).toBeGreaterThan(0);
  });

  it("writes the wedding date when weddingInfo.date is set", () => {
    mount(container);
    const slot = container.querySelector("[data-wedding-date]");
    expect(slot.textContent.length).toBeGreaterThan(0);
  });
});

// ── guest without a table assigned ───────────────────────────────────────

describe("renders fallback when guest has no table", () => {
  it("fills table slot with i18n fallback key text", () => {
    seedStore(
      [{ id: "g2", firstName: "Bob", lastName: "Jones", status: "pending", tableId: null }],
      [],
      {},
    );
    setGuestIdParam("g2");
    mount(container);
    const slot = container.querySelector("[data-guest-table]");
    // t("table_tbd") returns something non-empty from the i18n system
    expect(slot.textContent.length).toBeGreaterThan(0);
  });
});

// ── missing data-* slots ─────────────────────────────────────────────────

describe("graceful degradation when DOM slots are absent", () => {
  it("does not throw when container has no data-* children", () => {
    const emptyDiv = document.createElement("div");
    document.body.appendChild(emptyDiv);
    seedStore(
      [{ id: "g3", firstName: "Carol", lastName: "Levi", status: "maybe", tableId: null }],
      [],
      {},
    );
    setGuestIdParam("g3");
    expect(() => mount(emptyDiv)).not.toThrow();
    emptyDiv.remove();
  });
});
