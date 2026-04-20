import { describe, it, expect } from "vitest";
import {
  exportSeatingToCsv,
  exportSeatingToJson,
  buildSeatingMatrix,
  buildTableManifest,
  buildEscortCardData,
  buildPlaceCardData,
  groupExportByTable,
} from "../../src/utils/seating-exporter.js";

// ── Fixtures ──────────────────────────────────────────────────────────────

const mockTables = [
  {
    id: "t1",
    name: "Table 1",
    number: 1,
    capacity: 4,
    guests: [
      { id: "g1", name: "Alice", seatNumber: 1, mealChoice: "meat" },
      { id: "g2", name: "Bob", seatNumber: 2, mealChoice: "veg" },
    ],
  },
  {
    id: "t2",
    name: "Table 2",
    number: 2,
    capacity: 2,
    guests: [{ id: "g3", name: "Carol", seatNumber: 1, mealChoice: "fish" }],
  },
];

// ── exportSeatingToCsv ────────────────────────────────────────────────────

describe("exportSeatingToCsv()", () => {
  it("returns empty string for empty array", () => expect(exportSeatingToCsv([])).toBe(""));
  it("returns empty string for non-array", () => expect(exportSeatingToCsv(null)).toBe(""));

  it("includes header row", () => {
    const csv = exportSeatingToCsv([{ guestName: "Alice", tableName: "T1" }]);
    expect(csv).toMatch(/Guest Name,Table/);
  });

  it("includes guest data", () => {
    const csv = exportSeatingToCsv([{ guestName: "Alice", tableName: "Table 1", seatNumber: 1, mealChoice: "meat" }]);
    expect(csv).toContain("Alice");
    expect(csv).toContain("Table 1");
    expect(csv).toContain("meat");
  });

  it("escapes commas in cell values", () => {
    const csv = exportSeatingToCsv([{ guestName: "Smith, John", tableName: "T1" }]);
    expect(csv).toContain('"Smith, John"');
  });
});

// ── exportSeatingToJson ───────────────────────────────────────────────────

describe("exportSeatingToJson()", () => {
  it("returns [] string for non-array", () => expect(exportSeatingToJson(null)).toBe("[]"));

  it("returns valid JSON", () => {
    const json = exportSeatingToJson([{ guestName: "Alice", tableName: "T1" }]);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("includes all row data", () => {
    const json = exportSeatingToJson([{ guestName: "Alice", tableName: "T1" }]);
    const parsed = JSON.parse(json);
    expect(parsed[0].guestName).toBe("Alice");
  });
});

// ── buildSeatingMatrix ────────────────────────────────────────────────────

describe("buildSeatingMatrix()", () => {
  it("returns empty array for non-array", () => expect(buildSeatingMatrix(null)).toEqual([]));

  it("creates rows for each table", () => {
    const matrix = buildSeatingMatrix(mockTables);
    expect(matrix).toHaveLength(2);
  });

  it("creates seats based on capacity", () => {
    const matrix = buildSeatingMatrix(mockTables);
    expect(matrix[0]).toHaveLength(4); // capacity 4
    expect(matrix[1]).toHaveLength(2); // capacity 2
  });

  it("fills in guest at correct seat", () => {
    const matrix = buildSeatingMatrix(mockTables);
    expect(matrix[0][0].guest.name).toBe("Alice");
    expect(matrix[0][1].guest.name).toBe("Bob");
    expect(matrix[0][2].guest).toBeNull(); // empty seat
  });
});

// ── buildTableManifest ────────────────────────────────────────────────────

describe("buildTableManifest()", () => {
  it("returns empty array for non-array", () => expect(buildTableManifest(null)).toEqual([]));

  it("calculates seated and available", () => {
    const manifest = buildTableManifest(mockTables);
    expect(manifest[0].seated).toBe(2);
    expect(manifest[0].available).toBe(2);
  });

  it("calculates fillRate", () => {
    const manifest = buildTableManifest(mockTables);
    expect(manifest[0].fillRate).toBeCloseTo(0.5);
    expect(manifest[1].fillRate).toBeCloseTo(0.5);
  });

  it("lists guest names", () => {
    const manifest = buildTableManifest(mockTables);
    expect(manifest[0].guests).toEqual(["Alice", "Bob"]);
  });
});

// ── buildEscortCardData ───────────────────────────────────────────────────

describe("buildEscortCardData()", () => {
  it("returns empty array for non-array", () => expect(buildEscortCardData(null)).toEqual([]));

  it("creates one card per guest", () => {
    const cards = buildEscortCardData(mockTables);
    expect(cards).toHaveLength(3);
  });

  it("sorts alphabetically by guest name", () => {
    const cards = buildEscortCardData(mockTables);
    expect(cards[0].guestName).toBe("Alice");
    expect(cards[1].guestName).toBe("Bob");
    expect(cards[2].guestName).toBe("Carol");
  });

  it("includes table name and number", () => {
    const cards = buildEscortCardData(mockTables);
    expect(cards[0].tableName).toBe("Table 1");
    expect(cards[0].tableNumber).toBe(1);
  });
});

// ── buildPlaceCardData ────────────────────────────────────────────────────

describe("buildPlaceCardData()", () => {
  it("returns empty array for non-array", () => expect(buildPlaceCardData(null)).toEqual([]));

  it("includes seat and meal", () => {
    const cards = buildPlaceCardData(mockTables);
    const alice = cards.find(c => c.guestName === "Alice");
    expect(alice.seatNumber).toBe(1);
    expect(alice.mealChoice).toBe("meat");
  });
});

// ── groupExportByTable ────────────────────────────────────────────────────

describe("groupExportByTable()", () => {
  it("returns empty object for non-array", () => expect(groupExportByTable(null)).toEqual({}));

  it("groups rows by tableName", () => {
    const rows = [
      { guestName: "Alice", tableName: "Table 1" },
      { guestName: "Bob", tableName: "Table 1" },
      { guestName: "Carol", tableName: "Table 2" },
    ];
    const grouped = groupExportByTable(rows);
    expect(grouped["Table 1"]).toHaveLength(2);
    expect(grouped["Table 2"]).toHaveLength(1);
  });

  it("groups rows without tableName under Unassigned", () => {
    const rows = [{ guestName: "Dave" }];
    const grouped = groupExportByTable(rows);
    expect(grouped["Unassigned"]).toHaveLength(1);
  });
});
