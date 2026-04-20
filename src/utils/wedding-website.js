/**
 * wedding-website.js — Wedding website section builder and configuration
 *
 * Pure data utilities. No DOM access.
 */

// ── Section catalogue ─────────────────────────────────────────────────────

export const WEBSITE_SECTIONS = Object.freeze({
  HERO: "hero",
  COUNTDOWN: "countdown",
  VENUE: "venue",
  SCHEDULE: "schedule",
  GALLERY: "gallery",
  RSVP: "rsvp",
  REGISTRY: "registry",
  FAQ: "faq",
  CONTACT: "contact",
});

// ── Section builder ───────────────────────────────────────────────────────

/**
 * Create a single website section config object.
 * @param {string} type  one of WEBSITE_SECTIONS values
 * @param {object} [data]  section-specific data
 * @param {object} [opts]
 * @returns {object|null}
 */
export function createWebsiteSection(type, data = {}, { visible = true, order = 0 } = {}) {
  const validTypes = Object.values(WEBSITE_SECTIONS);
  if (!type || !validTypes.includes(type)) return null;
  return {
    id: `sec_${type}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    visible,
    order,
    data: { ...data },
  };
}

// ── Full website config ───────────────────────────────────────────────────

/**
 * Build a full website configuration with ordered sections.
 * @param {{coupleNames: string, weddingDate: string, sections: object[]}} opts
 * @returns {object|null}
 */
export function buildWebsiteConfig({ coupleNames, weddingDate, sections = [] } = {}) {
  if (!coupleNames || !weddingDate) return null;
  return {
    id: `site_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    coupleNames,
    weddingDate,
    published: false,
    sections: Array.isArray(sections) ? [...sections].sort((a, b) => a.order - b.order) : [],
    createdAt: new Date().toISOString(),
  };
}

// ── RSVP form config ──────────────────────────────────────────────────────

/**
 * Build RSVP form configuration.
 * @param {{deadline?: string, maxPlusOnes?: number, mealOptions?: string[], requirePhone?: boolean}} opts
 * @returns {object}
 */
export function buildRsvpFormConfig({
  deadline = null,
  maxPlusOnes = 0,
  mealOptions = [],
  requirePhone = true,
} = {}) {
  return {
    deadline: deadline ? new Date(deadline).toISOString() : null,
    maxPlusOnes: typeof maxPlusOnes === "number" && maxPlusOnes >= 0 ? maxPlusOnes : 0,
    mealOptions: Array.isArray(mealOptions) ? [...mealOptions] : [],
    requirePhone,
    fields: {
      name: { required: true },
      phone: { required: requirePhone },
      attendance: { required: true },
      plusOnes: { required: false, max: maxPlusOnes },
      mealChoice: { required: mealOptions.length > 0 },
    },
  };
}

// ── Venue section ─────────────────────────────────────────────────────────

/**
 * Build a venue section data object.
 * @param {{name: string, address: string, city: string, mapUrl?: string, notes?: string}} opts
 * @returns {object|null}
 */
export function buildVenueSection({ name, address, city, mapUrl = null, notes = "" } = {}) {
  if (!name || !address || !city) return null;
  return createWebsiteSection(WEBSITE_SECTIONS.VENUE, { name, address, city, mapUrl, notes });
}

// ── Gallery section ───────────────────────────────────────────────────────

/**
 * Build a gallery section data object from an array of photo URLs.
 * @param {string[]} photos
 * @param {{caption?: string, layout?: string}} opts
 * @returns {object}
 */
export function buildGallerySection(photos = [], { caption = "", layout = "grid" } = {}) {
  return createWebsiteSection(WEBSITE_SECTIONS.GALLERY, {
    photos: Array.isArray(photos) ? [...photos] : [],
    caption,
    layout,
  });
}

// ── Registry section ──────────────────────────────────────────────────────

/**
 * Build a registry section with links.
 * @param {{registries: Array<{name: string, url: string}>}} opts
 * @returns {object}
 */
export function buildRegistrySection({ registries = [] } = {}) {
  return createWebsiteSection(WEBSITE_SECTIONS.REGISTRY, {
    registries: Array.isArray(registries) ? registries.map(r => ({ name: r.name ?? "", url: r.url ?? "" })) : [],
  });
}

// ── Validation ────────────────────────────────────────────────────────────

/**
 * Validate a website config object.
 * @param {object} config  buildWebsiteConfig() result
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateWebsiteConfig(config) {
  const errors = [];
  if (!config) return { valid: false, errors: ["config is required"] };
  if (!config.coupleNames) errors.push("coupleNames is required");
  if (!config.weddingDate) errors.push("weddingDate is required");
  if (!Array.isArray(config.sections)) errors.push("sections must be an array");
  const hasRsvp = Array.isArray(config.sections) && config.sections.some(s => s.type === WEBSITE_SECTIONS.RSVP);
  if (!hasRsvp) errors.push("RSVP section is recommended");
  return { valid: errors.length === 0, errors };
}
