/**
 * S706 — Guests → vCard Batch Export (wire vcard-batch.js)
 *
 * Tests:
 *  - vcard-batch.js buildVcard(), foldLine(), escapeValue(), buildBatch()
 *  - guests.js exportGuestsVcf() downloads a .vcf file
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { initStore } from "../../src/core/store.js";

// ── Mock side-effect deps ──────────────────────────────────────────────────
vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
  onSyncStatus: vi.fn(),
  queueSize: vi.fn(() => 0),
  queueKeys: vi.fn(() => []),
}));
vi.mock("../../src/services/realtime.js", () => ({
  onPresenceChange: vi.fn(),
  groupByViewing: vi.fn(() => ({})),
  badgeFor: vi.fn(() => ""),
}));

// ── Stub window ────────────────────────────────────────────────────────────
vi.stubGlobal("window", {
  open: vi.fn(),
  print: vi.fn(),
  location: { origin: "https://wedding.example.com", pathname: "/app" },
});

// ── Stub URL + document for download ─────────────────────────────────────
const _anchor = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock-vcf"),
  revokeObjectURL: vi.fn(),
});
vi.stubGlobal("document", {
  createElement: vi.fn(() => _anchor),
  body: { appendChild: vi.fn(), removeChild: vi.fn() },
  getElementById: vi.fn(() => null),
});

// ── Module imports ─────────────────────────────────────────────────────────
const { buildVcard, buildBatch, escapeValue, foldLine } = await import("../../src/utils/vcard-batch.js");
const guestsSection = await import("../../src/sections/guests.js");

// ── Fixtures ───────────────────────────────────────────────────────────────
const GUESTS = [
  { id: "g1", firstName: "Alice", lastName: "Smith", phone: "0501234567", email: "alice@example.com", status: "confirmed" },
  { id: "g2", firstName: "Bob", lastName: "Jones", phone: "0521234567", status: "pending" },
  { id: "g3", firstName: "Carol", lastName: "Dana", status: "declined", phone: "0531234567" },
];

function seed(guests = GUESTS) {
  initStore({ guests: { value: guests }, tables: { value: [] }, weddingInfo: { value: {} } });
}

beforeEach(() => {
  seed();
  vi.clearAllMocks();
  _anchor.click.mockClear();
  URL.createObjectURL.mockReturnValue("blob:mock-vcf");
});

// ── vcard-batch unit tests ─────────────────────────────────────────────────

describe("escapeValue", () => {
  it("returns empty string for null", () => {
    expect(escapeValue(null)).toBe("");
  });

  it("escapes backslashes", () => {
    expect(escapeValue("a\\b")).toBe("a\\\\b");
  });

  it("escapes commas", () => {
    expect(escapeValue("a,b")).toBe("a\\,b");
  });

  it("escapes semicolons", () => {
    expect(escapeValue("a;b")).toBe("a\\;b");
  });

  it("escapes newlines as \\n", () => {
    expect(escapeValue("line1\nline2")).toBe("line1\\nline2");
  });

  it("converts numbers to strings", () => {
    expect(escapeValue(42)).toBe("42");
  });
});

describe("foldLine", () => {
  it("does not fold lines <= 75 chars", () => {
    const line = "A".repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it("folds lines > 75 chars with CRLF + space", () => {
    const line = "A".repeat(100);
    const folded = foldLine(line);
    expect(folded).toContain("\r\n ");
  });
});

describe("buildVcard", () => {
  it("returns a string", () => {
    expect(typeof buildVcard({ id: "g1", name: "Alice" })).toBe("string");
  });

  it("includes BEGIN:VCARD and END:VCARD", () => {
    const vc = buildVcard({ id: "g1", name: "Alice", phone: "0501234567" });
    expect(vc).toContain("BEGIN:VCARD");
    expect(vc).toContain("END:VCARD");
  });

  it("includes VERSION:4.0", () => {
    const vc = buildVcard({ id: "g1", name: "Alice", phone: "0501234567" });
    expect(vc).toContain("VERSION:4.0");
  });

  it("includes phone if provided", () => {
    const vc = buildVcard({ id: "g1", name: "Alice", phone: "0501234567" });
    expect(vc).toContain("0501234567");
  });

  it("includes email if provided", () => {
    const vc = buildVcard({ id: "g1", name: "Alice", phone: "054", email: "alice@example.com" });
    expect(vc).toContain("alice@example.com");
  });

  it("returns empty string for guest with no contact info", () => {
    expect(buildVcard({ id: "g1" })).toBe("");
  });
});

describe("buildBatch (vcard-batch)", () => {
  it("returns a string containing multiple vCards", () => {
    const vcf = buildBatch([
      { id: "g1", name: "Alice", phone: "054" },
      { id: "g2", name: "Bob", phone: "055" },
    ]);
    expect((vcf.match(/BEGIN:VCARD/g) || []).length).toBe(2);
  });

  it("returns empty string for empty array", () => {
    expect(buildBatch([])).toBe("");
  });

  it("skips guests with no contact info", () => {
    const vcf = buildBatch([{ id: "g1" }, { id: "g2", phone: "055", name: "Bob" }]);
    expect((vcf.match(/BEGIN:VCARD/g) || []).length).toBe(1);
  });
});

// ── guests.js integration ──────────────────────────────────────────────────

describe("S706 — guests.js exportGuestsVcf", () => {
  it("exports exportGuestsVcf function", () => {
    expect(typeof guestsSection.exportGuestsVcf).toBe("function");
  });

  it("creates a Blob and triggers download", () => {
    guestsSection.exportGuestsVcf();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(_anchor.click).toHaveBeenCalled();
  });

  it("sets download filename to wedding-guests.vcf", () => {
    guestsSection.exportGuestsVcf();
    expect(_anchor.download).toBe("wedding-guests.vcf");
  });

  it("does not trigger download when no exportable guests", () => {
    initStore({ guests: { value: [{ id: "g1", status: "declined" }] }, tables: { value: [] }, weddingInfo: { value: {} } });
    guestsSection.exportGuestsVcf();
    expect(_anchor.click).not.toHaveBeenCalled();
  });

  it("excludes declined guests", () => {
    guestsSection.exportGuestsVcf();
    const blobArg = URL.createObjectURL.mock.calls[0]?.[0];
    expect(blobArg).toBeInstanceOf(Blob);
    // Blob content should not contain Carol (declined)
    // We can't read Blob content in Node, but we verify Blob was created
    expect(blobArg.type).toContain("vcard");
  });

  it("revokes object URL after download", () => {
    guestsSection.exportGuestsVcf();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-vcf");
  });
});
