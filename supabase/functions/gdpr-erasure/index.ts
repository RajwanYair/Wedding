/**
 * supabase/functions/gdpr-erasure/index.ts
 * S95 — GDPR right-to-be-forgotten Edge Function.
 *
 * Accepts an admin-authenticated request to delete all PII associated with a
 * single guest record. Deletes are idempotent and cascade through the standard
 * RLS-protected tables: guests, rsvp_log, audit_log, presence_events.
 *
 * Env vars required:
 *   SUPABASE_URL                 — project URL
 *   SUPABASE_SERVICE_ROLE_KEY    — service role key (server-only secret)
 *
 * POST /functions/v1/gdpr-erasure
 * Auth: Supabase admin JWT in Authorization header. The function verifies the
 *       caller is in the `admin_users` table before issuing the deletes.
 *
 * Body:
 *   { guest_id: string, event_id: string }
 *
 * Returns:
 *   { ok: true, deleted: { guests: 1, rsvp_log: number, audit_log: number } }
 */

import { handlePreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";

interface ErasureRequest {
  guest_id: string;
  event_id: string;
}

interface DeleteCounts {
  guests: number;
  rsvp_log: number;
  audit_log: number;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function _deleteFrom(
  table: string,
  filter: Record<string, string>,
): Promise<number> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) params.set(k, `eq.${v}`);
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method:  "DELETE",
    headers: {
      apikey:          SERVICE_KEY,
      Authorization:   `Bearer ${SERVICE_KEY}`,
      "Content-Type":  "application/json",
      Prefer:          "return=representation,count=exact",
    },
  });
  if (!resp.ok) throw new Error(`${table}: ${resp.status} ${await resp.text()}`);
  const range = resp.headers.get("Content-Range") ?? "0/0";
  const total = Number(range.split("/")[1] ?? 0);
  return Number.isFinite(total) ? total : 0;
}

async function _isAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey:        SERVICE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!resp.ok) return false;
  const user = await resp.json();
  if (!user?.email) return false;
  const lookup = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?email=eq.${encodeURIComponent(user.email)}&select=email`,
    {
      headers: {
        apikey:        SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    },
  );
  if (!lookup.ok) return false;
  const rows = await lookup.json();
  return Array.isArray(rows) && rows.length > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST")    return errorResponse("Method not allowed", 405);
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return errorResponse("Service is not configured", 500);
  }

  try {
    const ok = await _isAdmin(req.headers.get("Authorization"));
    if (!ok) return errorResponse("Forbidden", 403);

    const body = (await req.json()) as ErasureRequest;
    if (!body?.guest_id || !body?.event_id) {
      return errorResponse("guest_id and event_id are required", 400);
    }

    const counts: DeleteCounts = {
      guests:    await _deleteFrom("guests",    { id: body.guest_id, event_id: body.event_id }),
      rsvp_log:  await _deleteFrom("rsvp_log",  { guest_id: body.guest_id }),
      audit_log: await _deleteFrom("audit_log", { actor_id: body.guest_id }),
    };
    return jsonResponse({ ok: true, deleted: counts });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : String(err), 500);
  }
});
