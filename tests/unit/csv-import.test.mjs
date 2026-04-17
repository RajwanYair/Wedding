/**
 * tests/unit/csv-import.test.mjs — Sprint 94
 */

import { describe, it, expect } from "vitest";
import {
  parseCsv,
  coerceCsvRow,
  importGuestsFromCsv,
  exportGuestsToCsv,
  GUEST_CSV_COLUMNS,
} from "../../src/utils/csv-import.js";

describe("parseCsv", () => {
  it("parses basic CSV", () => {
    const csv = "firstName,lastName\nAlice,Smith";
    const rows = parseCsv(csv);
    expect(rows.length).toBe(1);
    expect(rows[0].firstName).toBe("Alice");
  });

  it("handles CRLF line endings", () => {
    const csv = "firstName,lastName\r\nBob,Jones";
    const rows = parseCsv(csv);
    expect(rows[0].firstName).toBe("Bob");
  });

  it("handles quoted fields with commas", () => {
    const csv = `firstName,lastName,notes\nAlice,Smith,"Prefers seat, by window"`;
    const rows = parseCsv(csv);
    expect(rows[0].notes).toBe("Prefers seat, by window");
  });

  it("handles escaped quotes (\"\")", () => {
    const csv = `firstName,notes\nAlice,"Say ""hi"""`;
    const rows = parseCsv(csv);
    expect(rows[0].notes).toBe(`Say "hi"`);
  });

  it("returns empty array for header-only CSV", () => {
    expect(parseCsv("firstName,lastName")).toEqual([]);
  });

  it("skips blank rows", () => {
    const csv = "firstName,lastName\nAlice,Smith\n\nBob,Jones";
    expect(parseCsv(csv).length).toBe(2);
  });
});

describe("coerceCsvRow", () => {
  it("coerces count to integer", () => {
    const row = coerceCsvRow({ firstName: "A", lastName: "B", count: "3" });
    expect(row.count).toBe(3);
  });

  it("defaults count to 1 for empty string", () => {
    const row = coerceCsvRow({ firstName: "A", lastName: "B", count: "" });
    expect(row.count).toBe(1);
  });

  it("sets phone to undefined when empty", () => {
    const row = coerceCsvRow({ firstName: "A", lastName: "B", phone: "" });
    expect(row.phone).toBeUndefined();
  });

  it("lowercases status", () => {
    const row = coerceCsvRow({ firstName: "A", lastName: "B", status: "CONFIRMED" });
    expect(row.status).toBe("confirmed");
  });

  it("accepts snake_case first_name / last_name headers", () => {
    const row = coerceCsvRow({ first_name: "Alice", last_name: "Smith" });
    expect(row.firstName).toBe("Alice");
    expect(row.lastName).toBe("Smith");
  });
});

describe("importGuestsFromCsv", () => {
  it("parses and coerces all valid rows", () => {
    const csv = "firstName,lastName,count\nAlice,Smith,2\nBob,Jones,1";
    const { rows, skipped } = importGuestsFromCsv(csv);
    expect(rows.length).toBe(2);
    expect(skipped).toBe(0);
  });

  it("skips rows missing firstName or lastName", () => {
    const csv = "firstName,lastName\n,Smith\nAlice,";
    const { rows, skipped } = importGuestsFromCsv(csv);
    expect(rows.length).toBe(0);
    expect(skipped).toBe(2);
  });
});

describe("exportGuestsToCsv", () => {
  it("produces correct header row", () => {
    const csv = exportGuestsToCsv([]);
    expect(csv.startsWith("firstName,lastName")).toBe(true);
  });

  it("exports guest values in column order", () => {
    const guests = [{ firstName: "Alice", lastName: "Smith", count: 2 }];
    const csv = exportGuestsToCsv(guests);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain("Alice");
  });

  it("wraps values with commas in quotes", () => {
    const guests = [{ firstName: "Alice, Jr.", lastName: "Smith" }];
    const csv = exportGuestsToCsv(guests, ["firstName", "lastName"]);
    expect(csv).toContain('"Alice, Jr."');
  });

  it("GUEST_CSV_COLUMNS has at least the core fields", () => {
    expect(GUEST_CSV_COLUMNS).toContain("firstName");
    expect(GUEST_CSV_COLUMNS).toContain("lastName");
    expect(GUEST_CSV_COLUMNS).toContain("phone");
  });
});
