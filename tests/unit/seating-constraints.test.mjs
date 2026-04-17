/**
 * tests/unit/seating-constraints.test.mjs — Sprint 138
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/core/store.js", () => {
  const _store = {};
  return {
    initStore: vi.fn((defs) => { for (const [k, { value }] of Object.entries(defs)) _store[k] = value; }),
    storeGet:  vi.fn((key) => _store[key]),
    storeSet:  vi.fn((key, val) => { _store[key] = val; }),
  };
});
vi.mock("../../src/core/state.js", () => ({ getActiveEventId: vi.fn(() => "default") }));

import {
  addConstraint,
  removeConstraint,
  listConstraints,
  validateSeating,
  suggestSwaps,
} from "../../src/services/seating-constraints.js";
import { storeSet } from "../../src/core/store.js";

function reset() { storeSet("seatingConstraints", []); }

beforeEach(reset);

const TABLES = [
  { id: "t1", guestIds: ["g1", "g2"] },
  { id: "t2", guestIds: ["g3", "g4"] },
];

describe("addConstraint", () => {
  it("stores constraint and returns id", () => {
    const id = addConstraint({ guestId: "g1", type: "near", targetGuestId: "g2" });
    expect(id).toMatch(/^sc_/);
    expect(listConstraints()).toHaveLength(1);
  });

  it("throws for invalid type", () => {
    expect(() => addConstraint({ guestId: "g1", type: "beside", targetGuestId: "g2" })).toThrow();
  });
});

describe("removeConstraint", () => {
  it("removes the constraint", () => {
    const id = addConstraint({ guestId: "g1", type: "far", targetGuestId: "g3" });
    removeConstraint(id);
    expect(listConstraints()).toHaveLength(0);
  });
});

describe("validateSeating", () => {
  it("no violation when near-guests are at the same table", () => {
    addConstraint({ guestId: "g1", type: "near", targetGuestId: "g2" });
    expect(validateSeating(TABLES)).toHaveLength(0);
  });

  it("violation when near-guests are at different tables", () => {
    addConstraint({ guestId: "g1", type: "near", targetGuestId: "g3" });
    const v = validateSeating(TABLES);
    expect(v).toHaveLength(1);
    expect(v[0].type).toBe("near");
  });

  it("no violation when far-guests are at different tables", () => {
    addConstraint({ guestId: "g1", type: "far", targetGuestId: "g3" });
    expect(validateSeating(TABLES)).toHaveLength(0);
  });

  it("violation when far-guests share a table", () => {
    addConstraint({ guestId: "g1", type: "far", targetGuestId: "g2" });
    const v = validateSeating(TABLES);
    expect(v).toHaveLength(1);
    expect(v[0].type).toBe("far");
    expect(v[0].message).toMatch(/must not/);
  });

  it("skips unassigned guests silently", () => {
    addConstraint({ guestId: "g99", type: "near", targetGuestId: "g1" });
    expect(validateSeating(TABLES)).toHaveLength(0);
  });
});

describe("suggestSwaps", () => {
  it("suggests moving near-violated guest to target table", () => {
    addConstraint({ guestId: "g1", type: "near", targetGuestId: "g3" });
    const violations = validateSeating(TABLES);
    const swaps = suggestSwaps(TABLES, violations);
    expect(swaps).toHaveLength(1);
    expect(swaps[0].guestA).toBe("g1");
    expect(swaps[0].toTableId).toBe("t2"); // g3's table
  });

  it("suggests moving far-violated guest to another table", () => {
    addConstraint({ guestId: "g1", type: "far", targetGuestId: "g2" });
    const violations = validateSeating(TABLES);
    const swaps = suggestSwaps(TABLES, violations);
    expect(swaps).toHaveLength(1);
    expect(swaps[0].fromTableId).toBe("t1");
    expect(swaps[0].toTableId).not.toBe("t1");
  });
});
