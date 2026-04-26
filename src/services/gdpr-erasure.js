/**
 * src/services/gdpr-erasure.js — GDPR right-to-erasure service (Sprint 86)
 *
 * `eraseGuest` nullifies all PII fields for a given guest record in Supabase
 * and appends an immutable audit log entry.  The guest row is retained (for
 * referential integrity) but is stripped of personal data.
 */

/** @typedef {import("@supabase/supabase-js").SupabaseClient} SupabaseClient */

/**
 * PII columns that must be nullified for GDPR erasure.
 * Derived from data-classification.js PII + sensitive policy.
 */
export const PII_COLUMNS = [
  "first_name",
  "last_name",
  "phone",
  "email",
  "notes",
  "meal_notes",
  "accessibility",
  "gift",
];

/**
 * Erase all PII for a guest.
 * - Sets all PII columns to NULL.
 * - Sets `erased_at` to now (ISO 8601).
 * - Inserts a row into `erasure_log` for audit purposes.
 *
 * @param {SupabaseClient} supabase
 * @param {string} guestId
 * @param {{ requestedBy?: string }} [opts]
 * @returns {Promise<void>}
 */
export async function eraseGuest(supabase, guestId, opts = {}) {
  /** @type {Record<string, null | string>} */
  const nullPatch = Object.fromEntries(PII_COLUMNS.map((c) => [c, null]));
  nullPatch.erased_at = new Date().toISOString();

  const { error: updateError } = await supabase.from("guests").update(nullPatch).eq("id", guestId);
  if (updateError) throw updateError;

  const { error: logError } = await supabase.from("erasure_log").insert({
    entity_type: "guest",
    entity_id: guestId,
    requested_by: opts.requestedBy ?? null,
    erased_at: nullPatch.erased_at,
  });
  if (logError) throw logError;
}

/**
 * Check if a guest has already been erased.
 * @param {SupabaseClient} supabase
 * @param {string} guestId
 * @returns {Promise<boolean>}
 */
export async function isErased(supabase, guestId) {
  const { data, error } = await supabase
    .from("guests")
    .select("erased_at")
    .eq("id", guestId)
    .maybeSingle();
  if (error) throw error;
  return data?.erased_at != null;
}
