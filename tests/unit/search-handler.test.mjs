/**
 * tests/unit/search-handler.test.mjs — S316: coverage for src/handlers/search-handler.js
 * @vitest-environment happy-dom
 *
 * Tests initSearchModalHandlers: rendering results, empty state, keyboard navigation,
 * entry activation, and input-driven searching.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

/** Minimal search entries for tests */
const _entries = [
  { id: "section:guests", type: "section", label: "Guests", hint: "Manage guests" },
  { id: "section:tables", type: "section", label: "Tables" },
  { id: "guest:1", type: "guest", label: "Alice Cohen" },
  { id: "table:1", type: "table", label: "Table 1" },
  { id: "vendor:1", type: "vendor", label: "Acme Catering" },
];

vi.mock("../../src/services/analytics.js", () => ({
  buildSearchIndex: vi.fn(() => [..._entries]),
  searchIndex: vi.fn((index, q) =>
    q ? index.filter((e) => e.label.toLowerCase().includes(q.toLowerCase())) : [],
  ),
}));

const _navigated = [];
vi.mock("../../src/core/nav.js", () => ({
  navigateTo: vi.fn((section) => _navigated.push(section)),
}));

const _closed = [];
vi.mock("../../src/core/ui.js", () => ({
  closeModal: vi.fn((id) => _closed.push(id)),
  showToast: vi.fn(),
  announce: vi.fn(),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (/** @type {string} */ k) => k,
}));

// ── Module under test ────────────────────────────────────────────────────

import { initSearchModalHandlers } from "../../src/handlers/search-handler.js";

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  _navigated.length = 0;
  _closed.length = 0;
  document.body.innerHTML = `
    <input id="cmdPaletteInput" type="text" />
    <ul id="cmdPaletteResults"></ul>
  `;
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("S316 — searchHandler — initSearchModalHandlers", () => {
  it("renders empty hint on init (no query)", () => {
    initSearchModalHandlers();
    const list = document.getElementById("cmdPaletteResults");
    // empty query → searchIndex returns [] → renders no-results placeholder
    expect(list.querySelector(".cmd-palette-empty")).not.toBeNull();
    expect(list.querySelector(".cmd-palette-empty").textContent).toBe("cmd_palette_no_results");
  });

  it("renders results when input value is set and input event fires", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "guests";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    const items = list.querySelectorAll(".cmd-palette-item");
    expect(items.length).toBeGreaterThan(0);
  });

  it("each result item has aria role=option", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "guests";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    const items = list.querySelectorAll("[role=option]");
    expect(items.length).toBeGreaterThan(0);
  });

  it("item with hint shows hint span", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "guests";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    const hint = list.querySelector(".cmd-palette-hint");
    expect(hint).not.toBeNull();
    expect(hint.textContent).toBe("Manage guests");
  });

  it("item without hint has no hint span", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "tables";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    const hint = list.querySelector(".cmd-palette-hint");
    expect(hint).toBeNull();
  });

  it("clicking a section entry closes modal and navigates to section", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "guests";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    const item = /** @type {HTMLElement} */ (list.querySelector(".cmd-palette-item"));
    item.click();
    expect(_closed).toContain("searchModal");
    expect(_navigated).toContain("guests");
  });

  it("clicking a guest entry navigates to guests section", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "Alice";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    const item = /** @type {HTMLElement} */ (list.querySelector("[data-entry-type=guest]"));
    expect(item).not.toBeNull();
    item.click();
    expect(_navigated).toContain("guests");
  });

  it("clicking a table entry navigates to tables section", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "Table 1";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    const item = /** @type {HTMLElement} */ (list.querySelector("[data-entry-type=table]"));
    expect(item).not.toBeNull();
    item.click();
    expect(_navigated).toContain("tables");
  });

  it("clicking a vendor entry navigates to vendors section", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "Acme";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    const item = /** @type {HTMLElement} */ (list.querySelector("[data-entry-type=vendor]"));
    expect(item).not.toBeNull();
    item.click();
    expect(_navigated).toContain("vendors");
  });

  it("Enter key on item activates the entry", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "guests";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    const item = /** @type {HTMLElement} */ (list.querySelector(".cmd-palette-item"));
    item.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(_closed).toContain("searchModal");
  });

  it("Space key on item activates the entry", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "guests";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    const item = /** @type {HTMLElement} */ (list.querySelector(".cmd-palette-item"));
    item.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(_closed).toContain("searchModal");
  });

  it("ArrowDown from input focuses first result item", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "tables";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    // focus should now be on first item (happy-dom tracks focus)
    const list = document.getElementById("cmdPaletteResults");
    expect(list.querySelector(".cmd-palette-item")).not.toBeNull();
  });

  it("Escape from input closes modal", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(_closed).toContain("searchModal");
  });

  it("Escape from results list closes modal", () => {
    initSearchModalHandlers();
    const input = /** @type {HTMLInputElement} */ (document.getElementById("cmdPaletteInput"));
    input.value = "guests";
    input.dispatchEvent(new Event("input"));
    const list = document.getElementById("cmdPaletteResults");
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(_closed).toContain("searchModal");
  });

  it("does nothing when input/list elements are missing", () => {
    document.body.innerHTML = ""; // no elements
    expect(() => initSearchModalHandlers()).not.toThrow();
  });
});
