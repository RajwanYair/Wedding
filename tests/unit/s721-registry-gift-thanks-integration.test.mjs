/**
 * S721 integration tests
 * - markGiftReceived / markGiftPending / getGiftSummary  (registry.js <- gift-registry.js)
 * - recordGiftThanks / isGiftThanked                      (registry.js <- gift-thanks.js)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeSet, storeGet } from "../../src/core/store.js";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn() }));

const GIFTS_KEY = "wedding_v1_registry_gifts";
const THANKS_KEY = "wedding_v1_registry_thanks";

beforeEach(() => {
  initStore({});
  storeSet(GIFTS_KEY, []);
  storeSet(THANKS_KEY, []);
});

import {
  markGiftReceived,
  markGiftPending,
  getGiftSummary,
  recordGiftThanks,
  isGiftThanked,
} from "../../src/sections/registry.js";

describe("S721 -- markGiftReceived + markGiftPending + getGiftSummary", () => {
  it("markGiftReceived marks a gift as received", () => {
    storeSet(GIFTS_KEY, [{ id: "g1", name: "Toaster", received: false }]);
    markGiftReceived("g1", "giver_1");
    const items = storeGet(GIFTS_KEY);
    expect(items[0].received).toBe(true);
    expect(items[0].giverId).toBe("giver_1");
  });

  it("markGiftPending clears the received flag", () => {
    storeSet(GIFTS_KEY, [{ id: "g2", name: "Blender", received: true, giverId: "giver_1" }]);
    markGiftPending("g2");
    const items = storeGet(GIFTS_KEY);
    expect(items[0].received).toBeFalsy();
  });

  it("getGiftSummary returns counts of received/pending", () => {
    storeSet(GIFTS_KEY, [
      { id: "g1", received: true },
      { id: "g2", received: false },
      { id: "g3", received: false },
    ]);
    const summary = getGiftSummary();
    expect(summary.total).toBe(3);
    expect(summary.received).toBe(1);
    expect(summary.pending).toBe(2);
  });
});

describe("S721 -- recordGiftThanks + isGiftThanked", () => {
  it("recordGiftThanks persists a thank-you record", () => {
    recordGiftThanks("g1", "giver_1");
    const thanks = storeGet(THANKS_KEY);
    expect(thanks.some((t) => t.giftId === "g1" && t.giverId === "giver_1")).toBe(true);
  });

  it("isGiftThanked returns true after recording", () => {
    recordGiftThanks("g2", "giver_2");
    expect(isGiftThanked("g2")).toBe(true);
  });

  it("isGiftThanked returns false for unrecorded gift", () => {
    expect(isGiftThanked("no_such_gift")).toBe(false);
  });
});
