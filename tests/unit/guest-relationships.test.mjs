/**
 * tests/unit/guest-relationships.test.mjs — Sprint 39
 *
 * Tests for src/utils/guest-relationships.js —
 *   buildRelationshipGraph, getGroupMembers, getSideMembers,
 *   findSeparatedGroupMembers, getClusterStats, suggestTableConsolidation
 */

import { describe, it, expect } from "vitest";
import { makeGuest, makeTable } from "./helpers.js";
import {
  buildRelationshipGraph,
  getGroupMembers,
  getSideMembers,
  findSeparatedGroupMembers,
  getClusterStats,
  suggestTableConsolidation,
} from "../../src/utils/guest-relationships.js";

// ── buildRelationshipGraph ─────────────────────────────────────────────

describe("buildRelationshipGraph()", () => {
  it("returns empty graph for empty guest list", () => {
    expect(buildRelationshipGraph([])).toEqual({});
  });

  it("clusters guests by same side+group", () => {
    const a = makeGuest({ id: "g1", side: "bride", group: "family" });
    const b = makeGuest({ id: "g2", side: "bride", group: "family" });
    const c = makeGuest({ id: "g3", side: "groom", group: "family" });
    const graph = buildRelationshipGraph([a, b, c]);
    expect(graph["g1"]).toContain("g2");
    expect(graph["g1"]).not.toContain("g3");
  });

  it("guest is not in its own adjacency list", () => {
    const a = makeGuest({ id: "g1", side: "bride", group: "friends" });
    const graph = buildRelationshipGraph([a]);
    expect(graph["g1"]).toHaveLength(0);
  });

  it("guests in different groups are not linked", () => {
    const a = makeGuest({ id: "g1", side: "bride", group: "family" });
    const b = makeGuest({ id: "g2", side: "bride", group: "coworkers" });
    const graph = buildRelationshipGraph([a, b]);
    expect(graph["g1"]).toHaveLength(0);
    expect(graph["g2"]).toHaveLength(0);
  });
});

// ── getGroupMembers / getSideMembers ───────────────────────────────────

describe("getGroupMembers()", () => {
  it("returns guests matching the group", () => {
    const guests = [
      makeGuest({ group: "family" }),
      makeGuest({ group: "friends" }),
      makeGuest({ group: "family" }),
    ];
    expect(getGroupMembers(guests, "family")).toHaveLength(2);
  });

  it("returns empty array when no match", () => {
    expect(getGroupMembers([makeGuest({ group: "friends" })], "family")).toHaveLength(0);
  });
});

describe("getSideMembers()", () => {
  it("returns guests on the given side", () => {
    const guests = [
      makeGuest({ side: "bride" }),
      makeGuest({ side: "groom" }),
      makeGuest({ side: "bride" }),
    ];
    expect(getSideMembers(guests, "bride")).toHaveLength(2);
  });
});

// ── findSeparatedGroupMembers ──────────────────────────────────────────

describe("findSeparatedGroupMembers()", () => {
  it("returns empty array when no conflicts", () => {
    const guests = [
      makeGuest({ id: "g1", side: "bride", group: "family", tableId: "t1" }),
      makeGuest({ id: "g2", side: "bride", group: "family", tableId: "t1" }),
    ];
    const graph = buildRelationshipGraph(guests);
    expect(findSeparatedGroupMembers(guests, graph)).toHaveLength(0);
  });

  it("detects group members seated at different tables", () => {
    const guests = [
      makeGuest({ id: "g1", side: "bride", group: "family", tableId: "t1" }),
      makeGuest({ id: "g2", side: "bride", group: "family", tableId: "t2" }),
    ];
    const graph = buildRelationshipGraph(guests);
    const conflicts = findSeparatedGroupMembers(guests, graph);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reason).toBe("conflict");
  });

  it("does not report conflict when either guest is unassigned", () => {
    const guests = [
      makeGuest({ id: "g1", side: "bride", group: "family", tableId: "t1" }),
      makeGuest({ id: "g2", side: "bride", group: "family", tableId: null }),
    ];
    const graph = buildRelationshipGraph(guests);
    expect(findSeparatedGroupMembers(guests, graph)).toHaveLength(0);
  });
});

// ── getClusterStats ────────────────────────────────────────────────────

describe("getClusterStats()", () => {
  it("returns correct member count per cluster", () => {
    const guests = [
      makeGuest({ side: "bride", group: "family" }),
      makeGuest({ side: "bride", group: "family" }),
      makeGuest({ side: "groom", group: "family" }),
    ];
    const stats = getClusterStats(guests);
    const brideFamily = stats.find((s) => s.side === "bride" && s.group === "family");
    expect(brideFamily?.members).toBe(2);
  });

  it("counts heads including children", () => {
    const guests = [makeGuest({ side: "bride", group: "family", count: 2, children: 1 })];
    const stats = getClusterStats(guests);
    expect(stats[0].heads).toBe(3);
  });
});

// ── suggestTableConsolidation ──────────────────────────────────────────

describe("suggestTableConsolidation()", () => {
  it("returns empty array when all clusters are on one table", () => {
    const guests = [
      makeGuest({ id: "g1", side: "bride", group: "family", tableId: "t1" }),
      makeGuest({ id: "g2", side: "bride", group: "family", tableId: "t1" }),
    ];
    const tables = [makeTable({ id: "t1" })];
    expect(suggestTableConsolidation(guests, tables)).toHaveLength(0);
  });

  it("suggests consolidation for split clusters", () => {
    const guests = [
      makeGuest({ id: "g1", side: "bride", group: "family", tableId: "t1" }),
      makeGuest({ id: "g2", side: "bride", group: "family", tableId: "t2" }),
    ];
    const tables = [
      makeTable({ id: "t1", capacity: 8 }),
      makeTable({ id: "t2", capacity: 10 }),
    ];
    const suggestions = suggestTableConsolidation(guests, tables);
    expect(suggestions).toHaveLength(1);
    // Larger table (t2, cap 10) is preferred
    expect(suggestions[0].suggestedTable).toBe("t2");
  });
});
