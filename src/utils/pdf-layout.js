/**
 * src/utils/pdf-layout.js — PDF / print layout data builder
 *
 * S55: Produces structured layout data (pure JSON, no DOM/HTML) suitable for
 * feeding into print templates, PDF libraries, or the print-helpers module.
 *
 * All functions are pure — no side effects, no I/O.
 */

// ── Guest list layout ──────────────────────────────────────────────────────

/**
 * @typedef {{ id?: string; name?: string; phone?: string; status?: string; mealChoice?: string; tableId?: string | number; side?: string; partySize?: number; notes?: string }} LayoutGuest
 */

/**
 * @typedef {{ id?: string | number; name?: string; capacity?: number }} LayoutTable
 */

/**
 * @typedef {{ name?: string; category?: string; contact?: string; phone?: string; totalCost?: number; amountPaid?: number; notes?: string }} LayoutVendor
 */

/**
 * @typedef {{ time?: string; title?: string; location?: string; duration?: number; responsible?: string; notes?: string }} LayoutTimelineEvent
 */

/**
 * Builds a structured guest-list layout suitable for printing/PDF.
 * @param {LayoutGuest[]} guests
 * @param {{ title?: string; groupBy?: "table"|"status"|"side"|"none"; showPhone?: boolean; showMeal?: boolean; showNotes?: boolean }} [opts]
 * @returns {{ title: string; columns: string[]; rows: Array<Record<string, string>>; total: number; groupBy: string }}
 */
export function buildGuestListLayout(guests, opts = {}) {
  const {
    title = "Guest List",
    groupBy = "none",
    showPhone = false,
    showMeal = true,
    showNotes = false,
  } = opts;

  const columns = ["Name", "Status", "Party Size"];
  if (showMeal) columns.push("Meal");
  if (showPhone) columns.push("Phone");
  if (groupBy !== "none") columns.unshift("Group");
  if (showNotes) columns.push("Notes");

  const rows = guests.map(g => {
    /** @type {Record<string, string>} */
    const row = {
      Name: g.name ?? "",
      Status: g.status ?? "",
      "Party Size": String(g.partySize ?? 1),
    };
    if (showMeal) row.Meal = g.mealChoice ?? "";
    if (showPhone) row.Phone = g.phone ?? "";
    if (groupBy !== "none") {
      row.Group = groupBy === "table"
        ? String(g.tableId ?? "")
        : groupBy === "status"
        ? (g.status ?? "")
        : groupBy === "side"
        ? (g.side ?? "")
        : "";
    }
    if (showNotes) row.Notes = g.notes ?? "";
    return row;
  });

  return { title, columns, rows, total: guests.length, groupBy };
}

/**
 * Builds a sorted + grouped version of the guest list layout.
 * Groups rows by the groupBy field.
 * @param {LayoutGuest[]} guests
 * @param {{ title?: string; groupBy?: "table"|"status"|"side"; showPhone?: boolean; showMeal?: boolean }} [opts]
 * @returns {{ title: string; groups: Array<{ group: string; rows: Array<Record<string, string>>; count: number }> }}
 */
export function buildGroupedGuestLayout(guests, opts = {}) {
  const { title = "Guest List", groupBy = "status", showPhone = false, showMeal = true } = opts;
  const layout = buildGuestListLayout(guests, { title, groupBy, showPhone, showMeal });
  const groupMap = /** @type {Map<string, Array<Record<string, string>>>} */ (new Map());

  for (const row of layout.rows) {
    const key = row.Group ?? "";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(row);
  }

  const groups = [...groupMap.entries()].map(([group, rows]) => ({ group, rows, count: rows.length }));
  return { title, groups };
}

// ── Seating / Table plan layout ────────────────────────────────────────────

/**
 * Builds a table-plan layout: each table with its seated guests.
 * @param {LayoutTable[]} tables
 * @param {LayoutGuest[]} guests
 * @param {{ title?: string; showMeal?: boolean }} [opts]
 * @returns {{ title: string; tables: Array<{ id: string; name: string; capacity: number; guests: Array<{ name: string; meal: string }>; seated: number }> }}
 */
export function buildTablePlanLayout(tables, guests, opts = {}) {
  const { title = "Table Plan", showMeal = true } = opts;
  const tableList = tables.map(t => {
    const tableId = String(t.id ?? "");
    const seated = guests.filter(g => String(g.tableId ?? "") === tableId);
    return {
      id: tableId,
      name: t.name ?? tableId,
      capacity: t.capacity ?? 0,
      guests: seated.map(g => ({
        name: g.name ?? "",
        meal: showMeal ? (g.mealChoice ?? "") : "",
      })),
      seated: seated.length,
    };
  });
  return { title, tables: tableList };
}

/**
 * Builds a seating card data object for a single guest.
 * @param {LayoutGuest} guest
 * @param {LayoutTable[]} [tables]
 * @returns {{ name: string; tableName: string; tableId: string; mealChoice: string; side: string }}
 */
export function buildSeatingCardLayout(guest, tables = []) {
  const tableId = String(guest.tableId ?? "");
  const table = tables.find(t => String(t.id ?? "") === tableId);
  return {
    name: guest.name ?? "",
    tableName: table?.name ?? tableId,
    tableId,
    mealChoice: guest.mealChoice ?? "",
    side: guest.side ?? "",
  };
}

// ── Vendor list layout ─────────────────────────────────────────────────────

/**
 * Builds a vendor list layout.
 * @param {LayoutVendor[]} vendors
 * @param {{ title?: string; showCosts?: boolean; showNotes?: boolean }} [opts]
 * @returns {{ title: string; columns: string[]; rows: Array<Record<string, string>>; total: number; totalCost: number; totalPaid: number }}
 */
export function buildVendorListLayout(vendors, opts = {}) {
  const { title = "Vendor List", showCosts = true, showNotes = false } = opts;

  const columns = ["Name", "Category", "Contact"];
  if (showCosts) columns.push("Total Cost", "Amount Paid", "Balance");
  if (showNotes) columns.push("Notes");

  let totalCost = 0;
  let totalPaid = 0;

  const rows = vendors.map(v => {
    const cost = v.totalCost ?? 0;
    const paid = v.amountPaid ?? 0;
    totalCost += cost;
    totalPaid += paid;
    /** @type {Record<string, string>} */
    const row = {
      Name: v.name ?? "",
      Category: v.category ?? "",
      Contact: v.contact ?? v.phone ?? "",
    };
    if (showCosts) {
      row["Total Cost"] = String(cost);
      row["Amount Paid"] = String(paid);
      row.Balance = String(cost - paid);
    }
    if (showNotes) row.Notes = v.notes ?? "";
    return row;
  });

  return { title, columns, rows, total: vendors.length, totalCost, totalPaid };
}

// ── Timeline / Run-of-show layout ──────────────────────────────────────────

/**
 * Builds a run-of-show / timeline layout.
 * @param {LayoutTimelineEvent[]} events
 * @param {{ title?: string; showNotes?: boolean }} [opts]
 * @returns {{ title: string; columns: string[]; rows: Array<Record<string, string>>; eventCount: number }}
 */
export function buildRunOfShowLayout(events, opts = {}) {
  const { title = "Run of Show", showNotes = true } = opts;
  const columns = ["Time", "Title", "Location", "Duration (min)", "Responsible"];
  if (showNotes) columns.push("Notes");

  const rows = events.map(e => {
    /** @type {Record<string, string>} */
    const row = {
      Time: e.time ?? "",
      Title: e.title ?? "",
      Location: e.location ?? "",
      "Duration (min)": e.duration != null ? String(e.duration) : "",
      Responsible: e.responsible ?? "",
    };
    if (showNotes) row.Notes = e.notes ?? "";
    return row;
  });

  return { title, columns, rows, eventCount: events.length };
}

// ── Summary / cover page layout ────────────────────────────────────────────

/**
 * Builds a summary cover page data object for a printed report.
 * @param {{ coupleName?: string; weddingDate?: string; venue?: string; totalGuests?: number; confirmedGuests?: number; totalTables?: number; totalVendors?: number; budget?: number }} info
 * @returns {{ heading: string; fields: Array<{ label: string; value: string }> }}
 */
export function buildSummaryLayout(info) {
  const {
    coupleName = "",
    weddingDate = "",
    venue = "",
    totalGuests = 0,
    confirmedGuests = 0,
    totalTables = 0,
    totalVendors = 0,
    budget = 0,
  } = info;

  const fields = [
    { label: "Couple", value: coupleName },
    { label: "Date", value: weddingDate },
    { label: "Venue", value: venue },
    { label: "Total Guests", value: String(totalGuests) },
    { label: "Confirmed", value: String(confirmedGuests) },
    { label: "Tables", value: String(totalTables) },
    { label: "Vendors", value: String(totalVendors) },
    { label: "Budget", value: String(budget) },
  ].filter(f => f.value !== "" && f.value !== "0");

  return { heading: coupleName ? `${coupleName} Wedding` : "Wedding Summary", fields };
}
