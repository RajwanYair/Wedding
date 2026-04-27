/**
 * supabase/functions/rsvp-webhook/index.ts
 * S95 — Public RSVP webhook for external integrations.
 *
 * Accepts an HMAC-signed RSVP submission from a third party (e.g. a printed
 * QR redirect, email link, or partner site) and inserts it into `rsvp_log`.
 * Does NOT auto-update guest status — admins reconcile via the dashboard.
 *
 * Env vars required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RSVP_WEBHOOK_SECRET  — shared HMAC-SHA256 secret
 *
 * POST /functions/v1/rsvp-webhook
 * Headers: `X-Wedding-Signature: sha256=<hex>`
 * Body:    { event_id, guest_id?, name, phone, status, party_size?, notes? }
 */

import { handlePreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SECRET       = Deno.env.get("RSVP_WEBHOOK_SECRET") ?? "";

interface RsvpPayload {
  event_id:    string;
  guest_id?:   string;
  name:        string;
  phone:       string;
  status:      "confirmed" | "declined" | "pending";
  party_size?: number;
  notes?:      string;
}

async function _verifySignature(raw: string, sig: string): Promise<boolean> {
  if (!sig?.startsWith("sha256=")) return false;
  const expected = sig.slice("sha256=".length);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(raw));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (hex.length !== expected.length) return false;
  // Constant-time compare (length already equal here)
  let diff = 0;
  for (let i = 0; i < hex.length; i++) {
    diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST")    return errorResponse("Method not allowed", 405);
  if (!SUPABASE_URL || !SERVICE_KEY || !SECRET) {
    return errorResponse("Service is not configured", 500);
  }

  const raw = await req.text();
  const sig = req.headers.get("X-Wedding-Signature") ?? "";
  if (!(await _verifySignature(raw, sig))) {
    return errorResponse("Invalid signature", 401);
  }

  let body: RsvpPayload;
  try {
    body = JSON.parse(raw) as RsvpPayload;
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (!body.event_id || !body.name || !body.phone || !body.status) {
    return errorResponse("event_id, name, phone, status required", 400);
  }

  const insert = await fetch(`${SUPABASE_URL}/rest/v1/rsvp_log`, {
    method:  "POST",
    headers: {
      apikey:        SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type":"application/json",
      Prefer:        "return=representation",
    },
    body: JSON.stringify({
      event_id:    body.event_id,
      guest_id:    body.guest_id ?? null,
      name:        body.name,
      phone:       body.phone,
      status:      body.status,
      party_size:  body.party_size ?? 1,
      notes:       body.notes ?? "",
      source:      "webhook",
    }),
  });
  if (!insert.ok) {
    return errorResponse(`Insert failed: ${insert.status} ${await insert.text()}`, 502);
  }
  return jsonResponse({ ok: true });
});
