/**
 * src/services/website-builder.js — S134 public wedding website builder.
 *
 * Pure data-model helpers for the upcoming "public wedding website"
 * feature (Phase D2). They produce a serialisable `WebsiteConfig`
 * object that a future section UI and Supabase table will consume.
 * No DOM, no fetch.
 */

/** @typedef {"welcome"|"story"|"venue"|"rsvp"|"gallery"|"registry"|"faq"} WebsiteSection */

/** @typedef {"public"|"password"|"private"} WebsiteVisibility */

/**
 * @typedef {Object} WebsiteConfig
 * @property {string}  id             — unique slug (generated from couple names)
 * @property {string}  coupleA        — first person's first name
 * @property {string}  coupleB        — second person's first name
 * @property {string}  weddingDate    — ISO date "YYYY-MM-DD"
 * @property {WebsiteVisibility} visibility
 * @property {string}  [password]     — bcrypt-ready raw string, max 72 chars
 * @property {WebsiteSection[]} sections
 * @property {string}  [themePreset]  — theme-vars preset name
 * @property {string}  [coverImageUrl]
 * @property {string}  [customDomain] — validated FQDN
 * @property {string}  createdAt
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/;

const ALL_SECTIONS = /** @type {WebsiteSection[]} */ ([
  "welcome", "story", "venue", "rsvp", "gallery", "registry", "faq",
]);

/** Build a URL-safe slug from two first names + year. */
export function buildSiteSlug(coupleA, coupleB, year) {
  const clean = (s) =>
    String(s ?? "").trim().toLowerCase()
      .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 20);
  const a = clean(coupleA) || "name";
  const b = clean(coupleB) || "name";
  const y = String(year ?? new Date().getFullYear()).slice(-4);
  return `${a}-and-${b}-${y}`;
}

/**
 * Validate and construct a new `WebsiteConfig`.
 * @returns {{ ok: boolean, config?: WebsiteConfig, errors?: string[] }}
 */
export function buildWebsiteConfig({
  coupleA,
  coupleB,
  weddingDate,
  visibility = "public",
  password,
  sections = ALL_SECTIONS.slice(),
  themePreset,
  coverImageUrl,
  customDomain,
} = {}) {
  /** @type {string[]} */ const errors = [];

  if (!coupleA || typeof coupleA !== "string") errors.push("missing_couple_a");
  if (!coupleB || typeof coupleB !== "string") errors.push("missing_couple_b");
  if (!weddingDate || !DATE_RE.test(weddingDate)) errors.push("invalid_wedding_date");
  if (!["public", "password", "private"].includes(visibility)) errors.push("invalid_visibility");
  if (visibility === "password" && (!password || typeof password !== "string")) {
    errors.push("password_required_for_password_visibility");
  }
  if (password && typeof password === "string" && password.length > 72) {
    errors.push("password_too_long");
  }
  if (!Array.isArray(sections) || sections.length === 0) errors.push("sections_empty");

  const validSections = (sections ?? []).filter((s) => ALL_SECTIONS.includes(s));
  const invalidSections = (sections ?? []).filter((s) => !ALL_SECTIONS.includes(s));
  if (invalidSections.length > 0) errors.push(`unknown_sections:${invalidSections.join(",")}`);

  if (errors.length > 0) return { ok: false, errors };

  const year = weddingDate ? new Date(weddingDate).getUTCFullYear() : new Date().getFullYear();
  const id = buildSiteSlug(coupleA, coupleB, year);

  /** @type {WebsiteConfig} */
  const config = {
    id,
    coupleA: coupleA.trim(),
    coupleB: coupleB.trim(),
    weddingDate,
    visibility,
    sections: validSections,
    createdAt: new Date().toISOString(),
  };
  if (password) config.password = password;
  if (themePreset) config.themePreset = themePreset;
  if (coverImageUrl) config.coverImageUrl = coverImageUrl;
  if (customDomain) config.customDomain = customDomain;

  return { ok: true, config };
}

/**
 * Update mutable fields of a `WebsiteConfig`. Returns a new object
 * (immutable update pattern).
 * @param {WebsiteConfig} existing
 * @param {Partial<WebsiteConfig>} patch
 */
export function updateWebsiteConfig(existing, patch) {
  const IMMUTABLE = new Set(["id", "coupleA", "coupleB", "weddingDate", "createdAt"]);
  const next = { ...existing };
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (!IMMUTABLE.has(k)) next[k] = v;
  }
  return next;
}

export const WEBSITE_SECTIONS = ALL_SECTIONS;

/**
 * Validate a slug string.
 * @param {string} slug
 */
export function validateSlug(slug) {
  return SLUG_RE.test(slug);
}
