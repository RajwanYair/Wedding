/**
 * src/utils/registry-import.js — S663 Import gift registries from external sources
 *
 * Parse and normalise registry data from CSV, JSON, and URL-based imports.
 * Supports Amazon, Zola, and generic registry formats.
 *
 * @module registry-import
 * @owner registry
 */

/**
 * @typedef {object} RegistryItem
 * @property {string} name
 * @property {number} price
 * @property {string} currency
 * @property {string} url
 * @property {string} source
 * @property {boolean} purchased
 * @property {number} [quantity]
 */

/**
 * Supported import sources.
 * @type {ReadonlyArray<string>}
 */
export const SOURCES = Object.freeze(["amazon", "zola", "myregistry", "generic"]);

/**
 * Parse a CSV string into registry items.
 *
 * Expects columns: name, price, url (optional), quantity (optional).
 *
 * @param {string} csv
 * @param {string} [source="generic"]
 * @returns {RegistryItem[]}
 */
export function parseCSV(csv, source = "generic") {
  if (typeof csv !== "string" || !csv.trim()) return [];

  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const nameIdx = header.indexOf("name");
  const priceIdx = header.indexOf("price");
  const urlIdx = header.indexOf("url");
  const qtyIdx = header.indexOf("quantity");

  if (nameIdx === -1 || priceIdx === -1) return [];

  /** @type {RegistryItem[]} */
  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const name = cols[nameIdx];
    const price = Number.parseFloat(cols[priceIdx]);
    if (!name || Number.isNaN(price)) continue;

    items.push({
      name,
      price,
      currency: "ILS",
      url: urlIdx >= 0 ? (cols[urlIdx] ?? "") : "",
      source,
      purchased: false,
      quantity: qtyIdx >= 0 ? (Number.parseInt(cols[qtyIdx], 10) || 1) : 1,
    });
  }
  return items;
}

/**
 * Parse a JSON array into registry items.
 *
 * @param {string|Array<Record<string, unknown>>} data
 * @param {string} [source="generic"]
 * @returns {RegistryItem[]}
 */
export function parseJSON(data, source = "generic") {
  /** @type {Array<Record<string, unknown>>} */
  let arr;
  if (typeof data === "string") {
    try {
      arr = JSON.parse(data);
    } catch {
      return [];
    }
  } else {
    arr = data;
  }

  if (!Array.isArray(arr)) return [];

  return arr
    .filter((item) => item && typeof item.name === "string" && typeof item.price === "number")
    .map((item) => ({
      name: String(item.name),
      price: Number(item.price),
      currency: String(item.currency ?? "ILS"),
      url: String(item.url ?? ""),
      source,
      purchased: Boolean(item.purchased),
      quantity: Number(item.quantity) || 1,
    }));
}

/**
 * Detect the source from a URL.
 *
 * @param {string} url
 * @returns {string}
 */
export function detectSource(url) {
  if (typeof url !== "string") return "generic";
  const lower = url.toLowerCase();
  if (lower.includes("amazon.")) return "amazon";
  if (lower.includes("zola.com")) return "zola";
  if (lower.includes("myregistry.com")) return "myregistry";
  return "generic";
}

/**
 * Merge imported items with existing registry, avoiding duplicates by name.
 *
 * @param {RegistryItem[]} existing
 * @param {RegistryItem[]} imported
 * @returns {{ merged: RegistryItem[], added: number, skipped: number }}
 */
export function mergeRegistries(existing, imported) {
  if (!Array.isArray(existing)) existing = [];
  if (!Array.isArray(imported)) return { merged: [...existing], added: 0, skipped: 0 };

  const names = new Set(existing.map((i) => i.name.toLowerCase()));
  /** @type {RegistryItem[]} */
  const merged = [...existing];
  let added = 0;
  let skipped = 0;

  for (const item of imported) {
    const key = item.name.toLowerCase();
    if (names.has(key)) {
      skipped++;
    } else {
      names.add(key);
      merged.push(item);
      added++;
    }
  }

  return { merged, added, skipped };
}

/**
 * Compute import summary stats.
 *
 * @param {RegistryItem[]} items
 * @returns {{ total: number, totalValue: number, sources: Record<string, number>, purchased: number }}
 */
export function importSummary(items) {
  if (!Array.isArray(items)) {
    return { total: 0, totalValue: 0, sources: {}, purchased: 0 };
  }

  let totalValue = 0;
  let purchased = 0;
  /** @type {Record<string, number>} */
  const sources = {};

  for (const item of items) {
    totalValue += item.price * (item.quantity ?? 1);
    if (item.purchased) purchased++;
    sources[item.source] = (sources[item.source] ?? 0) + 1;
  }

  return { total: items.length, totalValue, sources, purchased };
}

/**
 * Validate an item has required fields.
 *
 * @param {Record<string, unknown>} item
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateItem(item) {
  /** @type {string[]} */
  const errors = [];
  if (!item || typeof item !== "object") return { valid: false, errors: ["Item is required"] };
  if (!item.name || typeof item.name !== "string") errors.push("Name is required");
  if (typeof item.price !== "number" || item.price < 0) errors.push("Valid price is required");
  return { valid: errors.length === 0, errors };
}
