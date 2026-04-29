/**
 * src/services/theme.js — Unified theme service (S239)
 *
 * Merged from:
 *   - theme-vars.js   (S119) — live CSS-variable editor: catalog, validation, apply, serialize
 *   - theme-export.js (S131) — theme.json export / import
 *
 * Pure helpers — no DOM side-effects except `applyThemeVars`.
 *
 * Public API:
 *   Catalog:    THEME_VARS
 *   Vars:       sanitizeThemeVars · applyThemeVars · serializeThemeVars · deserializeThemeVars
 *   Export/Import: exportThemeJson · stringifyThemeJson · importThemeJson
 */

// ═══════════════════════════════════════════════════════════════════════════
// § 1 — Theme variable catalog + helpers (from theme-vars.js, S119)
// ═══════════════════════════════════════════════════════════════════════════

/** @typedef {{ key: string, label: string, type: "color"|"length"|"number", default: string, min?: number, max?: number, unit?: string }} ThemeVar */

/** Editable variables. Keep aligned with css/variables.css `--color-*` etc. */
export const THEME_VARS = Object.freeze([
  { key: "--color-primary",    label: "primary",    type: "color",  default: "#7e3af2" },
  { key: "--color-secondary",  label: "secondary",  type: "color",  default: "#ec4899" },
  { key: "--color-accent",     label: "accent",     type: "color",  default: "#f59e0b" },
  { key: "--color-bg",         label: "background", type: "color",  default: "#0f172a" },
  { key: "--radius-md",        label: "radius",     type: "length", default: "12", min: 0,  max: 32, unit: "px" },
  { key: "--blur-glass",       label: "blur",       type: "length", default: "16", min: 0,  max: 40, unit: "px" },
  { key: "--glass-opacity",    label: "opacity",    type: "number", default: "0.6", min: 0, max: 1 },
]);

const _byKey = new Map(THEME_VARS.map((v) => [v.key, v]));

/**
 * Validate + coerce a user-supplied draft. Unknown keys are dropped silently.
 * @param {Record<string,unknown>} draft
 * @returns {Record<string,string>}
 */
export function sanitizeThemeVars(draft) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const [k, raw] of Object.entries(draft ?? {})) {
    const meta = _byKey.get(k);
    if (!meta) continue;
    const v = String(raw).trim();
    if (meta.type === "color" && !/^#[0-9a-f]{3,8}$/i.test(v)) continue;
    if (meta.type === "length") {
      const n = Number.parseFloat(v);
      if (Number.isNaN(n)) continue;
      const clamped = Math.max(meta.min ?? 0, Math.min(meta.max ?? Infinity, n));
      out[k] = `${clamped}${meta.unit ?? "px"}`;
      continue;
    }
    if (meta.type === "number") {
      const n = Number.parseFloat(v);
      if (Number.isNaN(n)) continue;
      out[k] = String(Math.max(meta.min ?? 0, Math.min(meta.max ?? Infinity, n)));
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Apply variables to a target element (default: documentElement).
 * Returns a function that reverts to the previous values.
 *
 * @param {Record<string,string>} vars
 * @param {{ style: { setProperty(k:string, v:string): void, removeProperty(k:string): void, getPropertyValue(k:string): string } }} [target]
 */
export function applyThemeVars(vars, target) {
  const el = target ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!el?.style) return () => {};
  const sanitized = sanitizeThemeVars(vars);
  /** @type {Record<string,string>} */
  const previous = {};
  for (const [k, v] of Object.entries(sanitized)) {
    previous[k] = el.style.getPropertyValue(k);
    el.style.setProperty(k, v);
  }
  return () => {
    for (const [k, prev] of Object.entries(previous)) {
      if (prev) el.style.setProperty(k, prev);
      else el.style.removeProperty(k);
    }
  };
}

/** Serialize for `localStorage` / sync. */
export function serializeThemeVars(/** @type {Record<string,unknown>} */ vars) {
  return JSON.stringify(sanitizeThemeVars(vars));
}

/** Deserialize, returning {} on any error. */
export function deserializeThemeVars(/** @type {string} */ json) {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return {};
    return sanitizeThemeVars(parsed);
  } catch {
    return {};
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// § 2 — Theme JSON export / import (from theme-export.js, S131)
// ═══════════════════════════════════════════════════════════════════════════

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
