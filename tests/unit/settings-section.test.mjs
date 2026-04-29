/**
 * tests/unit/settings-section.test.mjs — S349: settings.js data helpers
 * Covers: checkDataIntegrity · clearAuditLog · clearErrorLog · saveTransportSettings
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeSet, storeGet } from "../../src/core/store.js";
import { makeGuest } from "./helpers.js";
import {
  checkDataIntegrity,
  clearAuditLog,
  clearErrorLog,
  saveTransportSettings,
} from "../../src/sections/settings.js";

function seedStore() {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    timeline: { value: [] },
    weddingInfo: { value: {} },
    gallery: { value: [] },
    auditLog: { value: [] },
    appErrors: { value: [] },
  });
}

// ── checkDataIntegrity ────────────────────────────────────────────────────

describe("checkDataIntegrity", () => {
  beforeEach(() => seedStore());

  it("returns ok:true for empty store", () => {
    const result = checkDataIntegrity();
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("detects missing firstName", () => {
    storeSet("guests", [makeGuest({ firstName: "" })]);
    const result = checkDataIntegrity();
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("missing firstName"))).toBe(true);
  });

  it("detects duplicate guest IDs", () => {
    storeSet("guests", [
      makeGuest({ id: "dup-id", firstName: "Avi" }),
      makeGuest({ id: "dup-id", firstName: "Avi2" }),
    ]);
    const result = checkDataIntegrity();
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("Duplicate"))).toBe(true);
  });

  it("detects orphaned tableId", () => {
    storeSet("tables", []);
    storeSet("guests", [makeGuest({ id: "g1", firstName: "Avi", tableId: "table-ghost" })]);
    const result = checkDataIntegrity();
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("tableId"))).toBe(true);
  });

  it("detects invalid guest status", () => {
    storeSet("guests", [makeGuest({ id: "g1", firstName: "Avi", status: "invalid-status" })]);
    const result = checkDataIntegrity();
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("invalid status"))).toBe(true);
  });

  it("passes for valid data", () => {
    storeSet("tables", [{ id: "t1", name: "T1", capacity: 10 }]);
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "Avi", status: "confirmed", tableId: "t1" }),
    ]);
    const result = checkDataIntegrity();
    expect(result.ok).toBe(true);
  });

  it("detects table over capacity", () => {
    storeSet("tables", [{ id: "t1", name: "T1", capacity: 1 }]);
    storeSet("guests", [
      makeGuest({ id: "g1", firstName: "A", tableId: "t1" }),
      makeGuest({ id: "g2", firstName: "B", tableId: "t1" }),
    ]);
    const result = checkDataIntegrity();
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("exceeds capacity"))).toBe(true);
  });
});

// ── clearAuditLog ─────────────────────────────────────────────────────────

describe("clearAuditLog", () => {
  beforeEach(() => seedStore());

  it("empties the auditLog store", () => {
    storeSet("auditLog", [{ action: "test", ts: new Date().toISOString() }]);
    clearAuditLog();
    expect(storeGet("auditLog")).toEqual([]);
  });

  it("does not throw when already empty", () => {
    storeSet("auditLog", []);
    expect(() => clearAuditLog()).not.toThrow();
  });
});

// ── clearErrorLog ─────────────────────────────────────────────────────────

describe("clearErrorLog", () => {
  beforeEach(() => seedStore());

  it("empties the appErrors store", () => {
    storeSet("appErrors", [{ msg: "Something broke" }]);
    clearErrorLog();
    expect(storeGet("appErrors")).toEqual([]);
  });

  it("does not throw when already empty", () => {
    storeSet("appErrors", []);
    expect(() => clearErrorLog()).not.toThrow();
  });
});

// ── saveTransportSettings ─────────────────────────────────────────────────

describe("saveTransportSettings", () => {
  beforeEach(() => {
    seedStore();
    // Set up DOM inputs that saveTransportSettings reads
    document.body.innerHTML = `
      <input id="transportEnabled" type="checkbox" />
      <input id="transportTefachotTime" value="18:00" />
      <input id="transportTefachotAddress" value="Tefachot St 1" />
      <input id="transportJerusalemTime" value="19:00" />
      <input id="transportJerusalemAddress" value="Jerusalem Blvd 5" />
    `;
  });

  it("writes transport fields to weddingInfo store", () => {
    saveTransportSettings();
    const info = /** @type {Record<string, unknown>} */ (storeGet("weddingInfo"));
    expect(info.transportTefachotTime).toBe("18:00");
    expect(info.transportTefachotAddress).toBe("Tefachot St 1");
    expect(info.transportJerusalemTime).toBe("19:00");
    expect(info.transportJerusalemAddress).toBe("Jerusalem Blvd 5");
  });

  it("saves transportEnabled as empty string when checkbox unchecked", () => {
    saveTransportSettings();
    const info = /** @type {Record<string, unknown>} */ (storeGet("weddingInfo"));
    expect(info.transportEnabled).toBe("");
  });

  it("saves transportEnabled as 'true' when checkbox is checked", () => {
    const checkbox = /** @type {HTMLInputElement} */ (document.getElementById("transportEnabled"));
    checkbox.checked = true;
    saveTransportSettings();
    const info = /** @type {Record<string, unknown>} */ (storeGet("weddingInfo"));
    expect(info.transportEnabled).toBe("true");
  });

  it("merges with existing weddingInfo", () => {
    storeSet("weddingInfo", { venue: "Tel Aviv Hall" });
    saveTransportSettings();
    const info = /** @type {Record<string, unknown>} */ (storeGet("weddingInfo"));
    expect(info.venue).toBe("Tel Aviv Hall");
    expect(info.transportTefachotTime).toBe("18:00");
  });
});
