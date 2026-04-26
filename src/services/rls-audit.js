/**
 * src/services/rls-audit.js — Row Level Security audit helpers (Sprint 82)
 *
 * Utilities for verifying that RLS is enabled and inspecting policies.
 * All functions accept a Supabase client; they query pg_catalog views via RPC.
 */

/**
 * @typedef {import("@supabase/supabase-js").SupabaseClient} SupabaseClient
 * @typedef {{ tablename: string, rowsecurity: boolean }} RlsTableRow
 * @typedef {{ policyname: string, tablename: string, cmd: string, roles: string[], qual: string, with_check: string }} PolicyRow
 */

/** Tables that MUST have RLS enabled in production. */
export const REQUIRED_RLS_TABLES = [
  "guests",
  "tables",
  "vendors",
  "expenses",
  "contacts",
  "timeline",
  "rsvp_log",
  "events",
];

/**
 * Check whether RLS is enabled on every required table.
 *
 * @param {SupabaseClient} supabase
 * @returns {Promise<{ ok: boolean, missing: string[], tableStatus: Record<string, boolean> }>}
 */
export async function verifyRlsEnabled(supabase) {
  const { data, error } = await supabase.rpc("get_rls_status");
  if (error) throw error;

  /** @type {RlsTableRow[]} */
  const rows = data ?? [];
  /** @type {Record<string, boolean>} */
  const tableStatus = Object.fromEntries(rows.map((r) => [r.tablename, r.rowsecurity]));

  const missing = REQUIRED_RLS_TABLES.filter((t) => !tableStatus[t]);
  return { ok: missing.length === 0, missing, tableStatus };
}

/**
 * List all RLS policies for a given table.
 *
 * @param {SupabaseClient} supabase
 * @param {string} tableName
 * @returns {Promise<PolicyRow[]>}
 */
export async function listPolicies(supabase, tableName) {
  const { data, error } = await supabase.rpc("get_table_policies", {
    p_table: tableName,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * Check that every required table has at least one SELECT policy.
 *
 * @param {SupabaseClient} supabase
 * @returns {Promise<{ ok: boolean, unprotected: string[] }>}
 */
export async function verifySelectPolicies(supabase) {
  const results = await Promise.all(
    REQUIRED_RLS_TABLES.map(async (table) => {
      const policies = await listPolicies(supabase, table);
      const hasSelect = policies.some((p) => p.cmd === "SELECT" || p.cmd === "ALL");
      return { table, hasSelect };
    }),
  );

  const unprotected = results.filter((r) => !r.hasSelect).map((r) => r.table);

  return { ok: unprotected.length === 0, unprotected };
}
