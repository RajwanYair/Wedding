/**
 * src/utils/color-scheme-manager.js — Sprint 131
 *
 * Utility to manage CSS theme (color-scheme) selection.
 * Persists the active theme to localStorage.
 * No DOM side-effects at module-load time.
 */

import { STORAGE_KEYS } from "../core/constants.js";

const _KEY = STORAGE_KEYS.COLOR_SCHEME;

const THEMES = ["purple", "rosegold", "gold", "emerald", "royal"];

/**
 * List all available themes.
 * @returns {string[]}
 */
export function listThemes() { return THEMES.slice(); }

/**
 * Get the currently active theme.
 * Reads from storage; falls back to "purple".
 * @param {{ storage?: Storage }} [opts]
 * @returns {string}
 */
export function getActiveTheme(opts = {}) {
  const storage = opts.storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  const stored = storage?.getItem(_KEY);
  return (stored && THEMES.includes(stored)) ? stored : "purple";
}

/**
 * Set the active theme.
 * @param {string} theme
 * @param {{ storage?: Storage }} [opts]
 * @returns {boolean} true if theme was valid and applied
 */
export function setActiveTheme(theme, opts = {}) {
  if (!THEMES.includes(theme)) return false;
  const storage = opts.storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  storage?.setItem(_KEY, theme);
  return true;
}

/**
 * Clear the stored theme (reverts to default on next getActiveTheme).
 * @param {{ storage?: Storage }} [opts]
 */
export function clearTheme(opts = {}) {
  const storage = opts.storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  storage?.removeItem(_KEY);
}

/**
 * True if a theme name is valid.
 * @param {string} theme
 * @returns {boolean}
 */
export function isValidTheme(theme) { return THEMES.includes(theme); }
