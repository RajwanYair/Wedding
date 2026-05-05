/**
 * src/utils/website-preview.js — S622 Public wedding website preview helpers
 *
 * Pure helpers for the website-builder section's live preview feature.
 * Generates preview data structures from wedding settings — event details,
 * theme tokens, RSVP URL, and page sections.
 *
 * @module website-preview
 * @owner sections
 */

/**
 * @typedef {object} WebsiteConfig
 * @property {string}  coupleName
 * @property {string=} eventDate       // ISO date
 * @property {string=} venueName
 * @property {string=} venueAddress
 * @property {string=} coverImageUrl
 * @property {string=} rsvpUrl
 * @property {string=} theme           // theme id
 * @property {string=} customDomain
 * @property {string=} password        // optional page password
 * @property {string[]=} enabledSections
 */

/** Available public page sections. */
export const PAGE_SECTIONS = /** @type {const} */ ([
  "hero",
  "story",
  "event-details",
  "gallery",
  "rsvp",
  "registry",
  "faq",
  "footer",
]);

/** Default enabled sections for a new site. */
export const DEFAULT_SECTIONS = /** @type {const} */ ([
  "hero",
  "event-details",
  "rsvp",
  "footer",
]);

/**
 * Build a preview data object from config. This is what the preview
 * renderer consumes to display the wedding website mockup.
 *
 * @param {WebsiteConfig} config
 * @returns {{ title: string, sections: string[], hasPassword: boolean, hasRsvp: boolean, hasCover: boolean, theme: string }}
 */
export function buildPreview(config) {
  if (!config || typeof config !== "object") {
    return {
      title: "",
      sections: [...DEFAULT_SECTIONS],
      hasPassword: false,
      hasRsvp: false,
      hasCover: false,
      theme: "default",
    };
  }
  const sections =
    Array.isArray(config.enabledSections) && config.enabledSections.length > 0
      ? config.enabledSections.filter((s) => PAGE_SECTIONS.includes(/** @type {any} */ (s)))
      : [...DEFAULT_SECTIONS];

  return {
    title: typeof config.coupleName === "string" ? config.coupleName.trim() : "",
    sections,
    hasPassword: typeof config.password === "string" && config.password.length > 0,
    hasRsvp: sections.includes("rsvp") && typeof config.rsvpUrl === "string" && config.rsvpUrl.length > 0,
    hasCover: typeof config.coverImageUrl === "string" && config.coverImageUrl.length > 0,
    theme: typeof config.theme === "string" && config.theme.length > 0 ? config.theme : "default",
  };
}

/**
 * Generate countdown data from event date.
 *
 * @param {string} eventDate — ISO date string
 * @param {string} [refDate] — reference date, defaults to now
 * @returns {{ days: number, isPast: boolean }}
 */
export function countdownDays(eventDate, refDate) {
  if (typeof eventDate !== "string" || !eventDate) return { days: 0, isPast: true };
  const event = new Date(eventDate).getTime();
  const ref = refDate ? new Date(refDate).getTime() : Date.now();
  if (Number.isNaN(event)) return { days: 0, isPast: true };
  const diff = event - ref;
  return { days: Math.ceil(diff / 86_400_000), isPast: diff < 0 };
}

/**
 * Validate website config. Returns an array of error strings.
 *
 * @param {WebsiteConfig} config
 * @returns {string[]}
 */
export function validateWebsiteConfig(config) {
  const errors = [];
  if (!config || typeof config !== "object") return ["config is required"];
  if (typeof config.coupleName !== "string" || config.coupleName.trim() === "") {
    errors.push("coupleName is required");
  }
  if (config.password && config.password.length < 4) {
    errors.push("password must be at least 4 characters");
  }
  if (config.enabledSections && Array.isArray(config.enabledSections)) {
    for (const s of config.enabledSections) {
      if (!PAGE_SECTIONS.includes(/** @type {any} */ (s))) {
        errors.push(`unknown section: ${String(s)}`);
      }
    }
  }
  return errors;
}

/**
 * Build a shareable URL for the public wedding page.
 *
 * @param {string} baseUrl
 * @param {string} [customDomain]
 * @returns {string}
 */
export function buildPublicUrl(baseUrl, customDomain) {
  if (typeof customDomain === "string" && customDomain.trim()) {
    const d = customDomain.trim().toLowerCase().replace(/\/+$/, "");
    return d.startsWith("http") ? d : `https://${d}`;
  }
  return typeof baseUrl === "string" ? baseUrl.replace(/\/+$/, "") : "";
}
