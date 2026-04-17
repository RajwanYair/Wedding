/**
 * tests/unit/donation-tracker.test.mjs — Sprint 137
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/core/store.js", () => {
  const _store = {};
  return {
    initStore: vi.fn((defs) => {
      for (const [k, { value }] of Object.entries(defs)) _store[k] = value;
    }),
    storeGet: vi.fn((key) => _store[key]),
    storeSet: vi.fn((key, val) => { _store[key] = val; }),
  };
});

vi.mock("../../src/core/state.js", () => ({ getActiveEventId: vi.fn(() => "default") }));

import {
  createDonationGoal,
  recordDonation,
  getDonationStats,
  listDonationGoals,
  deleteDonationGoal,
} from "../../src/services/donation-tracker.js";

import { storeGet, storeSet } from "../../src/core/store.js";

function resetStore() {
  storeSet("donationGoals", []);
  storeSet("donations", []);
}

beforeEach(() => resetStore());

describe("createDonationGoal", () => {
  it("creates a goal and returns id", () => {
    const id = createDonationGoal({ name: "Honeymoon Fund", target: 5000 });
    expect(id).toMatch(/^dg_/);
    const goals = listDonationGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0].name).toBe("Honeymoon Fund");
    expect(goals[0].target).toBe(5000);
  });

  it("supports optional notes", () => {
    const id = createDonationGoal({ name: "G", target: 100, notes: "note" });
    const goals = listDonationGoals();
    expect(goals.find((g) => g.id === id).notes).toBe("note");
  });
});

describe("recordDonation", () => {
  it("records a donation and returns id", () => {
    const goalId = createDonationGoal({ name: "Fund", target: 1000 });
    const dId = recordDonation({ goalId, amount: 200, donorName: "Alice" });
    expect(dId).toMatch(/^dn_/);
  });

  it("supports anonymous donor", () => {
    const goalId = createDonationGoal({ name: "Fund", target: 1000 });
    recordDonation({ goalId, amount: 50 });
    const stats = getDonationStats(goalId);
    expect(stats.donors).toContain("Anonymous");
  });
});

describe("getDonationStats", () => {
  it("returns zeros for unknown goal", () => {
    const stats = getDonationStats("nonexistent");
    expect(stats.total).toBe(0);
    expect(stats.count).toBe(0);
  });

  it("calculates total and percentFunded", () => {
    const goalId = createDonationGoal({ name: "Fund", target: 1000 });
    recordDonation({ goalId, amount: 400, donorName: "Alice" });
    recordDonation({ goalId, amount: 100, donorName: "Bob" });
    const stats = getDonationStats(goalId);
    expect(stats.total).toBe(500);
    expect(stats.count).toBe(2);
    expect(stats.percentFunded).toBe(50);
    expect(stats.remaining).toBe(500);
    expect(stats.donors).toContain("Alice");
    expect(stats.donors).toContain("Bob");
  });

  it("remaining is 0 when goal exceeded", () => {
    const goalId = createDonationGoal({ name: "Fund", target: 100 });
    recordDonation({ goalId, amount: 150 });
    expect(getDonationStats(goalId).remaining).toBe(0);
  });
});

describe("deleteDonationGoal", () => {
  it("removes goal and its donations", () => {
    const goalId = createDonationGoal({ name: "Fund", target: 500 });
    recordDonation({ goalId, amount: 100 });
    deleteDonationGoal(goalId);
    expect(listDonationGoals()).toHaveLength(0);
    expect(getDonationStats(goalId).count).toBe(0);
  });
});
