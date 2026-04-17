/**
 * supabase/functions/csp-report/index.ts
 *
 * Sprint 84 — Supabase Edge Function: receive and log CSP violation reports.
 *
 * Endpoint: POST /functions/v1/csp-report
 * Body: application/csp-report  (CSP Level 2 JSON report)
 *
 * The function:
 *   1. Validates Content-Type and body structure.
 *   2. Strips PII (document-uri query params).
 *   3. Inserts the sanitized report into the `csp_reports` table.
 *   4. Returns 204 No Content on success.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/csp-report") && !ct.includes("application/json")) {
    return new Response("Unsupported Media Type", { status: 415, headers: corsHeaders });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400, headers: corsHeaders });
  }

  const report = (raw as Record<string, unknown>)["csp-report"] as Record<string, unknown> | undefined;
  if (!report || typeof report !== "object") {
    return new Response("Bad Request — missing csp-report key", { status: 400, headers: corsHeaders });
  }

  // Sanitize: remove query params from document-uri to avoid logging PII
  const rawUri = String(report["document-uri"] ?? "");
  const safeUri = rawUri.split("?")[0];

  const sanitized = {
    document_uri:    safeUri,
    blocked_uri:     String(report["blocked-uri"]    ?? ""),
    violated_dir:    String(report["violated-directive"] ?? ""),
    effective_dir:   String(report["effective-directive"] ?? ""),
    original_policy: String(report["original-policy"] ?? ""),
    disposition:     String(report["disposition"]     ?? "enforce"),
    status_code:     Number(report["status-code"]     ?? 0),
    referrer:        String(report["referrer"]        ?? "").split("?")[0],
    reported_at:     new Date().toISOString(),
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabase.from("csp_reports").insert(sanitized);
  if (error) {
    console.error("csp-report insert failed:", error.message);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});
