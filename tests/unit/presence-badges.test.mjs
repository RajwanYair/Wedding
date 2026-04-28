/**
 * tests/unit/presence-badges.test.mjs — S112 presence badges.
 */
import { describe, it, expect } from "vitest";
import {
  isFresh,
  groupByViewing,
  badgeFor,
} from "../../src/services/presence-service.js";

const NOW = Date.parse("2026-04-27T12:00:00Z");

describe("S112 — presence-badges", () => {
  it("isFresh true within 60s", () => {
    expect(
      isFresh({ email: "a", name: "A", lastSeen: "2026-04-27T11:59:30Z" }, 60_000, NOW),
    ).toBe(true);
  });

  it("isFresh false beyond maxAge", () => {
    expect(
      isFresh({ email: "a", name: "A", lastSeen: "2026-04-27T11:55:00Z" }, 60_000, NOW),
    ).toBe(false);
  });

  it("groupByViewing skips entries without viewing field", () => {
    const list = [
      { email: "a", name: "A", lastSeen: "2026-04-27T11:59:50Z", viewing: "g1" },
      { email: "b", name: "B", lastSeen: "2026-04-27T11:59:50Z" },
    ];
    const m = groupByViewing(list, 60_000, NOW);
    expect(m.size).toBe(1);
    expect(m.get("g1")?.length).toBe(1);
  });

  it("groupByViewing groups multiple users by record", () => {
    const list = [
      { email: "a", name: "A", lastSeen: "2026-04-27T11:59:50Z", viewing: "g1" },
      { email: "b", name: "B", lastSeen: "2026-04-27T11:59:50Z", viewing: "g1" },
      { email: "c", name: "C", lastSeen: "2026-04-27T11:59:50Z", viewing: "g2" },
    ];
    const m = groupByViewing(list, 60_000, NOW);
    expect(m.get("g1")?.length).toBe(2);
    expect(m.get("g2")?.length).toBe(1);
  });

  it("badgeFor returns initials + overflow", () => {
    const r = badgeFor(
      [
        { email: "a@x", name: "Alpha", lastSeen: "" },
        { email: "b@x", name: "Bravo", lastSeen: "" },
        { email: "c@x", name: "Charlie", lastSeen: "" },
        { email: "d@x", name: "Delta", lastSeen: "" },
      ],
      3,
    );
    expect(r.initials).toEqual(["A", "B", "C"]);
    expect(r.overflow).toBe(1);
    expect(r.total).toBe(4);
  });

  it("badgeFor handles empty list", () => {
    expect(badgeFor([])).toEqual({ initials: [], overflow: 0, total: 0 });
  });
});
