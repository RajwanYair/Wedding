/**
 * src/utils/theme-marketplace.js — Theme marketplace: browse, install, rate, uninstall (S664)
 *
 * @module theme-marketplace
 * @owner plugin-runtime
 */

/**
 * @typedef {object} ThemeListing
 * @property {string} id
 * @property {string} name
 * @property {string} author
 * @property {string} version
 * @property {string} description
 * @property {string[]} tags
 * @property {number} rating
 * @property {number} downloads
 * @property {string} previewUrl
 * @property {string} cssUrl
 * @property {string} publishedAt
 */

/**
 * @typedef {object} InstalledTheme
 * @property {string} themeId
 * @property {string} name
 * @property {string} version
 * @property {string} installedAt
 * @property {boolean} active
 */

let _idCounter = 0;

/** Reset ID counter - testing only. */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

/**
 * Create a theme listing.
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.author
 * @param {string} [params.version]
 * @param {string} [params.description]
 * @param {string[]} [params.tags]
 * @param {string} [params.previewUrl]
 * @param {string} [params.cssUrl]
 * @returns {ThemeListing}
 */
export function createThemeListing({ name, author, version, description, tags, previewUrl, cssUrl }) {
  return {
    id: `theme_${++_idCounter}`,
    name: (name || "").trim(),
    author: (author || "").trim(),
    version: version || "1.0.0",
    description: description || "",
    tags: tags || [],
    rating: 0,
    downloads: 0,
    previewUrl: previewUrl || "",
    cssUrl: cssUrl || "",
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Install a theme.
 * @param {ThemeListing} theme
 * @param {InstalledTheme[]} installed
 * @returns {{ installed: InstalledTheme[], entry: InstalledTheme }}
 */
export function installTheme(theme, installed) {
  const existing = installed.find((t) => t.themeId === theme.id);
  if (existing) {
    const updated = installed.map((t) =>
      t.themeId === theme.id ? { ...t, version: theme.version } : t,
    );
    return { installed: updated, entry: { ...existing, version: theme.version } };
  }
  const entry = {
    themeId: theme.id,
    name: theme.name,
    version: theme.version,
    installedAt: new Date().toISOString(),
    active: false,
  };
  return { installed: [...installed, entry], entry };
}

/**
 * Uninstall a theme.
 * @param {string} themeId
 * @param {InstalledTheme[]} installed
 * @returns {InstalledTheme[]}
 */
export function uninstallTheme(themeId, installed) {
  return installed.filter((t) => t.themeId !== themeId);
}

/**
 * Activate a theme (deactivates others).
 * @param {string} themeId
 * @param {InstalledTheme[]} installed
 * @returns {InstalledTheme[]}
 */
export function activateTheme(themeId, installed) {
  return installed.map((t) => ({
    ...t,
    active: t.themeId === themeId,
  }));
}

/**
 * Rate a theme (1–5 stars), update listing rating (running average).
 * @param {ThemeListing} theme
 * @param {number} stars
 * @param {number} totalRatings
 * @returns {ThemeListing}
 */
export function rateTheme(theme, stars, totalRatings) {
  const clamped = Math.max(1, Math.min(5, Math.round(stars)));
  const newRating =
    totalRatings === 0
      ? clamped
      : (theme.rating * totalRatings + clamped) / (totalRatings + 1);
  return { ...theme, rating: Math.round(newRating * 10) / 10 };
}

/**
 * Search themes by name or tags (case-insensitive).
 * @param {ThemeListing[]} themes
 * @param {string} query
 * @returns {ThemeListing[]}
 */
export function searchThemes(themes, query) {
  if (!query || !query.trim()) return themes;
  const q = query.toLowerCase();
  return themes.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      t.author.toLowerCase().includes(q),
  );
}

/**
 * Sort themes by criteria.
 * @param {ThemeListing[]} themes
 * @param {"rating"|"downloads"|"newest"} sortBy
 * @returns {ThemeListing[]}
 */
export function sortThemes(themes, sortBy) {
  const sorted = [...themes];
  if (sortBy === "rating") {
    sorted.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === "downloads") {
    sorted.sort((a, b) => b.downloads - a.downloads);
  } else {
    sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }
  return sorted;
}

/**
 * Get marketplace stats.
 * @param {ThemeListing[]} themes
 * @param {InstalledTheme[]} installed
 * @returns {{ totalThemes: number, installed: number, activeTheme: string | null, avgRating: number }}
 */
export function getMarketplaceStats(themes, installed) {
  const active = installed.find((t) => t.active);
  const avgRating =
    themes.length === 0
      ? 0
      : Math.round((themes.reduce((s, t) => s + t.rating, 0) / themes.length) * 10) / 10;
  return {
    totalThemes: themes.length,
    installed: installed.length,
    activeTheme: active ? active.name : null,
    avgRating,
  };
}
