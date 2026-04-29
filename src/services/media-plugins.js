/**
 * src/services/media-plugins.js — S267 merged: photo gallery + plugin manifest.
 *
 * Merged from:
 *   - photo-gallery.js    (S115) — Supabase Storage gallery stub
 *   - plugin-manifest.js  (S133) — plugin.json validator
 *
 * Pure functions — no DOM, no side effects.
 */

// ────────────────────────────────────────────────────────────
// Re-exported from: photo-gallery.js (S115)
// ────────────────────────────────────────────────────────────

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/avif",
]);

/** 25 MB per upload — enforced client-side; bucket policy enforces server-side. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** @typedef {{ ok: boolean, reason?: string }} ValidationResult */

/**
 * Validate a candidate upload (mime + size).
 * @param {{ name?: string, type?: string, size?: number }} file
 * @returns {ValidationResult}
 */
export function validatePhoto(file) {
  if (!file) return { ok: false, reason: "missing_file" };
  if (typeof file.type !== "string" || !ALLOWED_MIME.has(file.type)) {
    return { ok: false, reason: "unsupported_mime" };
  }
  if (typeof file.size !== "number" || file.size <= 0) {
    return { ok: false, reason: "empty_file" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "too_large" };
  }
  return { ok: true };
}

/**
 * Build a stable, collision-free storage key for a photo.
 * Format: `events/<eventId>/<yyyy>/<mm>/<uploaderId>__<basename>`.
 *
 * @param {{ eventId: string, uploaderId: string, filename: string, now?: Date }} args
 */
export function buildPhotoKey({ eventId, uploaderId, filename, now }) {
  if (!eventId || !uploaderId || !filename) {
    throw new Error("buildPhotoKey: eventId, uploaderId, filename required");
  }
  const d = now ?? new Date();
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const safe = filename
    .normalize("NFKD")
    .replace(/[^\w.-]/g, "_")
    .slice(0, 80);
  return `events/${eventId}/${yyyy}/${mm}/${uploaderId}__${safe}`;
}

/**
 * Upload a photo via the injected storage client (matches the Supabase
 * Storage `from(bucket).upload(key, file)` API surface).
 *
 * @param {{ name: string, type: string, size: number }} file
 * @param {{ eventId: string, uploaderId: string }} ctx
 * @param {{ upload(key: string, file: object): Promise<{data?: any, error?: any}> }} client
 * @returns {Promise<{ ok: boolean, key?: string, error?: string }>}
 */
export async function uploadPhoto(file, ctx, client) {
  const v = validatePhoto(file);
  if (!v.ok) return { ok: false, error: v.reason };
  if (!client?.upload) return { ok: false, error: "no_client" };
  const key = buildPhotoKey({
    eventId: ctx.eventId,
    uploaderId: ctx.uploaderId,
    filename: file.name,
  });
  try {
    const res = await client.upload(key, file);
    if (res?.error) {
      return { ok: false, error: String(res.error?.message ?? res.error) };
    }
    return { ok: true, key };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ────────────────────────────────────────────────────────────
// Re-exported from: plugin-manifest.js (S133)
// ────────────────────────────────────────────────────────────

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
