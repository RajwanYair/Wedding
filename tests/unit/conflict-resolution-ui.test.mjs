/**
 * tests/unit/conflict-resolution-ui.test.mjs — Sprint 92
 */

import { describe, it, expect } from "vitest";
import {
  buildConflictGroups,
  hasConflictForField,
  conflictSummary,
  filterManualConflicts,
} from "../../src/utils/conflict-resolution-ui.js";

const CONFLICTS = [
  { id: "g1", field: "status",    localVal: "pending",  remoteVal: "confirmed", strategy: "remote_wins" },
  { id: "g1", field: "tableId",   localVal: "t1",       remoteVal: "t2",        strategy: "manual" },
  { id: "g2", field: "firstName", localVal: "Alice",    remoteVal: "Alicia",    strategy: "manual" },
];

describe("buildConflictGroups", () => {
  it("groups conflicts by id", () => {
    const groups = buildConflictGroups(CONFLICTS);
    expect(groups.length).toBe(2);
    const g1 = groups.find((g) => g.id === "g1");
    expect(g1.conflicts.length).toBe(2);
  });

  it("converts field to human-readable label", () => {
    const groups = buildConflictGroups(CONFLICTS);
    const g1 = groups.find((g) => g.id === "g1");
    const statusRow = g1.conflicts.find((c) => c.label === "RSVP Status");
    expect(statusRow).toBeDefined();
  });

  it("formats null value as em dash", () => {
    const groups = buildConflictGroups([
      { id: "g1", field: "notes", localVal: null, remoteVal: "hello", strategy: "remote_wins" },
    ]);
    expect(groups[0].conflicts[0].local).toBe("\u2014");
  });

  it("formats boolean value as Yes/No", () => {
    const groups = buildConflictGroups([
      { id: "g1", field: "checkedIn", localVal: true, remoteVal: false, strategy: "local_wins" },
    ]);
    expect(groups[0].conflicts[0].local).toBe("Yes");
    expect(groups[0].conflicts[0].remote).toBe("No");
  });

  it("returns empty array for empty conflicts list", () => {
    expect(buildConflictGroups([])).toEqual([]);
  });
});

describe("hasConflictForField", () => {
  it("returns true when field exists", () => {
    expect(hasConflictForField(CONFLICTS, "status")).toBe(true);
  });

  it("returns false when field is absent", () => {
    expect(hasConflictForField(CONFLICTS, "email")).toBe(false);
  });
});

describe("conflictSummary", () => {
  it("returns 'No conflicts' for empty groups", () => {
    expect(conflictSummary([])).toBe("No conflicts");
  });

  it("returns singular for 1 conflict in 1 record", () => {
    const groups = buildConflictGroups([CONFLICTS[0]]);
    expect(conflictSummary(groups)).toMatch(/1 field conflict for 1 record/);
  });

  it("returns plural across multiple records", () => {
    const groups = buildConflictGroups(CONFLICTS);
    expect(conflictSummary(groups)).toMatch(/3 conflicts across 2 records/);
  });
});

describe("filterManualConflicts", () => {
  it("removes non-manual conflicts", () => {
    const groups = buildConflictGroups(CONFLICTS);
    const manual = filterManualConflicts(groups);
    for (const g of manual) {
      for (const c of g.conflicts) {
        expect(c.strategy).toBe("manual");
      }
    }
  });

  it("excludes groups with no manual conflicts", () => {
    const noManual = [
      { id: "g1", field: "status", localVal: "pending", remoteVal: "confirmed", strategy: "remote_wins" },
    ];
    const groups = buildConflictGroups(noManual);
    expect(filterManualConflicts(groups)).toEqual([]);
  });

  it("keeps groups that have at least one manual conflict", () => {
    const groups = buildConflictGroups(CONFLICTS);
    const manual = filterManualConflicts(groups);
    expect(manual.length).toBe(2);
  });
});
