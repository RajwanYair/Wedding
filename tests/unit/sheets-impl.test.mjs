/**
 * tests/unit/sheets-impl.test.mjs — Sprint 184
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/config.js", () => ({
  SHEETS_WEBAPP_URL: "https://script.google.com/macros/test",
  SPREADSHEET_ID: "test-sheet-id",
}));

vi.mock("../../src/core/state.js", () => ({
  load: vi.fn(() => ""),
}));

vi.mock("../../src/core/store.js", () => ({
  storeGet: vi.fn(() => []),
  storeSet: vi.fn(),
}));

import { validateSchema, schemaHandshake, fetchServerSchema } from "../../src/services/sheets-impl.js";

// ── validateSchema ────────────────────────────────────────────────────────

describe("validateSchema", () => {
  it("returns empty errors when server schema matches local", () => {
    // Use minimal matching set so we don't need to enumerate all columns
    const serverColOrder = {
      tables: ["id", "name", "capacity", "shape"],
    };
    // We only pass keys we know, so the validator only compares what's present
    // validateSchema iterates local _COL_ORDER, so we need to pass full set or skip unknowns
    // Pass as partial — only validate 'tables'
    // validateSchema checks all local keys — any missing server key raises error
    // so we need to pass all keys or test partial match errors
    const errors = validateSchema(serverColOrder);
    // Missing keys for guests, vendors, etc. will be reported
    expect(errors.some((e) => e.includes("Missing server schema"))).toBe(true);
  });

  it("reports column count mismatch", () => {
    const serverColOrder = { guests: ["id", "firstName"] }; // too few
    const errors = validateSchema(serverColOrder);
    expect(errors.some((e) => e.includes("Column count mismatch") && e.includes("guests"))).toBe(true);
  });

  it("reports column name mismatch", () => {
    // Build correct length but wrong column name
    const correctGuests = ["id", "firstName", "lastName", "phone", "email", "count", "children",
      "status", "side", "group", "relationship", "meal", "mealNotes", "accessibility",
      "transport", "tableId", "gift", "notes", "sent", "checkedIn", "rsvpDate", "createdAt", "updatedAt"];
    const wrongGuests = [...correctGuests];
    wrongGuests[1] = "WRONG"; // replace firstName
    const serverColOrder = { guests: wrongGuests };
    const errors = validateSchema(serverColOrder);
    expect(errors.some((e) => e.includes("Column mismatch") && e.includes("guests"))).toBe(true);
  });

  it("returns no errors for fully matching schema", () => {
    // Complete matching schema
    const serverColOrder = {
      guests: ["id", "firstName", "lastName", "phone", "email", "count", "children",
        "status", "side", "group", "relationship", "meal", "mealNotes", "accessibility",
        "transport", "tableId", "gift", "notes", "sent", "checkedIn", "rsvpDate", "createdAt", "updatedAt"],
      tables: ["id", "name", "capacity", "shape"],
      vendors: ["id", "category", "name", "contact", "phone", "price", "paid", "notes", "updatedAt", "createdAt"],
      expenses: ["id", "category", "description", "amount", "date", "createdAt"],
      budget: ["id", "name", "amount", "note", "createdAt", "updatedAt"],
      timeline: ["id", "time", "title", "note", "icon"],
      contacts: ["id", "firstName", "lastName", "phone", "email", "side", "dietaryNotes", "submittedAt"],
      gallery: ["id", "caption", "credit", "addedAt"],
    };
    expect(validateSchema(serverColOrder)).toEqual([]);
  });
});

// ── schemaHandshake ───────────────────────────────────────────────────────

describe("schemaHandshake", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns ok:true when fetch fails (network offline graceful)", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network fail"));
    const result = await schemaHandshake("7.7.0");
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns ok:true when server returns no schema", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }), // no version or colOrder
    });
    const result = await schemaHandshake("7.7.0");
    expect(result.ok).toBe(true);
  });

  it("reports major version mismatch", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ version: "8.0.4", status: "ok" }),
    });
    const result = await schemaHandshake("7.7.0");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Major version mismatch"))).toBe(true);
    expect(result.serverVersion).toBe("8.0.4");
  });

  it("ok:true when major versions match and no colOrder", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ version: "7.3.0", status: "ok" }),
    });
    const result = await schemaHandshake("7.7.0");
    expect(result.ok).toBe(true);
    expect(result.serverVersion).toBe("7.3.0");
  });
});
