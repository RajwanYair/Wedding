/**
 * src/utils/command-palette-links.js — S633 Cmd-K deep-links + recent integration
 *
 * Extends the command palette with deep-link commands (open modal, jump
 * to section with specific tab/filter, trigger action) and recent search
 * persistence integration.
 *
 * @module command-palette-links
 * @owner ux
 */

/**
 * @typedef {import('./command-palette-search.js').Command} Command
 */

/**
 * @typedef {object} DeepLink
 * @property {string}  id
 * @property {"section"|"modal"|"action"} type
 * @property {string}  target      // section id, modal id, or action name
 * @property {Record<string, string>=} params  // e.g. { tab: "pending" }
 * @property {string}  label
 * @property {string=} keywords
 */

/**
 * Built-in deep links for common navigation targets.
 *
 * @returns {DeepLink[]}
 */
export function builtinDeepLinks() {
  return [
    { id: "dl:guests:all", type: "section", target: "guests", label: "All Guests", keywords: "guest list" },
    { id: "dl:guests:pending", type: "section", target: "guests", params: { filter: "pending" }, label: "Pending Guests", keywords: "rsvp pending" },
    { id: "dl:guests:confirmed", type: "section", target: "guests", params: { filter: "confirmed" }, label: "Confirmed Guests", keywords: "rsvp confirmed" },
    { id: "dl:tables", type: "section", target: "tables", label: "Table Seating", keywords: "seating arrangement" },
    { id: "dl:vendors", type: "section", target: "vendors", label: "Vendors", keywords: "vendor list" },
    { id: "dl:expenses", type: "section", target: "expenses", label: "Budget & Expenses", keywords: "budget cost" },
    { id: "dl:rsvp", type: "section", target: "rsvp", label: "RSVP Form", keywords: "rsvp invite" },
    { id: "dl:analytics", type: "section", target: "analytics", label: "Analytics Dashboard", keywords: "stats charts" },
    { id: "dl:settings", type: "section", target: "settings", label: "Settings", keywords: "config preferences" },
    { id: "dl:modal:add-guest", type: "modal", target: "add-guest", label: "Add Guest", keywords: "new guest create" },
    { id: "dl:modal:import", type: "modal", target: "import-guests", label: "Import Guests", keywords: "csv import upload" },
    { id: "dl:modal:export", type: "modal", target: "export-data", label: "Export Data", keywords: "csv download" },
    { id: "dl:action:whatsapp", type: "action", target: "whatsapp-blast", label: "Send WhatsApp", keywords: "message blast" },
    { id: "dl:action:checkin", type: "action", target: "checkin-mode", label: "Check-in Mode", keywords: "arrival scan" },
  ];
}

/**
 * Convert deep links to Command objects for the palette search engine.
 *
 * @param {DeepLink[]} links
 * @returns {Command[]}
 */
export function deepLinksToCommands(links) {
  if (!Array.isArray(links)) return [];
  return links.map((dl) => ({
    id: dl.id,
    label: dl.label,
    keywords: dl.keywords,
    section: dl.type,
  }));
}

/**
 * Resolve a deep link ID to navigation instructions.
 *
 * @param {string} linkId
 * @param {DeepLink[]} [links]
 * @returns {{ type: string, target: string, params?: Record<string, string> } | null}
 */
export function resolveDeepLink(linkId, links) {
  const pool = links ?? builtinDeepLinks();
  const found = pool.find((dl) => dl.id === linkId);
  if (!found) return null;
  return { type: found.type, target: found.target, ...(found.params ? { params: found.params } : {}) };
}

/**
 * Merge recent searches into the command list as "recent" entries.
 * Recent items appear first, de-duplicated against existing commands.
 *
 * @param {Command[]} commands
 * @param {string[]} recentQueries
 * @returns {Command[]}
 */
export function mergeRecentSearches(commands, recentQueries) {
  if (!Array.isArray(recentQueries) || recentQueries.length === 0) return commands ?? [];
  const existing = new Set((commands ?? []).map((c) => c.id));
  const recentCommands = recentQueries
    .filter((q) => typeof q === "string" && q.trim())
    .map((q, i) => ({
      id: `recent:${i}`,
      label: q,
      keywords: "recent history",
      section: "recent",
    }))
    .filter((c) => !existing.has(c.id));
  return [...recentCommands, ...(commands ?? [])];
}

/**
 * Register a custom deep link (for plugins).
 *
 * @param {DeepLink[]} links   — mutable array to push into
 * @param {DeepLink} newLink
 * @returns {boolean} — false if duplicate id
 */
export function registerDeepLink(links, newLink) {
  if (!Array.isArray(links) || !newLink?.id) return false;
  if (links.some((dl) => dl.id === newLink.id)) return false;
  links.push(newLink);
  return true;
}
