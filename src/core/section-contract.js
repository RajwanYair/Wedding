/**
 * src/core/section-contract.js — Section lifecycle contract helpers (Sprint 11)
 *
 * Provides:
 *  - SECTION_CAPABILITIES: well-known capability keys
 *  - validateSectionModule(name, mod): runtime validation of section shape
 *  - buildCapabilityMap(): derive capability metadata from loaded sections
 *
 * Used by section-resolver.js at load-time and scripts/validate-sections.mjs
 * at build/CI time.
 */

// ── Known capabilities ────────────────────────────────────────────────────

/**
 * Well-known section capability keys.
 * Matches the `SectionCapabilities` interface in types.d.ts.
 * @type {Readonly<Record<string, string>>}
 */
export const SECTION_CAPABILITIES = /** @type {const} */ ({
  OFFLINE: "offline",
  PUBLIC: "public",
  PRINTABLE: "printable",
  SHORTCUTS: "shortcuts",
  ANALYTICS: "analytics",
});

// ── Validation ────────────────────────────────────────────────────────────

/**
 * Validate that a section module conforms to the section contract.
 *
 * A valid section module must:
 *  - export `mount` as a function
 *  - export `unmount` as a function
 *  - if it exports `capabilities`, it must be a plain object
 *
 * @param {string} name   Section name (for error messages)
 * @param {unknown} mod   The imported module object
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateSectionModule(name, mod) {
  const errors = /** @type {string[]} */ ([]);

  if (!mod || typeof mod !== "object") {
    errors.push(`${name}: module is not an object`);
    return { ok: false, errors };
  }

  const m = /** @type {Record<string, unknown>} */ (mod);

  if (typeof m.mount !== "function") {
    errors.push(`${name}: missing or non-function export "mount"`);
  }
  if (typeof m.unmount !== "function") {
    errors.push(`${name}: missing or non-function export "unmount"`);
  }
  if ("capabilities" in m && (typeof m.capabilities !== "object" || m.capabilities === null || Array.isArray(m.capabilities))) {
    errors.push(`${name}: "capabilities" must be a plain object`);
  }
  if ("capabilities" in m && typeof m.capabilities === "object" && m.capabilities !== null) {
    const caps = /** @type {Record<string, unknown>} */ (m.capabilities);
    const validKeys = new Set(Object.values(SECTION_CAPABILITIES));
    for (const key of Object.keys(caps)) {
      if (!validKeys.has(key)) {
        errors.push(`${name}: unknown capability key "${key}" (valid: ${[...validKeys].join(", ")})`);
      }
      if (typeof caps[key] !== "boolean") {
        errors.push(`${name}: capability "${key}" must be boolean`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

// ── Capability map builder ────────────────────────────────────────────────

/**
 * Build a flat capability lookup from a map of section name → module.
 *
 * Returns a map of: capability-key → Set<section-name>
 *
 * @param {Record<string, { capabilities?: Record<string, boolean> }>} sections
 * @returns {Map<string, Set<string>>}
 */
export function buildCapabilityMap(sections) {
  /** @type {Map<string, Set<string>>} */
  const map = new Map();

  for (const [name, mod] of Object.entries(sections)) {
    if (!mod.capabilities) continue;
    for (const [cap, enabled] of Object.entries(mod.capabilities)) {
      if (!enabled) continue;
      if (!map.has(cap)) map.set(cap, new Set());
      /** @type {Set<string>} */ (map.get(cap)).add(name);
    }
  }

  return map;
}

/**
 * Return a list of section names that declare a given capability.
 *
 * @param {Map<string, Set<string>>} capMap  Result of buildCapabilityMap()
 * @param {string} capability               One of SECTION_CAPABILITIES values
 * @returns {string[]}
 */
export function getSectionsWithCapability(capMap, capability) {
  return [...(capMap.get(capability) ?? [])];
}
