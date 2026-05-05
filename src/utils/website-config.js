/**
 * src/utils/website-config.js — S632 Wedding website configuration schema
 *
 * Full config schema for the public wedding website builder. Handles
 * defaults, validation, theme mapping, font + colour customisation,
 * and SEO metadata. Works alongside website-preview.js.
 *
 * @module website-config
 * @owner sections
 */

/**
 * @typedef {object} WebsiteSeoConfig
 * @property {string=} title          // page <title>
 * @property {string=} description    // meta description
 * @property {string=} ogImage        // Open Graph image URL
 * @property {boolean=} noIndex       // robots noindex
 */

/**
 * @typedef {object} WebsiteStyleConfig
 * @property {string}  fontFamily      // primary font
 * @property {string}  accentColor     // hex colour
 * @property {string}  backgroundColor // hex colour
 * @property {string}  textColor       // hex colour
 * @property {"ltr"|"rtl"} direction
 */

/**
 * @typedef {object} FullWebsiteConfig
 * @property {string}  coupleName
 * @property {string=} eventDate
 * @property {string=} venueName
 * @property {string=} venueAddress
 * @property {string=} coverImageUrl
 * @property {string=} rsvpUrl
 * @property {string}  theme
 * @property {string=} customDomain
 * @property {string=} password
 * @property {string[]} enabledSections
 * @property {WebsiteStyleConfig} style
 * @property {WebsiteSeoConfig}   seo
 */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Available website themes. */
export const WEBSITE_THEMES = /** @type {const} */ ([
  "classic",
  "modern",
  "rustic",
  "garden",
  "minimal",
]);

/** Default style per theme. */
const THEME_STYLES = /** @type {Record<string, WebsiteStyleConfig>} */ ({
  classic: { fontFamily: "Georgia, serif", accentColor: "#8b6f47", backgroundColor: "#faf7f2", textColor: "#333333", direction: "rtl" },
  modern: { fontFamily: "Inter, sans-serif", accentColor: "#2563eb", backgroundColor: "#ffffff", textColor: "#111827", direction: "rtl" },
  rustic: { fontFamily: "Playfair Display, serif", accentColor: "#7c6a4f", backgroundColor: "#f5efe6", textColor: "#3d3225", direction: "rtl" },
  garden: { fontFamily: "Cormorant, serif", accentColor: "#2d6a4f", backgroundColor: "#f0f9f4", textColor: "#1b4332", direction: "rtl" },
  minimal: { fontFamily: "system-ui, sans-serif", accentColor: "#525252", backgroundColor: "#ffffff", textColor: "#171717", direction: "rtl" },
});

/**
 * Get default style config for a given theme.
 *
 * @param {string} [theme]
 * @returns {WebsiteStyleConfig}
 */
export function getThemeDefaults(theme) {
  // @ts-ignore
  return THEME_STYLES[theme] ?? THEME_STYLES.classic;
}

/**
 * Build a full website config with defaults applied.
 *
 * @param {Partial<FullWebsiteConfig>} partial
 * @returns {FullWebsiteConfig}
 */
export function buildConfig(partial) {
  const theme = WEBSITE_THEMES.includes(/** @type {any} */ (partial?.theme))
    ? partial.theme
    : "classic";
  const themeStyle = getThemeDefaults(theme);
  return {
    coupleName: partial?.coupleName ?? "",
    eventDate: partial?.eventDate,
    venueName: partial?.venueName,
    venueAddress: partial?.venueAddress,
    coverImageUrl: partial?.coverImageUrl,
    rsvpUrl: partial?.rsvpUrl,
    // @ts-ignore
    theme,
    customDomain: partial?.customDomain,
    password: partial?.password,
    enabledSections: Array.isArray(partial?.enabledSections)
      ? partial.enabledSections
      : ["hero", "event-details", "rsvp"],
    style: { ...themeStyle, ...partial?.style },
    seo: { title: partial?.seo?.title, description: partial?.seo?.description, ogImage: partial?.seo?.ogImage, noIndex: partial?.seo?.noIndex ?? false },
  };
}

/**
 * Validate a full website config. Returns error strings (empty = valid).
 *
 * @param {FullWebsiteConfig} config
 * @returns {string[]}
 */
export function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== "object") return ["config is required"];
  if (!config.coupleName?.trim()) errors.push("coupleName is required");
  if (config.style) {
    if (config.style.accentColor && !HEX_RE.test(config.style.accentColor)) {
      errors.push("style.accentColor must be a hex color (#RRGGBB)");
    }
    if (config.style.backgroundColor && !HEX_RE.test(config.style.backgroundColor)) {
      errors.push("style.backgroundColor must be a hex color (#RRGGBB)");
    }
    if (config.style.textColor && !HEX_RE.test(config.style.textColor)) {
      errors.push("style.textColor must be a hex color (#RRGGBB)");
    }
  }
  if (!Array.isArray(config.enabledSections) || config.enabledSections.length === 0) {
    errors.push("at least one section must be enabled");
  }
  if (config.customDomain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(config.customDomain)) {
    errors.push("customDomain format is invalid");
  }
  return errors;
}

/**
 * Generate CSS custom properties string from style config.
 *
 * @param {WebsiteStyleConfig} style
 * @returns {string}
 */
export function styleToCssVars(style) {
  if (!style) return "";
  return [
    `--ws-font-family: ${style.fontFamily};`,
    `--ws-accent: ${style.accentColor};`,
    `--ws-bg: ${style.backgroundColor};`,
    `--ws-text: ${style.textColor};`,
    `--ws-direction: ${style.direction};`,
  ].join("\n");
}
