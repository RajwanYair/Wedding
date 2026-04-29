/**
 * tests/unit/conflict-detector.test.mjs — Tests for conflict-detector.js (Sprint 64)
 */

import { describe, it, expect } from "vitest";
import {
  detectConflicts,
  resolveConflict,
  resolveAllForId,
  getConflictingIds,
  groupConflictById,
} from "../../src/services/sync.js";

describe("detectConflicts", () => {
  it("returns empty array when all records match", () => {
    const records = [{ id: "1", name: "Alice", status: "confirmed" }];
    expect(detectConflicts(records, records)).toStrictEqual([]);
  });

  it("detects a single field conflict", () => {
    const local  = [{ id: "1", name: "Alice",  status: "pending" }];
    const remote = [{ id: "1", name: "Alice",  status: "confirmed" }];
    const result = detectConflicts(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("status");
    expect(result[0].localVal).toBe("pending");
    expect(result[0].remoteVal).toBe("confirmed");
  });

  it("detects multiple field conflicts on the same record", () => {
    const local  = [{ id: "1", name: "Alice", count: 2, status: "pending" }];
    const remote = [{ id: "1", name: "Bob",   count: 3, status: "pending" }];
    const result = detectConflicts(local, remote);
    const fields = result.map((r) => r.field).sort();
    expect(fields).toStrictEqual(["count", "name"]);
  });

  it("ignores records only in local (no remote counterpart)", () => {
    const local  = [{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }];
    const remote = [{ id: "1", name: "Alice" }];
    expect(detectConflicts(local, remote)).toHaveLength(0);
  });

  it("ignores records only in remote", () => {
    const local  = [{ id: "1", name: "Alice" }];
    const remote = [{ id: "1", name: "Alice" }, { id: "2", name: "Remote-only" }];
    expect(detectConflicts(local, remote)).toHaveLength(0);
  });

  it("skips updatedAt and createdAt by default", () => {
    const local  = [{ id: "1", status: "pending", updatedAt: "2024-01-01" }];
    const remote = [{ id: "1", status: "pending", updatedAt: "2024-12-01" }];
    expect(detectConflicts(local, remote)).toHaveLength(0);
  });

  it("skips custom fields passed via options.skip", () => {
    const local  = [{ id: "1", notes: "foo", status: "pending" }];
    const remote = [{ id: "1", notes: "bar", status: "pending" }];
    expect(detectConflicts(local, remote, { skip: ["notes"] })).toHaveLength(0);
  });

  it("assigns default strategy based on updatedAt", () => {
    const local  = [{ id: "1", status: "pending",   updatedAt: "2024-12-01" }];
    const remote = [{ id: "1", status: "confirmed", updatedAt: "2024-01-01" }];
    const result = detectConflicts(local, remote);
    expect(result[0].strategy).toBe("local"); // local is newer
  });

  it("assigns remote strategy when remote updatedAt is newer", () => {
    const local  = [{ id: "1", status: "pending",   updatedAt: "2024-01-01" }];
    const remote = [{ id: "1", status: "confirmed", updatedAt: "2024-12-01" }];
    const result = detectConflicts(local, remote);
    expect(result[0].strategy).toBe("remote");
  });

  it("handles null values as different", () => {
    const local  = [{ id: "1", meal: null }];
    const remote = [{ id: "1", meal: "vegan" }];
    expect(detectConflicts(local, remote)).toHaveLength(1);
  });
});

describe("resolveConflict", () => {
  const conflict = { id: "1", field: "status", localVal: "pending", remoteVal: "confirmed", strategy: "local" };

  it("local strategy returns localVal", () => {
    const r = resolveConflict(conflict, "local");
    expect(r.value).toBe("pending");
    expect(r.patch).toStrictEqual({ status: "pending" });
  });

  it("remote strategy returns remoteVal", () => {
    const r = resolveConflict(conflict, "remote");
    expect(r.value).toBe("confirmed");
  });

  it("merge strategy prefers non-null local", () => {
    const c = { ...conflict, localVal: "present", remoteVal: null, strategy: "merge" };
    expect(resolveConflict(c, "merge").value).toBe("present");
  });

  it("merge strategy falls back to remote when local is null", () => {
    const c = { ...conflict, localVal: null, remoteVal: "remote-val", strategy: "merge" };
    expect(resolveConflict(c, "merge").value).toBe("remote-val");
  });

  it("falls back to conflict.strategy when no strategy arg", () => {
    const r = resolveConflict({ ...conflict, strategy: "remote" }, /** @type {*} */ (undefined));
    expect(r.value).toBe("confirmed");
  });
});

describe("resolveAllForId", () => {
  it("returns merged patch for given id", () => {
    const conflicts = [
      { id: "1", field: "status", localVal: "a", remoteVal: "b", strategy: "local" },
      { id: "1", field: "name",   localVal: "Alice", remoteVal: "Bob", strategy: "local" },
      { id: "2", field: "status", localVal: "x", remoteVal: "y", strategy: "remote" },
    ];
    const patch = resolveAllForId(conflicts, "1", "remote");
    expect(patch).toStrictEqual({ status: "b", name: "Bob" });
  });
});

describe("getConflictingIds", () => {
  it("returns unique ids", () => {
    const conflicts = [
      { id: "1", field: "a", localVal: 1, remoteVal: 2, strategy: "local" },
      { id: "1", field: "b", localVal: 3, remoteVal: 4, strategy: "local" },
      { id: "2", field: "a", localVal: 5, remoteVal: 6, strategy: "remote" },
    ];
    expect(getConflictingIds(conflicts).sort()).toStrictEqual(["1", "2"]);
  });
});

describe("groupConflictById", () => {
  it("groups conflicts by record id", () => {
    const conflicts = [
      { id: "1", field: "x", localVal: 1, remoteVal: 2, strategy: "local" },
      { id: "2", field: "y", localVal: 3, remoteVal: 4, strategy: "remote" },
      { id: "1", field: "z", localVal: 5, remoteVal: 6, strategy: "local" },
    ];
    const groups = groupConflictById(conflicts);
    expect(groups["1"]).toHaveLength(2);
    expect(groups["2"]).toHaveLength(1);
  });
});
