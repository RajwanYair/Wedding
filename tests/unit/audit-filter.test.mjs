// @ts-check
/**
 * tests/unit/audit-filter.test.mjs — S588
 */
import { describe, it, expect } from "vitest";
import {
  filterAuditEntries,
  uniqueAuditActions,
  uniqueAuditEntities,
} from "../../src/utils/audit-filter.js";

const sample = [
  { ts: "2026-04-01T10:00:00Z", action: "create", entity: "guest", entityId: "g1", userEmail: "ALICE@x.com", diff: { name: "Yael" } },
  { ts: "2026-04-02T11:00:00Z", action: "update", entity: "guest", entityId: "g1", userEmail: "bob@x.com", diff: "rsvp:confirmed" },
  { ts: "2026-04-03T12:00:00Z", action: "delete", entity: "vendor", entityId: "v9", userEmail: "alice@x.com" },
  { ts: "2026-04-04T13:00:00Z", action: "update", entity: "table", entityId: "t3", userEmail: "carol@x.com", diff: { seats: 8 } },
];

describe("S588 audit filter", () => {
  it("returns all entries when filter is empty", () => {
    expect(filterAuditEntries(sample)).toHaveLength(4);
  });

  it("filters by action exact match", () => {
    const r = filterAuditEntries(sample, { action: "update" });
    expect(r.map((e) => e.entityId)).toEqual(["g1", "t3"]);
  });

  it("filters by entity exact match", () => {
    const r = filterAuditEntries(sample, { entity: "guest" });
    expect(r).toHaveLength(2);
  });

  it("filters by case-insensitive userEmail substring", () => {
    const r = filterAuditEntries(sample, { userEmail: "alice" });
    expect(r).toHaveLength(2);
  });

  it("filters by free-text query across diff", () => {
    const r = filterAuditEntries(sample, { query: "yael" });
    expect(r).toHaveLength(1);
  });

  it("filters by ISO date range (inclusive)", () => {
    const r = filterAuditEntries(sample, {
      from: "2026-04-02T00:00:00Z",
      to: "2026-04-03T23:59:59Z",
    });
    expect(r).toHaveLength(2);
  });

  it("combines action + user filters with AND", () => {
    const r = filterAuditEntries(sample, { action: "delete", userEmail: "alice" });
    expect(r).toHaveLength(1);
    expect(r[0].entity).toBe("vendor");
  });

  it("returns empty array for non-array input", () => {
    expect(filterAuditEntries(/** @type {any} */ (null))).toEqual([]);
  });

  it("uniqueAuditActions sorted", () => {
    expect(uniqueAuditActions(sample)).toEqual(["create", "delete", "update"]);
  });

  it("uniqueAuditEntities sorted", () => {
    expect(uniqueAuditEntities(sample)).toEqual(["guest", "table", "vendor"]);
  });
});
