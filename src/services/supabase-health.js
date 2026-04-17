/**
 * src/services/supabase-health.js — Supabase health checker (Sprint 79)
 *
 * Lightweight ping utilities to validate Supabase connectivity.
 * Zero runtime deps — uses only the Supabase JS client provided by the caller.
 */

/**
 * @typedef {{ ok: boolean, latencyMs: number, error?: string }} HealthResult
 * @typedef {{ ok: boolean, latencyMs: number, tables: Record<string, boolean>, error?: string }} HealthReport
 */

/** Tables considered critical for normal operation. */
const CRITICAL_TABLES = ["guests", "tables", "vendors", "expenses"];

/**
 * Perform a fast health check (single row select from `guests`).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @returns {Promise<HealthResult>}
 */
export async function checkSupabaseHealth(supabase) {
  const start = Date.now();
  try {
    const { error } = await supabase
      .from("guests")
      .select("id")
      .limit(1);
    const latencyMs = Date.now() - start;
    if (error) {
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: true, latencyMs };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: String(err) };
  }
}

/**
 * Detailed health report — checks every critical table.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @returns {Promise<HealthReport>}
 */
export async function getHealthReport(supabase) {
  const start = Date.now();
  /** @type {Record<string, boolean>} */
  const tables = {};
  let overallOk = true;
  let firstError;

  await Promise.all(
    CRITICAL_TABLES.map(async (table) => {
      try {
        const { error } = await supabase.from(table).select("id").limit(1);
        tables[table] = !error;
        if (error && !firstError) {
          firstError = error.message;
          overallOk = false;
        }
      } catch (err) {
        tables[table] = false;
        if (!firstError) {
          firstError = String(err);
          overallOk = false;
        }
      }
    })
  );

  const latencyMs = Date.now() - start;
  const report = { ok: overallOk, latencyMs, tables };
  if (firstError) report.error = firstError;
  return report;
}
