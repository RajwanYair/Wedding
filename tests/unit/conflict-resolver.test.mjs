/**
 * tests/unit/conflict-resolver.test.mjs — Unit tests for conflict resolver pure logic (Sprint 28)
 *
 * Tests only the pure helper functions: detectConflicts, fieldLevelMerge, autoResolve.
 * The modal / UI layer is not tested here.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/store.js", () => ({
  storeGet: vi.fn(() => []),
  storeSet: vi.fn(),
}));
vi.mock("../../src/core/i18n.js", () => ({ t: (k) => k }));
vi.mock("../../src/core/ui.js", () => ({ openModal: vi.fn() }));

const {
  detectConflicts,
  fieldLevelMerge,
  autoResolve,
} = await import("../../src/core/conflict-resolver.js");

// ── detectConflicts ────────────────────────────────────────────────────────

describe("detectConflicts", () => {
  const base = { id: "g1", firstName: "Alice", lastName: "Smith", status: "confirmed", updatedAt: "2024-01-01T00:00:00Z" };

  it("returns empty array when records are identical", () => {
    expect(detectConflicts(base, { ...base })).toHaveLength(0);
  });

  it("detects a changed field value", () => {
    const remote = { ...base, status: "declined" };
    const cs = detectConflicts(base, remote);
    expect(cs).toHaveLength(1);
    expect(cs[0].field).toBe("status");
    expect(cs[0].localVal).toBe("confirmed");
    expect(cs[0].remoteVal).toBe("declined");
  });

  it("detects multiple changed fields", () => {
    const remote = { ...base, firstName: "Bob", status: "pending" };
    expect(detectConflicts(base, remote)).toHaveLength(2);
  });

  it("excludes id and updatedAt from conflicts", () => {
    const remote = { ...base, id: "g2", updatedAt: "2024-06-01T00:00:00Z" };
    expect(detectConflicts(base, remote)).toHaveLength(0);
  });

  it("excludes user-specified fields", () => {
    const remote = { ...base, firstName: "X", status: "declined" };
    const cs = detectConflicts(base, remote, { exclude: ["firstName"] });
    expect(cs.some((c) => c.field === "firstName")).toBe(false);
    expect(cs.some((c) => c.field === "status")).toBe(true);
  });

  it("ignores fields where both values are null", () => {
    const local = { id: "g1", phone: null };
    const remote = { id: "g1", phone: null };
    expect(detectConflicts(local, remote)).toHaveLength(0);
  });

  it("detects conflict when one side has null and other has value", () => {
    const local = { id: "g1", phone: "0501234567" };
    const remote = { id: "g1", phone: null };
    const cs = detectConflicts(local, remote);
    expect(cs).toHaveLength(1);
    expect(cs[0].field).toBe("phone");
  });

  it("attaches timestamps when present", () => {
    const local = { id: "g1", status: "confirmed", updatedAt: "2024-01-01T00:00:00Z" };
    const remote = { id: "g1", status: "declined", updatedAt: "2024-06-01T00:00:00Z" };
    const cs = detectConflicts(local, remote);
    expect(cs[0].localUpdatedAt).toBe("2024-01-01T00:00:00Z");
    expect(cs[0].remoteUpdatedAt).toBe("2024-06-01T00:00:00Z");
  });
});

// ── fieldLevelMerge ────────────────────────────────────────────────────────

describe("fieldLevelMerge", () => {
  const local = { id: "g1", firstName: "Alice", notes: "local-note", updatedAt: "2024-06-01T00:00:00Z" };
  const remote = { id: "g1", firstName: "Bob", status: "confirmed", updatedAt: "2024-01-01T00:00:00Z" };

  it('strategy "local" keeps local values for conflicts', () => {
    const result = fieldLevelMerge(local, remote, "local");
    expect(result.firstName).toBe("Alice");
    expect(result.id).toBe("g1");
  });

  it('strategy "remote" prefers remote values for conflicts', () => {
    const result = fieldLevelMerge(local, remote, "remote");
    expect(result.firstName).toBe("Bob");
    expect(result.id).toBe("g1");
  });

  it('strategy "newest" picks fields from more recently updated record', () => {
    // local is newer (2024-06-01 > 2024-01-01) → entire local wins for all conflicting fields
    const result = fieldLevelMerge(local, remote, "newest");
    expect(result.firstName).toBe("Alice");
  });

  it('strategy "newest" picks remote when remote is newer', () => {
    const olderLocal = { ...local, updatedAt: "2024-01-01T00:00:00Z" };
    const newerRemote = { ...remote, updatedAt: "2024-06-01T00:00:00Z" };
    const result = fieldLevelMerge(olderLocal, newerRemote, "newest");
    expect(result.firstName).toBe("Bob");
  });

  it("always preserves id from local", () => {
    const result = fieldLevelMerge(local, { ...remote, id: "g999" }, "remote");
    expect(result.id).toBe("g1");
  });
});

// ── autoResolve ────────────────────────────────────────────────────────────

describe("autoResolve", () => {
  /** @type {import('../../src/core/conflict-resolver').ConflictEntry[]} */
  const conflicts = [
    { id: "g1", field: "status", localVal: "confirmed", remoteVal: "declined", localUpdatedAt: "2024-06-01T00:00:00Z", remoteUpdatedAt: "2024-01-01T00:00:00Z" },
    { id: "g1", field: "notes", localVal: "local-note", remoteVal: "remote-note", localUpdatedAt: "2024-01-01T00:00:00Z", remoteUpdatedAt: "2024-06-01T00:00:00Z" },
    { id: "g2", field: "firstName", localVal: "Alice", remoteVal: "Alicia", localUpdatedAt: "2024-03-01T00:00:00Z", remoteUpdatedAt: "2024-03-01T00:00:00Z" },
  ];

  it('strategy "local" picks localVal for all conflicts', () => {
    const patches = autoResolve(conflicts, "local");
    expect(patches.g1.status).toBe("confirmed");
    expect(patches.g1.notes).toBe("local-note");
    expect(patches.g2.firstName).toBe("Alice");
  });

  it('strategy "remote" picks remoteVal for all conflicts', () => {
    const patches = autoResolve(conflicts, "remote");
    expect(patches.g1.status).toBe("declined");
    expect(patches.g1.notes).toBe("remote-note");
    expect(patches.g2.firstName).toBe("Alicia");
  });

  it('strategy "newest" uses timestamp to choose per-field', () => {
    const patches = autoResolve(conflicts, "newest");
    // status: local newer (2024-06-01 > 2024-01-01) → "confirmed"
    expect(patches.g1.status).toBe("confirmed");
    // notes: remote newer (2024-06-01 > 2024-01-01) → "remote-note"
    expect(patches.g1.notes).toBe("remote-note");
  });

  it("groups patches by guest id", () => {
    const patches = autoResolve(conflicts, "local");
    expect(Object.keys(patches)).toContain("g1");
    expect(Object.keys(patches)).toContain("g2");
  });

  it("returns empty object for empty conflicts list", () => {
    expect(autoResolve([], "local")).toEqual({});
  });
});
