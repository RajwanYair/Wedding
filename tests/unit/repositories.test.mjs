/**
 * tests/unit/repositories.test.mjs — Unit tests for repository layer (Phase 1)
 *
 * Covers: guestRepo, tableRepo, vendorRepo, expenseRepo
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import { makeGuest, makeTable, makeVendor, makeExpense } from "./helpers.js";

// Mock enqueueWrite — we don't want real backend calls in unit tests
vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: vi.fn(),
}));

// Import after mock is set up
const { guestRepo, tableRepo, vendorRepo, expenseRepo } = await import(
  "../../src/services/repositories.js"
);

function seedStore(overrides = {}) {
  initStore({
    guests: { value: overrides.guests ?? [] },
    tables: { value: overrides.tables ?? [] },
    vendors: { value: overrides.vendors ?? [] },
    expenses: { value: overrides.expenses ?? [] },
    weddingInfo: { value: {} },
  });
}

// ── guestRepo ─────────────────────────────────────────────────────────────

describe("guestRepo.getAll", () => {
  beforeEach(() => seedStore());

  it("returns empty array when no guests", async () => {
    expect(await guestRepo.getAll()).toEqual([]);
  });

  it("returns all seeded guests", async () => {
    const guests = [makeGuest({ id: "g1" }), makeGuest({ id: "g2" })];
    storeSet("guests", guests);
    expect(await guestRepo.getAll()).toHaveLength(2);
  });
});

describe("guestRepo.getById", () => {
  beforeEach(() => seedStore());

  it("returns null for unknown id", async () => {
    expect(await guestRepo.getById("nonexistent")).toBeNull();
  });

  it("finds a guest by id", async () => {
    const g = makeGuest({ id: "g42" });
    storeSet("guests", [g]);
    const found = await guestRepo.getById("g42");
    expect(found?.id).toBe("g42");
  });
});

describe("guestRepo.findByPhone", () => {
  beforeEach(() => seedStore());

  it("returns null when phone not found", async () => {
    expect(await guestRepo.findByPhone("0501234567")).toBeNull();
  });

  it("finds guest ignoring non-digit chars", async () => {
    storeSet("guests", [makeGuest({ id: "g1", phone: "050-123-4567" })]);
    const found = await guestRepo.findByPhone("0501234567");
    expect(found?.id).toBe("g1");
  });
});

describe("guestRepo.findByStatus", () => {
  beforeEach(() => {
    seedStore({
      guests: [
        makeGuest({ id: "g1", status: "confirmed" }),
        makeGuest({ id: "g2", status: "confirmed" }),
        makeGuest({ id: "g3", status: "pending" }),
      ],
    });
  });

  it("filters guests by status", async () => {
    const confirmed = await guestRepo.findByStatus("confirmed");
    expect(confirmed).toHaveLength(2);
  });

  it("returns empty for unknown status", async () => {
    const declined = await guestRepo.findByStatus("declined");
    expect(declined).toHaveLength(0);
  });
});

describe("guestRepo.create", () => {
  beforeEach(() => seedStore());

  it("creates a guest with generated id", async () => {
    const created = await guestRepo.create(
      makeGuest({ id: undefined, createdAt: undefined, updatedAt: undefined }),
    );
    expect(created.id).toBeTruthy();
    expect(typeof created.id).toBe("string");
  });

  it("adds the guest to the store", async () => {
    await guestRepo.create(makeGuest({ firstName: "Yair" }));
    const all = storeGet("guests") ?? [];
    expect(all).toHaveLength(1);
    expect(/** @type {any[]} */ (all)[0].firstName).toBe("Yair");
  });

  it("sets createdAt and updatedAt", async () => {
    const created = await guestRepo.create(makeGuest());
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
  });
});

describe("guestRepo.update", () => {
  beforeEach(() => {
    seedStore({ guests: [makeGuest({ id: "g1", firstName: "Original" })] });
  });

  it("updates existing guest", async () => {
    const updated = await guestRepo.update("g1", { firstName: "Updated" });
    expect(updated.firstName).toBe("Updated");
    expect(updated.id).toBe("g1");
  });

  it("updates updatedAt timestamp", async () => {
    const before = Date.now();
    const updated = await guestRepo.update("g1", { firstName: "X" });
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("throws for non-existent id", async () => {
    await expect(guestRepo.update("bad-id", {})).rejects.toThrow("Guest not found");
  });
});

describe("guestRepo.delete", () => {
  beforeEach(() => {
    seedStore({ guests: [makeGuest({ id: "g1" }), makeGuest({ id: "g2" })] });
  });

  it("removes the guest from the store", async () => {
    await guestRepo.delete("g1");
    const all = storeGet("guests") ?? [];
    expect(all).toHaveLength(1);
    expect(/** @type {any[]} */ (all)[0].id).toBe("g2");
  });
});

describe("guestRepo.bulkUpdateStatus", () => {
  beforeEach(() => {
    seedStore({
      guests: [
        makeGuest({ id: "g1", status: "pending" }),
        makeGuest({ id: "g2", status: "pending" }),
        makeGuest({ id: "g3", status: "pending" }),
      ],
    });
  });

  it("updates status for specified ids", async () => {
    await guestRepo.bulkUpdateStatus(["g1", "g2"], "confirmed");
    const all = /** @type {any[]} */ (storeGet("guests") ?? []);
    expect(all.find((g) => g.id === "g1").status).toBe("confirmed");
    expect(all.find((g) => g.id === "g2").status).toBe("confirmed");
    expect(all.find((g) => g.id === "g3").status).toBe("pending");
  });
});

describe("guestRepo.getPage", () => {
  beforeEach(() => {
    seedStore({
      guests: Array.from({ length: 5 }, (_, i) => makeGuest({ id: `g${i}` })),
    });
  });

  it("returns first page", async () => {
    const page = await guestRepo.getPage({ limit: 3 });
    expect(page.items).toHaveLength(3);
    expect(page.total).toBe(5);
    expect(page.nextCursor).toBeTruthy();
  });

  it("returns null nextCursor on last page", async () => {
    const page = await guestRepo.getPage({ limit: 10 });
    expect(page.items).toHaveLength(5);
    expect(page.nextCursor).toBeNull();
  });
});

// ── tableRepo ─────────────────────────────────────────────────────────────

describe("tableRepo.getAll", () => {
  beforeEach(() => seedStore());

  it("returns empty when no tables", async () => {
    expect(await tableRepo.getAll()).toEqual([]);
  });
});

describe("tableRepo.create", () => {
  beforeEach(() => seedStore());

  it("creates table with generated id", async () => {
    const t = await tableRepo.create({ name: "Table 1", capacity: 10, shape: "round" });
    expect(t.id).toBeTruthy();
    expect(t.name).toBe("Table 1");
  });
});

describe("tableRepo.findAvailable", () => {
  beforeEach(() => {
    seedStore({
      tables: [
        makeTable({ id: "t1", capacity: 10 }),
        makeTable({ id: "t2", capacity: 4 }),
      ],
      guests: [
        makeGuest({ id: "g1", tableId: "t1", status: "confirmed" }),
        makeGuest({ id: "g2", tableId: "t1", status: "confirmed" }),
        makeGuest({ id: "g3", tableId: "t1", status: "confirmed" }),
      ],
    });
  });

  it("finds tables with enough seats", async () => {
    const available = await tableRepo.findAvailable(5);
    // t1 has 10 capacity, 3 seated = 7 free >= 5 ✓
    // t2 has 4 capacity, 0 seated = 4 free >= 5 ✗
    expect(available.map((t) => t.id)).toContain("t1");
    expect(available.map((t) => t.id)).not.toContain("t2");
  });
});

// ── vendorRepo ────────────────────────────────────────────────────────────

describe("vendorRepo.findByCategory", () => {
  beforeEach(() => {
    seedStore({
      vendors: [
        makeVendor({ id: "v1", category: "catering" }),
        makeVendor({ id: "v2", category: "photography" }),
        makeVendor({ id: "v3", category: "catering" }),
      ],
    });
  });

  it("filters vendors by category", async () => {
    const catering = await vendorRepo.findByCategory("catering");
    expect(catering).toHaveLength(2);
    expect(catering.every((v) => v.category === "catering")).toBe(true);
  });
});

// ── expenseRepo ───────────────────────────────────────────────────────────

describe("expenseRepo.sumByCategory", () => {
  beforeEach(() => {
    seedStore({
      expenses: [
        makeExpense({ id: "e1", category: "venue", amount: 5000 }),
        makeExpense({ id: "e2", category: "venue", amount: 3000 }),
        makeExpense({ id: "e3", category: "catering", amount: 10000 }),
      ],
    });
  });

  it("sums expenses by category", async () => {
    const sums = await expenseRepo.sumByCategory();
    expect(sums["venue"]).toBe(8000);
    expect(sums["catering"]).toBe(10000);
  });
});

describe("expenseRepo.create", () => {
  beforeEach(() => seedStore());

  it("creates expense with generated id", async () => {
    const e = await expenseRepo.create({
      category: "food",
      description: "Dinner",
      amount: 500,
      date: "2026-06-15",
    });
    expect(e.id).toBeTruthy();
    expect(e.amount).toBe(500);
  });
});
