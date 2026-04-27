/**
 * src/services/photo-gallery.js — S115 Supabase Storage gallery stub.
 *
 * Browser-side helpers for the wedding photo gallery + guest uploads.
 * v1 ships pure utilities (file validation, key/URL builders) and
 * dependency-injected upload/list/delete operations. The actual storage
 * client wiring lands when the `wedding-photos` bucket is provisioned.
 */

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
