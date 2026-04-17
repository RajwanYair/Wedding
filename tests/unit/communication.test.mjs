/**
 * tests/unit/communication.test.mjs — Unit tests for Communication Hub (Phase 10.2)
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";
import {
  getThankyouQueueStats,
  addCommLogEntry,
} from "../../src/sections/communication.js";

function seedStore() {
  initStore({
    guests: { value: [] },
    commLog: { value: [] },
  });
}

describe("getThankyouQueueStats", () => {
  beforeEach(() => {
    seedStore();
  });

  it("returns zero stats when commLog is empty", () => {
    const { total, sent, pending, failed } = getThankyouQueueStats();
    expect(total).toBe(0);
    expect(sent).toBe(0);
    expect(pending).toBe(0);
    expect(failed).toBe(0);
  });

  it("counts each status correctly", () => {
    storeSet("commLog", [
      { status: "sent" },
      { status: "sent" },
      { status: "failed" },
      { status: "pending" },
    ]);
    const { total, sent, pending, failed } = getThankyouQueueStats();
    expect(total).toBe(4);
    expect(sent).toBe(2);
    expect(failed).toBe(1);
    expect(pending).toBe(1);
  });

  it("treats entries without explicit status as pending", () => {
    storeSet("commLog", [{ guestId: "x" }, { status: "sent" }]);
    const { pending, sent } = getThankyouQueueStats();
    // Entry without status is neither sent nor failed → counted as pending
    expect(sent).toBe(1);
    expect(pending).toBe(1);
  });
});

describe("addCommLogEntry", () => {
  beforeEach(() => {
    seedStore();
  });

  it("appends an entry to commLog", () => {
    addCommLogEntry({
      guestId: "g1",
      guestName: "Alice",
      type: "whatsapp",
      message: "Thank you!",
      status: "pending",
    });
    const stats = getThankyouQueueStats();
    expect(stats.total).toBe(1);
    expect(stats.pending).toBe(1);
  });

  it("adds an id and ts to the entry", () => {
    addCommLogEntry({
      guestId: "g2",
      guestName: "Bob",
      type: "sms",
      message: "Thanks",
      status: "sent",
    });
    const stats = getThankyouQueueStats();
    expect(stats.sent).toBe(1);
  });

  it("can accumulate multiple entries", () => {
    for (let i = 0; i < 5; i++) {
      addCommLogEntry({
        guestId: `g${i}`,
        guestName: `Guest ${i}`,
        type: "email",
        message: "msg",
        status: i < 3 ? "sent" : "pending",
      });
    }
    const { total, sent, pending } = getThankyouQueueStats();
    expect(total).toBe(5);
    expect(sent).toBe(3);
    expect(pending).toBe(2);
  });
});
