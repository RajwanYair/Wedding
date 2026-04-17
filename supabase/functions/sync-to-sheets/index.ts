/**
 * supabase/functions/sync-to-sheets/index.ts
 * Phase 7.5 — Sheets Mirror Edge Function
 *
 * Receives a JSON payload of { resource, rows } and writes to
 * the corresponding Google Sheets tab via the Sheets API v4.
 * Invoked by the client-side Sheets sync layer.
 *
 * Env vars required:
 *   GOOGLE_SERVICE_ACCOUNT_JSON — service account credentials JSON
 *   SPREADSHEET_ID              — target Google Spreadsheet ID
 *
 * POST /functions/v1/sync-to-sheets
 * Body: { resource: "guests"|"tables"|"vendors"|"expenses", rows: unknown[][] }
 */

import { handlePreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";

// ── Google OAuth helper (service account JWT) ─────────────────────────────

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  function toBase64Url(obj: unknown): string {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  const unsignedToken = `${toBase64Url(header)}.${toBase64Url(payload)}`;

  // Import RSA private key
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`OAuth token error: ${text}`);
  }

  const data = await tokenRes.json() as { access_token: string };
  return data.access_token;
}

// ── Tab name mapping ──────────────────────────────────────────────────────

const RESOURCE_TABS: Record<string, string> = {
  guests: "Guests",
  tables: "Tables",
  vendors: "Vendors",
  expenses: "Expenses",
  rsvp_log: "RSVP_Log",
};

// ── Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  const spreadsheetId = Deno.env.get("SPREADSHEET_ID");

  if (!serviceAccountJson || !spreadsheetId) {
    return errorResponse("Sheets sync not configured", 503);
  }

  let body: { resource?: unknown; rows?: unknown } = {};
  try {
    body = (await req.json()) as { resource?: unknown; rows?: unknown };
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const resource = String(body.resource ?? "");
  const tabName = RESOURCE_TABS[resource];
  if (!tabName) {
    return errorResponse(`Unknown resource: ${resource}`, 400);
  }

  const rows = body.rows;
  if (!Array.isArray(rows)) {
    return errorResponse("rows must be an array", 400);
  }

  try {
    const token = await getAccessToken(serviceAccountJson);

    // Clear existing data then write
    const range = `${tabName}!A1`;
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + "!A:ZZZ")}:clear`;
    const clearRes = await fetch(clearUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (!clearRes.ok) {
      const err = await clearRes.text();
      return errorResponse(`Sheets clear error: ${err}`, 502);
    }

    // Write new data
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
    const writeRes = await fetch(writeUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ range, majorDimension: "ROWS", values: rows }),
    });

    if (!writeRes.ok) {
      const err = await writeRes.text();
      return errorResponse(`Sheets write error: ${err}`, 502);
    }

    const writeData = await writeRes.json() as { updatedCells?: number };
    return jsonResponse({
      ok: true,
      resource,
      rows: rows.length,
      updatedCells: writeData.updatedCells ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Sync failed: ${message}`, 500);
  }
});
