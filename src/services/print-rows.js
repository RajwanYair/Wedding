/**
 * src/services/pdf-export.js — S120 PDF export helpers (guests + seating).
 *
 * v1 ships pure data-shaping helpers + an HTML-to-print bridge. The actual
 * PDF rendering uses the browser's `window.print()` against a hidden iframe
 * (no library deps). Future sprints can wire pdfmake/jsPDF if needed.
 *
 * `buildGuestRows()` and `buildSeatingRows()` are deterministic and easily
 * testable; `printHtmlDocument()` is dependency-injectable for tests.
 */

/** @typedef {{ name: string, phone?: string, status?: string, side?: string, tableId?: string|null, count?: number }} GuestPdfInput */
/** @typedef {{ name: string, capacity?: number }} TablePdfInput */

const _statusLabel = {
  confirmed: "✔",
  pending: "·",
  declined: "✗",
  maybe: "?",
};

/**
 * Build a printable guest list (sorted by table → name). Empty / pending
 * tables flatten to "—".
 *
 * @param {GuestPdfInput[]} guests
 * @param {TablePdfInput[]} [tables]
 */
export function buildGuestRows(guests, tables = []) {
  const tableNameById = new Map(tables.map((t, i) => [String(i + 1), t.name]));
  return guests
    .map((g) => ({
      name: g.name,
      phone: g.phone ?? "",
      status: _statusLabel[g.status ?? "pending"] ?? "·",
      side: g.side ?? "",
      table: g.tableId ? tableNameById.get(String(g.tableId)) ?? `#${g.tableId}` : "—",
      count: g.count ?? 1,
    }))
    .sort((a, b) => {
      if (a.table === b.table) return a.name.localeCompare(b.name);
      if (a.table === "—") return 1;
      if (b.table === "—") return -1;
      return a.table.localeCompare(b.table);
    });
}

/**
 * Build a per-table seating chart payload.
 * @param {GuestPdfInput[]} guests
 * @param {TablePdfInput[]} tables
 * @returns {Array<{ name: string, capacity: number, seated: number, guests: string[] }>}
 */
export function buildSeatingRows(guests, tables) {
  return tables.map((t, i) => {
    const id = String(i + 1);
    const seated = guests.filter((g) => String(g.tableId) === id);
    return {
      name: t.name,
      capacity: t.capacity ?? 0,
      seated: seated.length,
      guests: seated.map((g) => g.name).sort((a, b) => a.localeCompare(b)),
    };
  });
}

/**
 * Build a self-contained printable HTML document. RTL-aware (via `dir`).
 * @param {string} title
 * @param {string} bodyHtml — already-escaped HTML
 * @param {{ dir?: "rtl"|"ltr", lang?: string }} [opts]
 */
export function buildPrintableHtml(title, bodyHtml, opts = {}) {
  const dir = opts.dir ?? "rtl";
  const lang = opts.lang ?? "he";
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:tahoma,Arial,sans-serif;margin:24px;color:#111}h1{margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:start}th{background:#eee}@media print{@page{size:A4;margin:14mm}}</style></head><body><h1>${escapeHtml(title)}</h1>${bodyHtml}</body></html>`;
}

/**
 * Tiny HTML escaper — strings only.
 * @param {unknown} s
 */
export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Print the given HTML via an injected window-opener (defaults to `window.open`).
 * Returns `{ ok: boolean, error?: string }` — never throws.
 *
 * @param {string} html
 * @param {(url?: string, target?: string) => any} [opener]
 */
export function printHtmlDocument(html, opener) {
  const fn = opener ?? (typeof window !== "undefined" ? window.open : null);
  if (typeof fn !== "function") return { ok: false, error: "no_window" };
  try {
    const w = fn("", "_blank");
    if (!w?.document) return { ok: false, error: "popup_blocked" };
    w.document.open();
    w.document.write(html);
    w.document.close();
    if (typeof w.focus === "function") w.focus();
    if (typeof w.print === "function") w.print();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
