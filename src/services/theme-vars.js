/**
 * src/services/theme-vars.js — S119 Live theme variable editor.
 *
 * Pure helpers for the Settings → Theme picker:
 *   - the catalog of editable CSS custom properties (hue/sat/lightness, radius,
 *     blur, glass opacity);
 *   - HSL <-> hex conversion for color sliders;
 *   - applyThemeVars() to push a draft theme to `document.documentElement`;
 *   - serializeThemeVars() / deserializeThemeVars() for persistence.
 */

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
 * @param {Record<string,string>} draft
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
export function serializeThemeVars(vars) {
  return JSON.stringify(sanitizeThemeVars(vars));
}

/** Deserialize, returning {} on any error. */
export function deserializeThemeVars(json) {
  try {
    const parsed = JSON.parse(json ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    return sanitizeThemeVars(parsed);
  } catch {
    return {};
  }
}
