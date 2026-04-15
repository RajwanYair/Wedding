/**
 * scripts/test-sheets.mjs — Manual integration test for Google Sheets sync
 *
 * Sends sample payloads for Attendees, Tables, and Config to the GAS Web App
 * and reports what the sheet receives.
 *
 * Uses curl (via child_process) so the Intel corporate proxy is honoured.
 * Node's built-in fetch (undici) does not forward system proxy env vars.
 * JSON bodies are written to temp files to avoid shell quoting issues on Windows.
 *
 * Usage:  node scripts/test-sheets.mjs
 */

import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || "";

const SHEETS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbxGYuciHXLurYbZn9s-Gx8uMmBSn1dZ20xOFoZkk3JXg3RrzR741jz2tsIKgLtN8cHQ/exec";

const SPREADSHEET_ID = "1hgAD078LFdzPEUKb3vgv8KXMd09n9EUlHR3ANP9SBMA";

// ── Test payloads ─────────────────────────────────────────────────────────

const ATTENDEES_ROWS = [
  // id, firstName, lastName, phone, email, count, children, status, side, group, relationship, meal, mealNotes, accessibility, transport, tableId, gift, notes, sent, rsvpDate, createdAt, updatedAt
  [
    "test-001",
    "Alice",
    "Cohen",
    "0545000001",
    "alice@test.com",
    2,
    0,
    "confirmed",
    "bride",
    "friends",
    "friend",
    "regular",
    "",
    false,
    "none",
    "",
    "",
    "",
    false,
    "2026-04-15",
    "2026-04-15T10:00:00Z",
    "2026-04-15T10:00:00Z",
  ],
  [
    "test-002",
    "Bob",
    "Levi",
    "0545000002",
    "bob@test.com",
    3,
    1,
    "confirmed",
    "groom",
    "family",
    "cousin",
    "kosher",
    "",
    true,
    "tefachot",
    "",
    "",
    "",
    true,
    "2026-04-15",
    "2026-04-15T11:00:00Z",
    "2026-04-15T11:00:00Z",
  ],
  [
    "test-003",
    "Carol",
    "Mizrahi",
    "0545000003",
    "",
    1,
    0,
    "pending",
    "mutual",
    "other",
    "",
    "vegetarian",
    "no nuts",
    false,
    "none",
    "",
    "",
    "",
    false,
    "",
    "2026-04-15T12:00:00Z",
    "2026-04-15T12:00:00Z",
  ],
];

const TABLES_ROWS = [
  // id, name, capacity, shape
  ["tbl-001", "שולחן 1 — משפחה", 10, "round"],
  ["tbl-002", "שולחן 2 — חברים", 8, "rect"],
  ["tbl-003", "שולחן 3 — עבודה", 6, "round"],
];

// Config sheet uses key/value rows
const CONFIG_ROWS = [
  ["groom", "יאיר"],
  ["bride", "ענת"],
  ["weddingDate", "2026-09-15"],
  ["venue", "אולם האחוזה"],
  ["city", "תל אביב"],
  ["rsvpDeadline", "2026-08-01"],
];

// ── Helpers ───────────────────────────────────────────────────────────────

function curlGet(url, label) {
  console.log(`\n▶ ${label}`);
  try {
    const proxyArg = PROXY ? `--proxy "${PROXY}"` : "";
    const out = execSync(`curl -sL ${proxyArg} "${url}"`, {
      timeout: 20000,
      encoding: "utf8",
    });
    let json;
    try {
      json = JSON.parse(out);
    } catch {
      json = out.trim();
    }
    console.log(`  ✅ Response:`, JSON.stringify(json).substring(0, 200));
    return { ok: true, body: json };
  } catch (err) {
    console.log(`  ❌ ERROR:`, err.message.substring(0, 300));
    return { ok: false, error: err.message };
  }
}

function curlPost(url, payload, label) {
  console.log(`\n▶ ${label}`);
  // Write JSON body to a temp file to avoid shell quoting issues on Windows
  const tmpFile = join(tmpdir(), `sheets-test-${Date.now()}.json`);
  try {
    writeFileSync(tmpFile, JSON.stringify(payload), "utf8");
    const proxyArg = PROXY ? `--proxy "${PROXY}"` : "";
    const out = execSync(
      `curl -sL ${proxyArg} -X POST -H "Content-Type: application/json" --data-binary "@${tmpFile}" "${url}"`,
      { timeout: 20000, encoding: "utf8" },
    );
    let json;
    try {
      json = JSON.parse(out);
    } catch {
      json = out.trim();
    }
    console.log(`  ✅ Response:`, JSON.stringify(json).substring(0, 200));
    return { ok: true, body: json };
  } catch (err) {
    console.log(`  ❌ ERROR:`, err.message.substring(0, 300));
    return { ok: false, error: err.message };
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

function readSheet(sheet, label) {
  console.log(`\n▶ ${label}`);
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheet)}&tqx=out:json`;
  try {
    const proxyArg = PROXY ? `--proxy "${PROXY}"` : "";
    const text = execSync(`curl -sL ${proxyArg} "${url}"`, {
      timeout: 20000,
      encoding: "utf8",
    });
    const rawJson = text.replace(/^[^(]+\(/, "").replace(/\);?\s*$/, "");
    const data = JSON.parse(rawJson);
    const cols = (data?.table?.cols ?? []).map((c) => c.label || c.id || "");
    const rows = (data?.table?.rows ?? []).map((row) =>
      (row.c ?? []).map((cell) => cell?.v ?? ""),
    );
    console.log(`  ✅ Columns: [${cols.join(", ")}]`);
    console.log(`  ✅ ${rows.length} data row(s) returned`);
    rows
      .slice(0, 3)
      .forEach((r, i) =>
        console.log(`     Row ${i + 1}:`, JSON.stringify(r).substring(0, 120)),
      );
    return { ok: true, cols, rows };
  } catch (err) {
    console.log(`  ❌ READ ERROR:`, err.message.substring(0, 300));
    return { ok: false, error: err.message };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

(async () => {
  console.log("═══════════════════════════════════════════════════");
  console.log(" Google Sheets Integration Test — Wedding Manager");
  console.log(" Proxy:", PROXY || "(none)");
  console.log("═══════════════════════════════════════════════════");

  // 1. Connection check (GET)
  curlGet(SHEETS_WEBAPP_URL, "GET /exec — connection check");

  // 2. Ensure all tabs exist
  curlPost(
    SHEETS_WEBAPP_URL,
    { action: "ensureSheets" },
    "POST ensureSheets — create missing tabs",
  );

  // 3. Push Attendees
  curlPost(
    SHEETS_WEBAPP_URL,
    { action: "replaceAll", sheet: "Attendees", rows: ATTENDEES_ROWS },
    "POST replaceAll → Attendees (3 test guests)",
  );

  // 4. Push Tables
  curlPost(
    SHEETS_WEBAPP_URL,
    { action: "replaceAll", sheet: "Tables", rows: TABLES_ROWS },
    "POST replaceAll → Tables (3 test tables)",
  );

  // 5. Push Config
  curlPost(
    SHEETS_WEBAPP_URL,
    { action: "replaceAll", sheet: "Config", rows: CONFIG_ROWS },
    "POST replaceAll → Config (wedding info)",
  );

  // 6. Read back Attendees via GViz
  readSheet("Attendees", "READ Attendees sheet via GViz");

  // 7. Read back Tables via GViz
  readSheet("Tables", "READ Tables sheet via GViz");

  // 8. Read back Config via GViz
  readSheet("Config", "READ Config sheet via GViz");

  console.log("\n═══════════════════════════════════════════════════");
  console.log(" Done.");
  console.log("═══════════════════════════════════════════════════");
})();
