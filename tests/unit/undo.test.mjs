/**
 * tests/unit/undo.test.mjs — Unit tests for undo utility
 * Covers: pushUndo · popUndo · peekUndo · undoStackSize · clearUndo
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  pushUndo,
  popUndo,
  peekUndo,
  undoStackSize,
  clearUndo,
} from "../../src/utils/undo.js";

beforeEach(() => clearUndo());

// ── undoStackSize ────────────────────────────────────────────────────────

describe("undoStackSize", () => {
  it("returns 0 when empty", () => {
    expect(undoStackSize()).toBe(0);
  });

  it("reflects push count", () => {
    pushUndo("a", "key", { x: 1 });
    pushUndo("b", "key", { x: 2 });
    expect(undoStackSize()).toBe(2);
  });
});

// ── pushUndo ─────────────────────────────────────────────────────────────

describe("pushUndo", () => {
  it("increases stack size by 1", () => {
    pushUndo("add guest", "guests", []);
    expect(undoStackSize()).toBe(1);
  });

  it("caps at 30 entries", () => {
    for (let i = 0; i < 35; i++) {
      pushUndo(`op${i}`, "key", i);
    }
    expect(undoStackSize()).toBe(30);
  });

  it("evicts oldest when at max capacity", () => {
    for (let i = 0; i < 31; i++) {
      pushUndo(`op${i}`, "key", i);
    }
    const entry = popUndo();
    expect(entry.label).toBe("op30");
  });
});

// ── popUndo ──────────────────────────────────────────────────────────────

describe("popUndo", () => {
  it("returns null when empty", () => {
    expect(popUndo()).toBeNull();
  });

  it("returns most recent entry", () => {
    pushUndo("first", "k1", "snap1");
    pushUndo("second", "k2", "snap2");
    const entry = popUndo();
    expect(entry.label).toBe("second");
    expect(entry.key).toBe("k2");
    expect(entry.snapshot).toBe("snap2");
  });

  it("decreases stack size", () => {
    pushUndo("a", "k", null);
    pushUndo("b", "k", null);
    popUndo();
    expect(undoStackSize()).toBe(1);
  });

  it("returns entries in LIFO order", () => {
    pushUndo("first", "k", 1);
    pushUndo("second", "k", 2);
    pushUndo("third", "k", 3);
    expect(popUndo().label).toBe("third");
    expect(popUndo().label).toBe("second");
    expect(popUndo().label).toBe("first");
    expect(popUndo()).toBeNull();
  });
});

// ── peekUndo ─────────────────────────────────────────────────────────────

describe("peekUndo", () => {
  it("returns null when empty", () => {
    expect(peekUndo()).toBeNull();
  });

  it("returns top entry without removing it", () => {
    pushUndo("peek me", "k", 42);
    const entry = peekUndo();
    expect(entry.label).toBe("peek me");
    expect(undoStackSize()).toBe(1);
  });

  it("repeated peeks return same entry", () => {
    pushUndo("stable", "k", true);
    const a = peekUndo();
    const b = peekUndo();
    expect(a).toEqual(b);
  });
});

// ── clearUndo ────────────────────────────────────────────────────────────

describe("clearUndo", () => {
  it("empties the stack", () => {
    pushUndo("x", "k", null);
    pushUndo("y", "k", null);
    clearUndo();
    expect(undoStackSize()).toBe(0);
    expect(popUndo()).toBeNull();
  });

  it("is idempotent on empty stack", () => {
    clearUndo();
    clearUndo();
    expect(undoStackSize()).toBe(0);
  });
});

// ── snapshot integrity ───────────────────────────────────────────────────

describe("snapshot integrity", () => {
  it("preserves object snapshots", () => {
    const snap = { guests: [{ id: 1 }], total: 5 };
    pushUndo("save", "guests", snap);
    const entry = popUndo();
    expect(entry.snapshot).toEqual(snap);
  });

  it("preserves array snapshots", () => {
    const snap = [1, 2, 3];
    pushUndo("arr", "data", snap);
    expect(popUndo().snapshot).toEqual([1, 2, 3]);
  });

  it("preserves null snapshots", () => {
    pushUndo("null", "data", null);
    expect(popUndo().snapshot).toBeNull();
  });
});
