/**
 * src/utils/registry-deeplink.js — Registry deep-link builder (S667)
 *
 * @module registry-deeplink
 * @owner guest
 */

/**
 * @typedef {object} RegistryItem
 * @property {string} id
 * @property {string} name
 * @property {string} store
 * @property {string} url
 * @property {number} price
 * @property {string} currency
 * @property {boolean} purchased
 * @property {string|null} affiliateTag
 */

/**
 * @typedef {object} DeepLink
 * @property {string} original
 * @property {string} deepLink
 * @property {string} store
 * @property {string|null} affiliateTag
 */

let _idCounter = 0;

/** Reset ID counter - testing only. */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

const STORE_PATTERNS = [
  { name: "amazon_il", pattern: /amazon\.co\.il/i },
  { name: "amazon_com", pattern: /amazon\.com/i },
  { name: "terminalx", pattern: /terminalx\.com/i },
  { name: "zara", pattern: /zara\.com/i },
  { name: "ikea", pattern: /ikea\.co\.il|ikea\.com/i },
  { name: "shein", pattern: /shein\.com/i },
  { name: "aliexpress", pattern: /aliexpress\.com/i },
  { name: "other", pattern: /.*/ },
];

/**
 * Detect store from URL.
 * @param {string} url
 * @returns {string}
 */
export function detectStore(url) {
  for (const { name, pattern } of STORE_PATTERNS) {
    if (name === "other") continue;
    if (pattern.test(url)) return name;
  }
  return "other";
}

/**
 * Create a registry item.
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.url
 * @param {number} params.price
 * @param {string} [params.currency]
 * @param {string|null} [params.affiliateTag]
 * @returns {RegistryItem}
 */
export function createRegistryItem({ name, url, price, currency, affiliateTag }) {
  return {
    id: `reg_${++_idCounter}`,
    name: (name || "").trim(),
    store: detectStore(url || ""),
    url: (url || "").trim(),
    price: Math.max(0, price || 0),
    currency: currency || "ILS",
    purchased: false,
    affiliateTag: affiliateTag || null,
  };
}

/**
 * Generate affiliate deep link.
 * @param {string} url
 * @param {string|null} affiliateTag
 * @returns {DeepLink}
 */
export function generateDeepLink(url, affiliateTag) {
  const store = detectStore(url);
  let deepLink = url;

  if (affiliateTag && (store === "amazon_il" || store === "amazon_com")) {
    const separator = url.includes("?") ? "&" : "?";
    deepLink = `${url}${separator}tag=${affiliateTag}`;
  } else if (affiliateTag && store === "aliexpress") {
    const separator = url.includes("?") ? "&" : "?";
    deepLink = `${url}${separator}aff_id=${affiliateTag}`;
  }

  return { original: url, deepLink, store, affiliateTag: affiliateTag || null };
}

/**
 * Mark item as purchased.
 * @param {RegistryItem} item
 * @returns {RegistryItem}
 */
export function markPurchased(item) {
  return { ...item, purchased: true };
}

/**
 * Get registry stats.
 * @param {RegistryItem[]} items
 * @returns {{ total: number, purchased: number, remaining: number, totalValue: number, purchasedValue: number }}
 */
export function getRegistryStats(items) {
  let purchased = 0;
  let totalValue = 0;
  let purchasedValue = 0;

  for (const item of items) {
    totalValue += item.price;
    if (item.purchased) {
      purchased++;
      purchasedValue += item.price;
    }
  }

  return {
    total: items.length,
    purchased,
    remaining: items.length - purchased,
    totalValue,
    purchasedValue,
  };
}

/**
 * Group items by store.
 * @param {RegistryItem[]} items
 * @returns {Record<string, RegistryItem[]>}
 */
export function groupByStore(items) {
  /** @type {Record<string, RegistryItem[]>} */
  const groups = {};
  for (const item of items) {
    if (!groups[item.store]) groups[item.store] = [];
    groups[item.store].push(item);
  }
  return groups;
}

/**
 * Sort items by price.
 * @param {RegistryItem[]} items
 * @param {"asc"|"desc"} [direction]
 * @returns {RegistryItem[]}
 */
export function sortByPrice(items, direction = "asc") {
  return [...items].sort((a, b) =>
    direction === "asc" ? a.price - b.price : b.price - a.price
  );
}

/**
 * Filter unpurchased items within price range.
 * @param {RegistryItem[]} items
 * @param {number} min
 * @param {number} max
 * @returns {RegistryItem[]}
 */
export function filterByPriceRange(items, min, max) {
  return items.filter((i) => !i.purchased && i.price >= min && i.price <= max);
}

/**
 * Generate shareable registry link (encoded).
 * @param {RegistryItem[]} items
 * @param {string} coupleName
 * @returns {string}
 */
export function generateShareableLink(items, coupleName) {
  const unpurchased = items.filter((i) => !i.purchased);
  const data = {
    couple: coupleName,
    items: unpurchased.map((i) => ({ name: i.name, url: i.url, price: i.price })),
  };
  return `registry://${encodeURIComponent(JSON.stringify(data))}`;
}
