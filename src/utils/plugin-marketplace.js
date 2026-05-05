/**
 * src/utils/plugin-marketplace.js — S641 Plugin marketplace browser
 *
 * Pure helpers for searching, filtering, installing, and rating
 * plugins from a marketplace catalogue. Operates on plain objects
 * (no network calls).
 *
 * @module plugin-marketplace
 * @owner plugin-runtime
 */

/**
 * @typedef {object} MarketplacePlugin
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} version
 * @property {string} author
 * @property {string[]} tags
 * @property {number} downloads
 * @property {number} avgRating
 * @property {number} ratingCount
 * @property {string} minAppVersion
 * @property {boolean} verified
 */

/**
 * @typedef {object} InstalledPlugin
 * @property {string} pluginId
 * @property {string} installedVersion
 * @property {string} installedAt
 * @property {boolean} enabled
 */

/**
 * Search marketplace plugins by query (name, description, tags).
 *
 * @param {MarketplacePlugin[]} catalogue
 * @param {string} query
 * @returns {MarketplacePlugin[]}
 */
export function searchPlugins(catalogue, query) {
  if (!Array.isArray(catalogue) || !query?.trim()) return catalogue ?? [];
  const q = query.toLowerCase().trim();
  return catalogue.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q)),
  );
}

/**
 * Filter plugins by tag.
 *
 * @param {MarketplacePlugin[]} catalogue
 * @param {string} tag
 * @returns {MarketplacePlugin[]}
 */
export function filterByTag(catalogue, tag) {
  if (!Array.isArray(catalogue) || !tag) return [];
  const t = tag.toLowerCase();
  return catalogue.filter((p) => p.tags?.some((pt) => pt.toLowerCase() === t));
}

/**
 * Sort plugins by popularity (downloads) or rating.
 *
 * @param {MarketplacePlugin[]} plugins
 * @param {"downloads" | "rating" | "name"} sortBy
 * @returns {MarketplacePlugin[]}
 */
export function sortPlugins(plugins, sortBy = "downloads") {
  if (!Array.isArray(plugins)) return [];
  const copy = [...plugins];
  if (sortBy === "rating") return copy.sort((a, b) => b.avgRating - a.avgRating);
  if (sortBy === "name") return copy.sort((a, b) => a.name.localeCompare(b.name));
  return copy.sort((a, b) => b.downloads - a.downloads);
}

/**
 * Check if a plugin is compatible with the current app version.
 *
 * @param {string} minAppVersion — e.g. "31.0.0"
 * @param {string} currentVersion — e.g. "31.6.0"
 * @returns {boolean}
 */
export function isCompatible(minAppVersion, currentVersion) {
  if (!minAppVersion || !currentVersion) return true;
  // @ts-ignore
  const parse = (v) => v.split(".").map(Number);
  const [minMaj, minMin, minPat] = parse(minAppVersion);
  const [curMaj, curMin, curPat] = parse(currentVersion);
  if (curMaj !== minMaj) return curMaj > minMaj;
  if (curMin !== minMin) return curMin > minMin;
  return curPat >= minPat;
}

/**
 * Create an install record.
 *
 * @param {string} pluginId
 * @param {string} version
 * @returns {InstalledPlugin}
 */
export function installPlugin(pluginId, version) {
  return {
    pluginId,
    installedVersion: version,
    installedAt: new Date().toISOString(),
    enabled: true,
  };
}

/**
 * Uninstall (remove) a plugin from installed list.
 *
 * @param {InstalledPlugin[]} installed
 * @param {string} pluginId
 * @returns {InstalledPlugin[]}
 */
export function uninstallPlugin(installed, pluginId) {
  if (!Array.isArray(installed)) return [];
  return installed.filter((p) => p.pluginId !== pluginId);
}

/**
 * Toggle enable/disable for an installed plugin.
 *
 * @param {InstalledPlugin} plugin
 * @returns {InstalledPlugin}
 */
export function togglePlugin(plugin) {
  if (!plugin) return plugin;
  return { ...plugin, enabled: !plugin.enabled };
}

/**
 * Check for available updates.
 *
 * @param {InstalledPlugin[]} installed
 * @param {MarketplacePlugin[]} catalogue
 * @returns {{ pluginId: string, installedVersion: string, latestVersion: string }[]}
 */
export function checkUpdates(installed, catalogue) {
  if (!Array.isArray(installed) || !Array.isArray(catalogue)) return [];
  const catalogueMap = new Map(catalogue.map((p) => [p.id, p.version]));
  // @ts-ignore
  return installed
    .filter((p) => {
      const latest = catalogueMap.get(p.pluginId);
      return latest && latest !== p.installedVersion;
    })
    .map((p) => ({
      pluginId: p.pluginId,
      installedVersion: p.installedVersion,
      latestVersion: catalogueMap.get(p.pluginId),
    }));
}

/**
 * Compute a new average rating after adding a user rating.
 *
 * @param {number} currentAvg
 * @param {number} currentCount
 * @param {number} newRating — 1-5
 * @returns {{ avgRating: number, ratingCount: number }}
 */
export function addRating(currentAvg, currentCount, newRating) {
  const clamped = Math.max(1, Math.min(5, newRating));
  const count = Math.max(0, currentCount);
  const avg = count > 0 ? currentAvg : 0;
  const newCount = count + 1;
  const newAvg = Math.round(((avg * count + clamped) / newCount) * 10) / 10;
  return { avgRating: newAvg, ratingCount: newCount };
}
