/**
 * tests/unit/pdf-layout.test.mjs — PDF/print layout data builder (Sprint 55)
 */
import { describe, it, expect } from "vitest";
import {
  buildGuestListLayout,
  buildGroupedGuestLayout,
  buildTablePlanLayout,
  buildSeatingCardLayout,
  buildVendorListLayout,
  buildRunOfShowLayout,
  buildSummaryLayout,
} from "../../src/utils/pdf-layout.js";

// ── fixtures ───────────────────────────────────────────────────────────────

const guests = [
  { id: "g1", name: "Alice", status: "confirmed", partySize: 2, mealChoice: "vegan", tableId: "t1", side: "bride", phone: "972541110001" },
  { id: "g2", name: "Bob", status: "pending", partySize: 1, mealChoice: "standard", tableId: "t2", side: "groom" },
  { id: "g3", name: "Carol", status: "confirmed", partySize: 3, mealChoice: "vegetarian", tableId: "t1", side: "bride" },
];

const tables = [
  { id: "t1", name: "Table 1", capacity: 10 },
  { id: "t2", name: "Table 2", capacity: 8 },
];

const vendors = [
  { name: "Florist Co", category: "flowers", contact: "Dana", totalCost: 3000, amountPaid: 1500 },
  { name: "DJ Sound", category: "music", phone: "972541999000", totalCost: 5000, amountPaid: 5000 },
];

const events = [
  { time: "18:00", title: "Guest arrival", location: "Lobby", duration: 30, responsible: "Coordinator" },
  { time: "18:30", title: "Ceremony", location: "Garden", duration: 45, responsible: "Rabbi" },
  { time: "20:00", title: "Dinner", location: "Hall", duration: 120, responsible: "Catering", notes: "Serve vegan first" },
];

// ── buildGuestListLayout ───────────────────────────────────────────────────

describe("buildGuestListLayout()", () => {
  it("returns title, columns, rows, total, groupBy", () => {
    const layout = buildGuestListLayout(guests);
    expect(layout).toHaveProperty("title");
    expect(layout).toHaveProperty("columns");
    expect(layout).toHaveProperty("rows");
    expect(layout).toHaveProperty("total");
    expect(layout).toHaveProperty("groupBy");
  });

  it("total equals guest count", () => {
    expect(buildGuestListLayout(guests).total).toBe(3);
  });

  it("rows contain Name column", () => {
    const { rows } = buildGuestListLayout(guests);
    expect(rows[0].Name).toBe("Alice");
  });

  it("rows contain Status column", () => {
    const { rows } = buildGuestListLayout(guests);
    expect(rows[1].Status).toBe("pending");
  });

  it("includes Meal column by default", () => {
    const { columns } = buildGuestListLayout(guests);
    expect(columns).toContain("Meal");
  });

  it("includes Phone column when showPhone=true", () => {
    const { columns } = buildGuestListLayout(guests, { showPhone: true });
    expect(columns).toContain("Phone");
  });

  it("excludes Phone column by default", () => {
    const { columns } = buildGuestListLayout(guests);
    expect(columns).not.toContain("Phone");
  });

  it("adds Group column when groupBy is set", () => {
    const { columns } = buildGuestListLayout(guests, { groupBy: "table" });
    expect(columns).toContain("Group");
  });

  it("Group value matches tableId when groupBy=table", () => {
    const { rows } = buildGuestListLayout(guests, { groupBy: "table" });
    expect(rows[0].Group).toBe("t1");
  });

  it("handles empty guest list", () => {
    const layout = buildGuestListLayout([]);
    expect(layout.total).toBe(0);
    expect(layout.rows).toHaveLength(0);
  });

  it("uses custom title", () => {
    const { title } = buildGuestListLayout(guests, { title: "My Guests" });
    expect(title).toBe("My Guests");
  });
});

// ── buildGroupedGuestLayout ────────────────────────────────────────────────

describe("buildGroupedGuestLayout()", () => {
  it("returns title and groups array", () => {
    const layout = buildGroupedGuestLayout(guests, { groupBy: "status" });
    expect(layout).toHaveProperty("title");
    expect(Array.isArray(layout.groups)).toBe(true);
  });

  it("groups guests by status", () => {
    const { groups } = buildGroupedGuestLayout(guests, { groupBy: "status" });
    const confirmed = groups.find(g => g.group === "confirmed");
    expect(confirmed).toBeDefined();
    expect(confirmed.count).toBe(2);
  });

  it("each group has count matching rows length", () => {
    const { groups } = buildGroupedGuestLayout(guests, { groupBy: "side" });
    for (const g of groups) {
      expect(g.rows).toHaveLength(g.count);
    }
  });
});

// ── buildTablePlanLayout ───────────────────────────────────────────────────

describe("buildTablePlanLayout()", () => {
  it("returns title and tables array", () => {
    const layout = buildTablePlanLayout(tables, guests);
    expect(layout).toHaveProperty("title");
    expect(Array.isArray(layout.tables)).toBe(true);
  });

  it("each table entry has id, name, capacity, guests, seated", () => {
    const { tables: tbl } = buildTablePlanLayout(tables, guests);
    const t1 = tbl.find(t => t.id === "t1");
    expect(t1).toBeDefined();
    expect(t1).toHaveProperty("seated");
    expect(t1).toHaveProperty("guests");
  });

  it("correctly assigns guests to tables", () => {
    const { tables: tbl } = buildTablePlanLayout(tables, guests);
    const t1 = tbl.find(t => t.id === "t1");
    expect(t1.seated).toBe(2); // Alice and Carol
  });

  it("empty table has 0 seated guests", () => {
    const { tables: tbl } = buildTablePlanLayout([{ id: "t3", name: "Table 3" }], guests);
    expect(tbl[0].seated).toBe(0);
  });

  it("guest meal is included when showMeal=true", () => {
    const { tables: tbl } = buildTablePlanLayout(tables, guests, { showMeal: true });
    const t1 = tbl.find(t => t.id === "t1");
    const alice = t1.guests.find(g => g.name === "Alice");
    expect(alice.meal).toBe("vegan");
  });

  it("guest meal is empty when showMeal=false", () => {
    const { tables: tbl } = buildTablePlanLayout(tables, guests, { showMeal: false });
    const t1 = tbl.find(t => t.id === "t1");
    expect(t1.guests[0].meal).toBe("");
  });
});

// ── buildSeatingCardLayout ─────────────────────────────────────────────────

describe("buildSeatingCardLayout()", () => {
  it("returns name, tableName, tableId, mealChoice, side", () => {
    const card = buildSeatingCardLayout(guests[0], tables);
    expect(card).toHaveProperty("name", "Alice");
    expect(card).toHaveProperty("tableName", "Table 1");
    expect(card).toHaveProperty("tableId", "t1");
    expect(card).toHaveProperty("mealChoice", "vegan");
    expect(card).toHaveProperty("side", "bride");
  });

  it("uses tableId as tableName when table not found", () => {
    const card = buildSeatingCardLayout({ name: "Ghost", tableId: "t99" }, tables);
    expect(card.tableName).toBe("t99");
  });

  it("handles guest with no tableId", () => {
    const card = buildSeatingCardLayout({ name: "Noa" }, []);
    expect(card.tableId).toBe("");
    expect(card.tableName).toBe("");
  });
});

// ── buildVendorListLayout ─────────────────────────────────────────────────

describe("buildVendorListLayout()", () => {
  it("returns title, columns, rows, total, totalCost, totalPaid", () => {
    const layout = buildVendorListLayout(vendors);
    expect(layout).toHaveProperty("title");
    expect(layout).toHaveProperty("columns");
    expect(layout).toHaveProperty("rows");
    expect(layout).toHaveProperty("total");
    expect(layout).toHaveProperty("totalCost");
    expect(layout).toHaveProperty("totalPaid");
  });

  it("total equals vendor count", () => {
    expect(buildVendorListLayout(vendors).total).toBe(2);
  });

  it("totalCost sums all vendor costs", () => {
    expect(buildVendorListLayout(vendors).totalCost).toBe(8000);
  });

  it("totalPaid sums all paid amounts", () => {
    expect(buildVendorListLayout(vendors).totalPaid).toBe(6500);
  });

  it("includes cost columns by default", () => {
    const { columns } = buildVendorListLayout(vendors);
    expect(columns).toContain("Total Cost");
    expect(columns).toContain("Balance");
  });

  it("Balance row value is cost minus paid", () => {
    const { rows } = buildVendorListLayout(vendors);
    expect(rows[0].Balance).toBe("1500");
  });

  it("excludes cost columns when showCosts=false", () => {
    const { columns } = buildVendorListLayout(vendors, { showCosts: false });
    expect(columns).not.toContain("Total Cost");
  });

  it("handles empty vendor list", () => {
    const layout = buildVendorListLayout([]);
    expect(layout.total).toBe(0);
    expect(layout.totalCost).toBe(0);
  });
});

// ── buildRunOfShowLayout ──────────────────────────────────────────────────

describe("buildRunOfShowLayout()", () => {
  it("returns title, columns, rows, eventCount", () => {
    const layout = buildRunOfShowLayout(events);
    expect(layout).toHaveProperty("title");
    expect(layout).toHaveProperty("columns");
    expect(layout).toHaveProperty("rows");
    expect(layout).toHaveProperty("eventCount");
  });

  it("eventCount equals events length", () => {
    expect(buildRunOfShowLayout(events).eventCount).toBe(3);
  });

  it("rows contain Time column", () => {
    const { rows } = buildRunOfShowLayout(events);
    expect(rows[0].Time).toBe("18:00");
  });

  it("rows contain Title column", () => {
    const { rows } = buildRunOfShowLayout(events);
    expect(rows[1].Title).toBe("Ceremony");
  });

  it("includes Notes column by default", () => {
    const { columns } = buildRunOfShowLayout(events);
    expect(columns).toContain("Notes");
  });

  it("notes value is set when provided", () => {
    const { rows } = buildRunOfShowLayout(events);
    expect(rows[2].Notes).toBe("Serve vegan first");
  });

  it("excludes Notes column when showNotes=false", () => {
    const { columns } = buildRunOfShowLayout(events, { showNotes: false });
    expect(columns).not.toContain("Notes");
  });

  it("handles empty events list", () => {
    expect(buildRunOfShowLayout([]).eventCount).toBe(0);
  });
});

// ── buildSummaryLayout ────────────────────────────────────────────────────

describe("buildSummaryLayout()", () => {
  it("returns heading and fields array", () => {
    const layout = buildSummaryLayout({ coupleName: "Yael & Roi" });
    expect(layout).toHaveProperty("heading");
    expect(Array.isArray(layout.fields)).toBe(true);
  });

  it("heading includes couple name", () => {
    const { heading } = buildSummaryLayout({ coupleName: "Yael & Roi" });
    expect(heading).toContain("Yael & Roi");
  });

  it("uses default heading when coupleName is empty", () => {
    const { heading } = buildSummaryLayout({});
    expect(heading).toBe("Wedding Summary");
  });

  it("fields include Date when weddingDate provided", () => {
    const { fields } = buildSummaryLayout({ weddingDate: "2025-08-15" });
    const dateField = fields.find(f => f.label === "Date");
    expect(dateField).toBeDefined();
    expect(dateField.value).toBe("2025-08-15");
  });

  it("fields exclude zero-value entries", () => {
    const { fields } = buildSummaryLayout({ totalGuests: 0 });
    const guestField = fields.find(f => f.label === "Total Guests");
    expect(guestField).toBeUndefined();
  });

  it("fields include Total Guests when > 0", () => {
    const { fields } = buildSummaryLayout({ totalGuests: 150 });
    const guestField = fields.find(f => f.label === "Total Guests");
    expect(guestField?.value).toBe("150");
  });
});
