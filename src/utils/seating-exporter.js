/**
 * seating-exporter.js — Export seating chart to CSV, JSON, and card formats
 *
 * Pure data utilities. No DOM access.
 */

// ── CSV ───────────────────────────────────────────────────────────────────

/**
 * Escape a CSV cell value.
 * @param {string|number|null} v
 * @returns {string}
 */
function csvCell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Export seating data (array of {guest, table}) to a CSV string.
 * @param {object[]} rows   each row: {guestName, tableName, seatNumber?, mealChoice?}
 * @returns {string}
 */
export function exportSeatingToCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const header = "Guest Name,Table,Seat,Meal Choice";
  const lines = rows.map(r =>
    [
      csvCell(r.guestName ?? ""),
      csvCell(r.tableName ?? ""),
      csvCell(r.seatNumber ?? ""),
      csvCell(r.mealChoice ?? ""),
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

// ── JSON ──────────────────────────────────────────────────────────────────

/**
 * Export seating data to a formatted JSON string.
 * @param {object[]} rows
 * @returns {string}
 */
export function exportSeatingToJson(rows) {
  if (!Array.isArray(rows)) return "[]";
  return JSON.stringify(rows, null, 2);
}

// ── Matrix ────────────────────────────────────────────────────────────────

/**
 * Build a 2-D matrix: rows = tables, columns = seats.
 * @param {object[]} tables  each: {id, name, capacity, guests: [{id, name, seatNumber?}]}
 * @returns {object[][]}
 */
export function buildSeatingMatrix(tables) {
  if (!Array.isArray(tables)) return [];
  return tables.map(table => {
    const capacity = table.capacity ?? (Array.isArray(table.guests) ? table.guests.length : 0);
    const seats = Array.from({ length: capacity }, (_, i) => {
      const seatNumber = i + 1;
      const guest = Array.isArray(table.guests)
        ? table.guests.find(g => (g.seatNumber ?? null) === seatNumber) ?? null
        : null;
      return { tableName: table.name, tableId: table.id, seatNumber, guest };
    });
    return seats;
  });
}

// ── Table manifest ────────────────────────────────────────────────────────

/**
 * Build a manifest listing each table with its guest names and fill rate.
 * @param {object[]} tables
 * @returns {object[]}
 */
export function buildTableManifest(tables) {
  if (!Array.isArray(tables)) return [];
  return tables.map(table => {
    const guests = Array.isArray(table.guests) ? table.guests : [];
    const capacity = table.capacity ?? guests.length;
    return {
      id: table.id,
      name: table.name,
      capacity,
      seated: guests.length,
      available: Math.max(0, capacity - guests.length),
      fillRate: capacity > 0 ? guests.length / capacity : 0,
      guests: guests.map(g => g.name ?? ""),
    };
  });
}

// ── Escort cards ──────────────────────────────────────────────────────────

/**
 * Build escort card data (one entry per guest: name + assigned table).
 * @param {object[]} tables
 * @returns {object[]}
 */
export function buildEscortCardData(tables) {
  if (!Array.isArray(tables)) return [];
  const cards = [];
  for (const table of tables) {
    const guests = Array.isArray(table.guests) ? table.guests : [];
    for (const guest of guests) {
      cards.push({
        guestName: guest.name ?? "",
        tableName: table.name ?? "",
        tableNumber: table.number ?? null,
      });
    }
  }
  return cards.sort((a, b) => a.guestName.localeCompare(b.guestName));
}

// ── Place cards ───────────────────────────────────────────────────────────

/**
 * Build place card data (one entry per guest: name + seat + table).
 * @param {object[]} tables
 * @returns {object[]}
 */
export function buildPlaceCardData(tables) {
  if (!Array.isArray(tables)) return [];
  const cards = [];
  for (const table of tables) {
    const guests = Array.isArray(table.guests) ? table.guests : [];
    for (const guest of guests) {
      cards.push({
        guestName: guest.name ?? "",
        tableName: table.name ?? "",
        seatNumber: guest.seatNumber ?? null,
        mealChoice: guest.mealChoice ?? null,
      });
    }
  }
  return cards;
}

// ── Group by table ────────────────────────────────────────────────────────

/**
 * Group an array of {guestName, tableName, ...} rows by tableName.
 * @param {object[]} rows
 * @returns {Record<string, object[]>}
 */
export function groupExportByTable(rows) {
  if (!Array.isArray(rows)) return {};
  const result = {};
  for (const row of rows) {
    const key = row.tableName ?? "Unassigned";
    if (!result[key]) result[key] = [];
    result[key].push(row);
  }
  return result;
}
