/**
 * src/utils/deep-link.js — Sprint 133
 *
 * Parse and build deep-link URLs for the wedding app.
 * Supports: section navigation, guest pre-fill, RSVP flow.
 */

/**
 * @typedef {{ section?: string, guestId?: string, phone?: string,
 *   eventId?: string, action?: string, extra: Record<string, string> }} DeepLinkParams
 */

const KNOWN_SECTIONS = new Set([
  "landing", "rsvp", "guests", "tables", "vendors", "budget",
  "expenses", "analytics", "settings", "checkin", "whatsapp",
  "communication", "gallery", "timeline", "invitation", "dashboard",
  "registry", "contact-collector",
]);

/**
 * Parse a URL (or search-params string) into deep-link params.
 * @param {string | URL} input
 * @returns {DeepLinkParams}
 */
export function parseDeepLink(input) {
  let params;
  try {
    const url = typeof input === "string" && !input.startsWith("http")
      ? new URL(`https://app?${input.replace(/^\?/, "")}`)
      : new URL(String(input));
    params = url.searchParams;
  } catch {
    params = new URLSearchParams();
  }

  /** @type {Record<string, string>} */
  const extra = {};
  for (const [key, value] of params.entries()) {
    if (!["section", "guestId", "phone", "eventId", "action"].includes(key)) {
      extra[key] = value;
    }
  }

  return {
    section: params.get("section") ?? undefined,
    guestId: params.get("guestId") ?? undefined,
    phone:   params.get("phone")   ?? undefined,
    eventId: params.get("eventId") ?? undefined,
    action:  params.get("action")  ?? undefined,
    extra,
  };
}

/**
 * Build a deep-link URL string.
 * @param {string} base  Base URL (e.g. "https://rajwanyair.github.io/Wedding")
 * @param {Partial<Omit<DeepLinkParams, "extra">> & { extra?: Record<string, string> }} opts
 * @returns {string}
 */
export function buildDeepLink(base, opts = {}) {
  const url = new URL(base);
  if (opts.section)  url.searchParams.set("section",  opts.section);
  if (opts.guestId)  url.searchParams.set("guestId",  opts.guestId);
  if (opts.phone)    url.searchParams.set("phone",    opts.phone);
  if (opts.eventId)  url.searchParams.set("eventId",  opts.eventId);
  if (opts.action)   url.searchParams.set("action",   opts.action);
  for (const [key, value] of Object.entries(opts.extra ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * True if the section value is a known app section.
 * @param {string | undefined} section
 * @returns {boolean}
 */
export function isKnownSection(section) {
  return typeof section === "string" && KNOWN_SECTIONS.has(section);
}

/**
 * Validate a parsed deep link for basic correctness.
 * @param {DeepLinkParams} params
 * @returns {string[]} Array of error messages (empty = valid)
 */
export function validateDeepLink(params) {
  const errors = [];
  if (params.section && !isKnownSection(params.section)) {
    errors.push(`Unknown section: ${params.section}`);
  }
  if (params.phone && !/^\+?\d{7,15}$/.test(params.phone)) {
    errors.push(`Invalid phone: ${params.phone}`);
  }
  return errors;
}
