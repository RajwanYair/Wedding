/**
 * S445: Theme Marketplace registry.
 * COMMUNITY_THEMES provides a curated set of installable themes with preview swatches.
 * installTheme() applies a theme's CSS variables via applyThemeVars.
 * @owner sections
 */

import { applyThemeVars } from "../services/theme.js";

const STORAGE_KEY = "wedding_v1_installed_themes";

/** @typedef {{ id: string, name: string, swatches: string[], vars: Record<string,string> }} CommunityTheme */

/** @type {readonly CommunityTheme[]} */
export const COMMUNITY_THEMES = Object.freeze([
  {
    id: "midnight-blue",
    name: "Midnight Blue",
    swatches: ["#0a1628", "#1e3a5f", "#4a9eff", "#ffffff"],
    vars: {
      "--color-primary": "#4a9eff",
      "--color-primary-dark": "#1e3a5f",
      "--color-secondary": "#0a1628",
      "--color-accent": "#7ec8e3",
      "--color-bg": "#0a1628",
      "--color-surface": "#1e3a5f",
      "--color-text": "#e8f0fe",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    swatches: ["#0d2818", "#1a5c38", "#4caf50", "#f1f8e9"],
    vars: {
      "--color-primary": "#4caf50",
      "--color-primary-dark": "#1a5c38",
      "--color-secondary": "#0d2818",
      "--color-accent": "#a5d6a7",
      "--color-bg": "#0d2818",
      "--color-surface": "#1a5c38",
      "--color-text": "#f1f8e9",
    },
  },
  {
    id: "crimson-love",
    name: "Crimson Love",
    swatches: ["#2c0a0a", "#7b1f1f", "#e53935", "#fff0f0"],
    vars: {
      "--color-primary": "#e53935",
      "--color-primary-dark": "#7b1f1f",
      "--color-secondary": "#2c0a0a",
      "--color-accent": "#ef9a9a",
      "--color-bg": "#2c0a0a",
      "--color-surface": "#7b1f1f",
      "--color-text": "#fff0f0",
    },
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    swatches: ["#003366", "#0077b6", "#00b4d8", "#e0f7fa"],
    vars: {
      "--color-primary": "#00b4d8",
      "--color-primary-dark": "#0077b6",
      "--color-secondary": "#003366",
      "--color-accent": "#90e0ef",
      "--color-bg": "#003366",
      "--color-surface": "#0077b6",
      "--color-text": "#e0f7fa",
    },
  },
]);

/**
 * Install a community theme by id — applies its CSS vars.
 * @param {string} id
 * @returns {boolean} true if theme was found and applied
 */
export function installTheme(id) {
  const theme = COMMUNITY_THEMES.find((t) => t.id === id);
  if (!theme) return false;
  applyThemeVars(theme.vars);
  try {
    const installed = listInstalledThemes();
    if (!installed.includes(id)) {
      installed.push(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(installed));
    }
  } catch { /* storage disabled */ }
  return true;
}

/**
 * Return the list of installed community theme ids.
 * @returns {string[]}
 */
export function listInstalledThemes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
