/**
 * tests/unit/guest-csv-import.test.mjs — S452: unit tests for src/utils/guest-csv-import.js
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock phone utility
vi.mock("../../src/utils/phone.js", () => ({
  cleanPhone: vi.fn((p) => {
    if (!p) return "";
    return p.replace(/\D/g, "");
  }),
}));

import { parseCsvGuests, importGuestsCsv } from "../../src/utils/guest-csv-import.js";

describe("parseCsvGuests()", () => {
  it("returns empty array for header-only CSV", () => {
    expect(parseCsvGuests("name,phone\n")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseCsvGuests("")).toEqual([]);
  });

  it("parses basic name + phone rows", () => {
    const csv = "name,phone\nAlice,0501234567\nBob,0529876543";
    const result = parseCsvGuests(csv);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[0].phone).toBe("0501234567");
    expect(result[1].name).toBe("Bob");
  });

  it("maps Hebrew header aliases", () => {
    const csv = "שם,טלפון\nאליס,0501234567";
    const result = parseCsvGuests(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("אליס");
    expect(result[0].phone).toBe("0501234567");
  });

  it("handles semicolon delimiter", () => {
    const csv = "name;phone\nCharlie;0541112233";
    const result = parseCsvGuests(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Charlie");
  });

  it("handles quoted fields with commas", () => {
    const csv = `name,phone,notes\n"Smith, John",0501234567,"VIP, front row"`;
    const result = parseCsvGuests(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Smith, John");
    expect(result[0].notes).toBe("VIP, front row");
  });

  it("skips blank rows", () => {
    const csv = "name,phone\nAlice,0501234567\n\nBob,0529876543";
    const result = parseCsvGuests(csv);
    expect(result).toHaveLength(2);
  });

  it("skips rows with no name and no phone", () => {
    const csv = "name,phone,notes\n,,someNote\nAlice,0501234567,";
    const result = parseCsvGuests(csv);
    expect(result).toHaveLength(1);
  });

  it("parses optional fields: status, meal, email", () => {
    const csv = "name,phone,email,status,meal\nDana,0551234567,d@x.com,confirmed,vegetarian";
    const result = parseCsvGuests(csv);
    expect(result[0].email).toBe("d@x.com");
    expect(result[0].status).toBe("confirmed");
    expect(result[0].meal).toBe("vegetarian");
  });

  it("handles Windows CRLF line endings", () => {
    const csv = "name,phone\r\nAlice,0501234567\r\n";
    const result = parseCsvGuests(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });
});

describe("importGuestsCsv()", () => {
  it("imports all guests when existing list is empty", () => {
    const csv = "name,phone\nAlice,0501234567\nBob,0529876543";
    const { imported, skipped, guests } = importGuestsCsv(csv, []);
    expect(imported).toBe(2);
    expect(skipped).toBe(0);
    expect(guests).toHaveLength(2);
  });

  it("skips guests with matching phone in existing list", () => {
    const csv = "name,phone\nAlice,0501234567\nBob,0529876543";
    const existing = [{ phone: "0501234567" }];
    const { imported, skipped } = importGuestsCsv(csv, existing);
    expect(imported).toBe(1);
    expect(skipped).toBe(1);
  });

  it("deduplicates within the CSV itself", () => {
    const csv = "name,phone\nAlice,0501234567\nAlice2,0501234567";
    const { imported, skipped } = importGuestsCsv(csv, []);
    expect(imported).toBe(1);
    expect(skipped).toBe(1);
  });

  it("imports rows without phone (no dedup possible)", () => {
    const csv = "name,phone\nAlice,\nBob,";
    const { imported, skipped } = importGuestsCsv(csv, []);
    expect(imported).toBe(2);
    expect(skipped).toBe(0);
  });

  it("returns guests array with imported rows", () => {
    const csv = "name,phone\nAlice,0501234567";
    const { guests } = importGuestsCsv(csv, []);
    expect(guests[0].name).toBe("Alice");
    expect(guests[0].phone).toBe("0501234567");
  });
});
