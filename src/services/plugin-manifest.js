/**
 * src/services/plugin-manifest.js — S133 plugin.json validator.
 *
 * Pure validator for the future plugin surface (Phase D4). It checks
 * required fields, semver, hook names, and permission scopes — without
 * loading or executing plugin code.
 */

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;
const ID_RE = /^[a-z0-9][a-z0-9_-]{2,63}$/;

const KNOWN_HOOKS = new Set([
  "section.mount",
  "section.unmount",
  "guest.created",
  "guest.updated",
  "rsvp.submitted",
  "vendor.payment",
  "theme.changed",
  "i18n.locale_changed",
]);

const KNOWN_PERMS = new Set([
  "guests:read",
  "guests:write",
  "vendors:read",
  "vendors:write",
  "tables:read",
  "tables:write",
  "messages:send",
  "storage:read",
  "storage:write",
  "settings:read",
]);

/**
 * Validate a plugin manifest object.
 * @param {unknown} m
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validatePluginManifest(m) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];
  if (!m || typeof m !== "object") return { ok: false, errors: ["not_object"], warnings };

  const o = /** @type {Record<string, unknown>} */ (m);

  if (typeof o.id !== "string" || !ID_RE.test(o.id)) errors.push("invalid_id");
  if (typeof o.name !== "string" || o.name.length === 0) errors.push("missing_name");
  if (typeof o.version !== "string" || !SEMVER_RE.test(o.version)) errors.push("invalid_version");
  if (typeof o.entry !== "string" || !o.entry.endsWith(".js")) errors.push("invalid_entry");
  if (o.author !== undefined && typeof o.author !== "string") errors.push("invalid_author");
  if (o.homepage !== undefined && typeof o.homepage !== "string") errors.push("invalid_homepage");

  const hooks = Array.isArray(o.hooks) ? o.hooks : [];
  if (!Array.isArray(o.hooks)) errors.push("hooks_must_be_array");
  for (const h of hooks) {
    if (typeof h !== "string") errors.push("hook_not_string");
    else if (!KNOWN_HOOKS.has(h)) warnings.push(`unknown_hook:${h}`);
  }

  const perms = Array.isArray(o.permissions) ? o.permissions : [];
  if (!Array.isArray(o.permissions)) errors.push("permissions_must_be_array");
  for (const p of perms) {
    if (typeof p !== "string") errors.push("permission_not_string");
    else if (!KNOWN_PERMS.has(p)) errors.push(`unknown_permission:${p}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Returns the static set of hooks/perms accepted by the validator. */
export function manifestSchemaInfo() {
  return {
    hooks: Array.from(KNOWN_HOOKS),
    permissions: Array.from(KNOWN_PERMS),
  };
}
