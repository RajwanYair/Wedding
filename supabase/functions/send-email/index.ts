/**
 * supabase/functions/send-email/index.ts — Email Edge Function (Sprint 45)
 *
 * Sends transactional email via the Resend API, keeping the API key
 * server-side.  Accepts a simple JSON body and returns { ok, messageId }.
 *
 * Env vars required:
 *   RESEND_API_KEY   — Resend API key (re_...)
 *   EMAIL_FROM       — verified sender address, e.g. "Wedding App <noreply@mysite.com>"
 *
 * POST /functions/v1/send-email
 * Body:
 *   {
 *     to:      string,          // recipient email address
 *     subject: string,
 *     html?:   string,          // HTML body (at least one of html / text required)
 *     text?:   string,          // plain-text body
 *     replyTo?: string,         // optional reply-to address
 *   }
 *
 * Response:
 *   { ok: true, messageId: string }
 *   { ok: false, error: string }
 */

import { handlePreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";

const RESEND_API = "https://api.resend.com/emails";
const EMAIL_RE   = /^[^\s@]{1,64}@[^\s@]{1,253}$/;

// ── Types ──────────────────────────────────────────────────────────────────

interface SendEmailBody {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

// ── Validation ─────────────────────────────────────────────────────────────

function isValidEmail(addr: unknown): addr is string {
  return typeof addr === "string" && EMAIL_RE.test(addr.trim());
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") {
    return errorResponse("Method Not Allowed", 405);
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: SendEmailBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // ── Input validation ─────────────────────────────────────────────────────
  if (!isValidEmail(body.to)) {
    return errorResponse(`Invalid recipient address: ${body.to}`, 400);
  }
  if (!body.subject?.trim()) {
    return errorResponse("Subject is required", 400);
  }
  if (!body.html && !body.text) {
    return errorResponse("Either html or text body is required", 400);
  }
  if (body.replyTo && !isValidEmail(body.replyTo)) {
    return errorResponse(`Invalid reply-to address: ${body.replyTo}`, 400);
  }

  // ── Config ────────────────────────────────────────────────────────────────
  const apiKey  = Deno.env.get("RESEND_API_KEY");
  const from    = Deno.env.get("EMAIL_FROM") ?? "Wedding App <noreply@example.com>";

  if (!apiKey) {
    return errorResponse("RESEND_API_KEY is not configured", 500);
  }

  // ── Build Resend payload ──────────────────────────────────────────────────
  const payload: Record<string, unknown> = {
    from,
    to: [body.to.trim()],
    subject: body.subject.trim(),
  };
  if (body.html)    payload.html    = body.html;
  if (body.text)    payload.text    = body.text;
  if (body.replyTo) payload.reply_to = body.replyTo.trim();

  // ── Dispatch ──────────────────────────────────────────────────────────────
  let raw: Response;
  try {
    raw = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Network error: ${message}`, 502);
  }

  const data = await raw.json().catch(() => ({}));

  if (!raw.ok) {
    const errMsg = (data as { message?: string }).message ?? `Resend error ${raw.status}`;
    return jsonResponse({ ok: false, error: errMsg }, raw.status);
  }

  return jsonResponse({ ok: true, messageId: (data as { id?: string }).id ?? "" });
});
