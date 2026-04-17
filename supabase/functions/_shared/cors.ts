/**
 * supabase/functions/_shared/cors.ts
 * Shared CORS headers for all Edge Functions.
 *
 * Usage:
 *   import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
 *   if (req.method === "OPTIONS") return handlePreflight();
 *   return new Response(JSON.stringify(data), { headers: corsHeaders });
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

/** Respond to CORS preflight requests. */
export function handlePreflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/** Wrap a JSON body with CORS headers. */
export function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Wrap an error as a JSON error response. */
export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status);
}
