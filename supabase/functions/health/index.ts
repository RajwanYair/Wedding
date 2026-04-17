/**
 * supabase/functions/health/index.ts
 * Health check endpoint — returns service version and status.
 *
 * GET /functions/v1/health
 *
 * Response: { status: "ok", version: string, timestamp: string, uptime_ms: number }
 */

import { corsHeaders, handlePreflight, jsonResponse } from "../_shared/cors.ts";

const START_TIME = Date.now();

// Read app version from environment (set in Supabase Dashboard → Functions → Secrets)
const VERSION = Deno.env.get("APP_VERSION") ?? "6.0.0";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handlePreflight();

  if (req.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  return jsonResponse({
    status: "ok",
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - START_TIME,
  });
});
