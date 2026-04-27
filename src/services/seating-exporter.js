/**
 * src/services/seating-exporter.js — Seating chart export helpers
 *
 * ROADMAP §5 Phase C C1 — "Export seating chart" to CSV / JSON from Tables section.
 * Pure functions; no DOM, no network. Consumers provide store data.
 *
 * @typedef {{ id: string, name?: string, shape?: string, capacity?: number }} TableRecord
 * @typedef {{ id: string, firstName?: string, lastName?: string, name?: string,
 *   tableId?: string, count?: number }} GuestRecord
 * @typedef {{ table: string, seat: number, guest: string, count: number }} SeatRow
 */

/**
 * Build a flat array of seat rows from tables + guests.
 * Each guest assigned to a table becomes one row.
 *
 * @param {TableRecord[]} tables
 * @param {GuestRecord[]} guests
 * @returns {SeatRow[]}
 */
export function buildSeatRows(tables, guests) {
  const tableNameById = new Map(
    tables.map((t) => [t.id, t.name || `Table ${t.id.slice(0, 6)}`]),
  );

  /** @type {SeatRow[]} */
  const rows = [];

  tables.forEach((tbl) => {
    const tableName = tableNameById.get(tbl.id) ?? tbl.id;
    const seated = guests.filter((g) => g.tableId === tbl.id);
    let seatNum = 1;
    seated.forEach((g) => {
      const guestName =
        [g.firstName, g.lastName].filter(Boolean).join(" ") || g.name || g.id;
      rows.push({ table: tableName, seat: seatNum, guest: guestName, count: g.count ?? 1 });
      seatNum++;
    });
  });

  return rows;
}

/**
 * Render seat rows as a UTF-8 CSV string (BOM-prefixed for Excel).
 * Columns: Table, Seat, Guest, Headcount
 *
 * @param {SeatRow[]} rows
 * @param {{ tableHeader?: string, seatHeader?: string, guestHeader?: string, countHeader?: string }} [headers]
 * @returns {string}
 */
export function seatRowsToCsv(rows, headers = {}) {
  const H_TABLE = headers.tableHeader ?? "Table";
  const H_SEAT = headers.seatHeader ?? "Seat";
  const H_GUEST = headers.guestHeader ?? "Guest";
  const H_COUNT = headers.countHeader ?? "Headcount";

  const esc = (/** @type {string|number} */ v) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const header = [H_TABLE, H_SEAT, H_GUEST, H_COUNT].map(esc).join(",");
  const body = rows.map((r) => [r.table, r.seat, r.guest, r.count].map(esc).join(","));
  return `\uFEFF${[header, ...body].join("\n")}`;
}

/**
 * Render seat rows as a JSON string.
 * @param {SeatRow[]} rows
 * @returns {string}
 */
export function seatRowsToJson(rows) {
  return JSON.stringify(rows, null, 2);
}

/**
 * Trigger a browser download of the given text as a file.
 * @param {string} text
 * @param {string} filename
 * @param {string} [mimeType]
 */
export function downloadTextFile(text, filename, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
