/**
 * supabase/functions/error-receiver/index.ts
 * Receives client-side errors from the Wedding Manager SPA and inserts
 * them into the `error_log` Supabase table.
 *
 * POST /functions/v1/error-receiver
 * Body: { message, stack?, url?, sessionId?, userId?, severity?, context? }
 *
 * Authentication: service role key (bypasses RLS).
 * Rate limiting: max 10 errors per session per minute (tracked in-memory; stateless across instances).
 */

import { handlePreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface ErrorPayload {
  message: string;
  stack?: string;
  url?: string;
  sessionId?: string;
  userId?: string;
  severity?: "low" | "medium" | "high" | "critical";
  context?: Record<string, unknown>;
}

/** Simple in-memory rate limiter: sessionId → [timestamp, count] */
const _rateLimiter = new Map<string, { count: number; resetAt: number }>();

function _isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const entry = _rateLimiter.get(sessionId);
  if (!entry || entry.resetAt < now) {
    _rateLimiter.set(sessionId, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: ErrorPayload;
  try {
    payload = await req.json() as ErrorPayload;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (!payload.message || typeof payload.message !== "string") {
    return errorResponse("message is required", 400);
  }

  const sessionId = payload.sessionId ?? "anonymous";
  if (_isRateLimited(sessionId)) {
    return jsonResponse({ ok: false, reason: "rate_limited" }, 429);
  }

  // Sanitize message length
  const message = String(payload.message).slice(0, 500);
  const stack = payload.stack ? String(payload.stack).slice(0, 2000) : null;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    // If not configured, silently accept (don't leak config info)
    return jsonResponse({ ok: true, stored: false });
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/error_log`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        message,
        stack,
        url: payload.url?.slice(0, 500) ?? null,
        session_id: sessionId.slice(0, 64),
        user_id: payload.userId?.slice(0, 64) ?? null,
        severity: payload.severity ?? "medium",
        context: payload.context ?? null,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("[error-receiver] Supabase insert failed:", resp.status, detail);
      return errorResponse("Failed to store error", 502);
    }

    return jsonResponse({ ok: true, stored: true });
  } catch (err) {
    console.error("[error-receiver] Unexpected error:", err);
    return errorResponse("Internal error", 500);
  }
});
