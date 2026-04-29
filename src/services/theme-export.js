/**
 * src/services/theme-export.js — S131 theme.json export / import.
 *
 * Pure helpers complementing `src/services/theme-vars.js` (S119). They
 * serialise the user's customised CSS-variable bundle to a portable
 * `theme.json` blob, and validate / import a blob back to the editable
 * shape.
 */

import { THEME_VARS, sanitizeThemeVars } from "./theme-vars.js";

const SCHEMA_VERSION = 1;

/** Build a `theme.json` envelope from a vars object. */
export function exportThemeJson(/** @type {Record<string,unknown>} */ vars, /** @type {Record<string,unknown>} */ meta = {}) {
  const sanitized = sanitizeThemeVars(vars);
  return {
    schemaVersion: SCHEMA_VERSION,
    name: typeof meta.name === "string" ? meta.name.slice(0, 80) : "Untitled",
    author: typeof meta.author === "string" ? meta.author.slice(0, 80) : "",
    createdAt: typeof meta.createdAt === "string" ? meta.createdAt : new Date().toISOString(),
    vars: sanitized,
  };
}

/** Stringify with stable ordering and 2-space indent. */
export function stringifyThemeJson(/** @type {Record<string,unknown>} */ envelope) {
  const ordered = {
    schemaVersion: envelope.schemaVersion,
    name: envelope.name,
    author: envelope.author,
    createdAt: envelope.createdAt,
    vars: Object.fromEntries(Object.entries(envelope.vars ?? {}).sort()),
  };
  return JSON.stringify(ordered, null, 2);
}

/**
 * Parse + validate a theme.json blob. Returns `{ ok, envelope?, error? }`.
 * Unknown vars are dropped silently (forward-compat with newer presets).
 */
export function importThemeJson(/** @type {string|Record<string,unknown>} */ input) {
  let raw;
  try {
    raw = typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  if (!raw || typeof raw !== "object") return { ok: false, error: "not_object" };
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, error: "unsupported_schema" };
  }
  if (!raw.vars || typeof raw.vars !== "object") {
    return { ok: false, error: "missing_vars" };
  }
  const known = new Set(THEME_VARS.map((v) => v.key));
  /** @type {Record<string, unknown>} */
  const filtered = {};
  for (const [k, v] of Object.entries(raw.vars)) {
    if (known.has(k)) filtered[k] = v;
  }
  const sanitized = sanitizeThemeVars(filtered);
  return {
    ok: true,
    envelope: {
      schemaVersion: SCHEMA_VERSION,
      name: typeof raw.name === "string" ? raw.name.slice(0, 80) : "Imported",
      author: typeof raw.author === "string" ? raw.author.slice(0, 80) : "",
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
      vars: sanitized,
    },
  };
}
