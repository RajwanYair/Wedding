/**
 * src/utils/vendor-catalogue.js — S646 Vendor catalogue importer
 *
 * Parse, validate, and enrich vendor records from CSV/JSON imports
 * (including Lystio IL format). Pure functions, no I/O.
 *
 * @module vendor-catalogue
 * @owner vendors
 */

/**
 * @typedef {object} VendorRow
 * @property {string} name
 * @property {string} [category]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [region]
 * @property {number} [priceEstimate]
 * @property {string} [website]
 * @property {string} [notes]
 */

/**
 * @typedef {object} ImportResult
 * @property {VendorRow[]} valid
 * @property {{ row: number, errors: string[] }[]} invalid
 */

const REQUIRED_FIELDS = ["name"];
const KNOWN_CATEGORIES = [
  "venue", "catering", "photography", "videography", "dj",
  "flowers", "dress", "suit", "cake", "invitations",
  "makeup", "hair", "transportation", "decor", "planner",
];

/**
 * Parse CSV text into vendor rows.
 * First line = header; columns matched by header name (case-insensitive).
 *
 * @param {string} csv
 * @returns {VendorRow[]}
 */
export function parseCsvVendors(csv) {
  if (!csv || typeof csv !== "string") return [];
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    /** @type {Record<string, string>} */
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j] ?? "";
    }
    rows.push(_mapToVendorRow(obj));
  }

  return rows;
}

/**
 * Parse JSON string into vendor rows.
 *
 * @param {string} jsonStr
 * @returns {VendorRow[]}
 */
export function parseJsonVendors(jsonStr) {
  if (!jsonStr || typeof jsonStr !== "string") return [];
  let arr;
  try {
    arr = JSON.parse(jsonStr);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => _mapToVendorRow(item));
}

/**
 * Validate a single vendor row. Returns an array of error strings (empty = valid).
 *
 * @param {VendorRow} row
 * @returns {string[]}
 */
export function validateVendorRow(row) {
  const errors = [];
  if (!row || typeof row !== "object") return ["row is not an object"];

  for (const field of REQUIRED_FIELDS) {
    // @ts-ignore
    if (!row[field] || typeof row[field] !== "string" || !row[field].trim()) {
      errors.push(`missing required field: ${field}`);
    }
  }

  if (row.category && !KNOWN_CATEGORIES.includes(row.category.toLowerCase())) {
    errors.push(`unknown category: ${row.category}`);
  }

  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push(`invalid email: ${row.email}`);
  }

  if (row.priceEstimate !== undefined && row.priceEstimate !== null) {
    if (typeof row.priceEstimate !== "number" || row.priceEstimate < 0) {
      errors.push("priceEstimate must be a non-negative number");
    }
  }

  return errors;
}

/**
 * Normalize a Lystio IL vendor record into our canonical format.
 *
 * @param {{ vendor_name?: string, vendor_type?: string, contact_phone?: string,
 *           contact_email?: string, area?: string, price_range?: string,
 *           url?: string, description?: string }} raw
 * @returns {VendorRow}
 */
export function normalizeLystioFormat(raw) {
  if (!raw || typeof raw !== "object") {
    return { name: "" };
  }
  return {
    name: String(raw.vendor_name ?? "").trim(),
    category: _mapLystioCategory(String(raw.vendor_type ?? "")),
    phone: String(raw.contact_phone ?? "").trim(),
    email: String(raw.contact_email ?? "").trim(),
    region: String(raw.area ?? "").trim(),
    priceEstimate: _parsePriceRange(String(raw.price_range ?? "")),
    website: String(raw.url ?? "").trim(),
    notes: String(raw.description ?? "").trim(),
  };
}

/**
 * Enrich an Israeli vendor row with region normalization and phone cleanup.
 *
 * @param {VendorRow} vendor
 * @returns {VendorRow}
 */
export function enrichIsraelVendor(vendor) {
  if (!vendor || typeof vendor !== "object") return { name: "" };
  const result = { ...vendor };

  if (result.phone) {
    result.phone = result.phone.replace(/[^0-9+]/g, "");
    if (result.phone.startsWith("05")) {
      result.phone = `+972${result.phone.slice(1)}`;
    }
  }

  if (result.region) {
    result.region = _normalizeRegion(result.region);
  }

  if (result.category) {
    result.category = result.category.toLowerCase();
  }

  return result;
}

/**
 * Batch validate and partition rows into valid / invalid.
 *
 * @param {VendorRow[]} rows
 * @returns {ImportResult}
 */
export function batchValidate(rows) {
  if (!Array.isArray(rows)) return { valid: [], invalid: [] };
  /** @type {VendorRow[]} */
  const valid = [];
  /** @type {{ row: number, errors: string[] }[]} */
  const invalid = [];

  for (let i = 0; i < rows.length; i++) {
    const errors = validateVendorRow(rows[i]);
    if (errors.length === 0) {
      valid.push(rows[i]);
    } else {
      invalid.push({ row: i + 1, errors });
    }
  }

  return { valid, invalid };
}

/**
 * Generate an import summary from batch validation results.
 *
 * @param {ImportResult} result
 * @returns {{ total: number, valid: number, invalid: number, rate: number }}
 */
export function importSummary(result) {
  const total = (result?.valid?.length ?? 0) + (result?.invalid?.length ?? 0);
  const validCount = result?.valid?.length ?? 0;
  return {
    total,
    valid: validCount,
    invalid: result?.invalid?.length ?? 0,
    rate: total === 0 ? 0 : Math.round((validCount / total) * 100),
  };
}

/**
 * Deduplicate vendor rows by name (case-insensitive). Keeps first occurrence.
 *
 * @param {VendorRow[]} rows
 * @returns {VendorRow[]}
 */
export function deduplicateVendors(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const key = (row.name ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Private helpers                                                    */
/* ------------------------------------------------------------------ */

/** @param {Record<string, string>} obj */
function _mapToVendorRow(obj) {
  return {
    name: String(obj.name ?? obj.vendor_name ?? "").trim(),
    category: String(obj.category ?? obj.type ?? "").trim().toLowerCase() || undefined,
    phone: String(obj.phone ?? obj.tel ?? "").trim() || undefined,
    email: String(obj.email ?? "").trim() || undefined,
    region: String(obj.region ?? obj.area ?? "").trim() || undefined,
    priceEstimate: obj.priceEstimate ? Number(obj.priceEstimate) || undefined
      : obj.price ? Number(obj.price) || undefined : undefined,
    website: String(obj.website ?? obj.url ?? "").trim() || undefined,
    notes: String(obj.notes ?? obj.description ?? "").trim() || undefined,
  };
}

/** @param {string} type */
function _mapLystioCategory(type) {
  const map = {
    "אולמות": "venue", "קייטרינג": "catering", "צילום": "photography",
    "וידאו": "videography", "דיגיי": "dj", "פרחים": "flowers",
    "שמלת כלה": "dress", "חליפה": "suit", "עוגה": "cake",
    "הזמנות": "invitations", "איפור": "makeup", "שיער": "hair",
    "הסעות": "transportation", "עיצוב": "decor", "ווידנג פלנר": "planner",
  };
  const lower = type.trim().toLowerCase();
  // @ts-ignore
  return map[lower] ?? (lower || undefined);
}

/** @param {string} range */
function _parsePriceRange(range) {
  if (!range) return undefined;
  const nums = range.match(/[\d,]+/g);
  if (!nums || nums.length === 0) return undefined;
  const values = nums.map((n) => Number(n.replace(/,/g, "")));
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** @param {string} region */
function _normalizeRegion(region) {
  const map = {
    "מרכז": "center", "צפון": "north", "דרום": "south",
    "ירושלים": "jerusalem", "שרון": "sharon", "שפלה": "shephelah",
    "חיפה": "haifa", "גליל": "galilee", "נגב": "negev",
  };
  const lower = region.trim().toLowerCase();
  // @ts-ignore
  return map[lower] ?? region;
}
