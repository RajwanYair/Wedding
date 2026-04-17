/**
 * supabase/functions/rsvp-email/index.ts
 * Sends RSVP confirmation emails via the Resend API (free tier: 3K/month).
 *
 * POST /functions/v1/rsvp-email
 * Body: { guestName, guestEmail, status, mealChoice?, weddingDate?, venue? }
 *
 * Requires RESEND_API_KEY secret set in Supabase Dashboard.
 * Falls back to a no-op success if RESEND_API_KEY is not configured.
 */

import { handlePreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "wedding@resend.dev";
const REPLY_TO = Deno.env.get("REPLY_TO_EMAIL") ?? "";

interface RsvpEmailPayload {
  guestName: string;
  guestEmail: string;
  status: "confirmed" | "declined" | "maybe";
  mealChoice?: string;
  weddingDate?: string;
  venue?: string;
  groomName?: string;
  brideName?: string;
}

/** Build the HTML email body for a given RSVP status. */
function _buildEmailHtml(p: RsvpEmailPayload): string {
  const coupleNames =
    p.groomName && p.brideName
      ? `${p.groomName} & ${p.brideName}`
      : "החתן והכלה";

  if (p.status === "confirmed") {
    return `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#7c3aed">✅ אישרת הגעה — ${coupleNames}</h2>
        <p>שלום ${p.guestName},</p>
        <p>תודה שאישרת את הגעתך לחתונה!</p>
        ${p.weddingDate ? `<p><strong>תאריך:</strong> ${p.weddingDate}</p>` : ""}
        ${p.venue ? `<p><strong>מקום:</strong> ${p.venue}</p>` : ""}
        ${p.mealChoice ? `<p><strong>בחירת מנה:</strong> ${p.mealChoice}</p>` : ""}
        <p>נשמח לראותך!</p>
        <hr style="border:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#6b7280;font-size:12px">הודעה אוטומטית ממערכת ניהול החתונה</p>
      </div>`;
  }

  if (p.status === "declined") {
    return `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#6b7280">❌ עדכון RSVP — ${coupleNames}</h2>
        <p>שלום ${p.guestName},</p>
        <p>קיבלנו את עדכונך שלא תוכל/י להגיע. תודה על ההודעה!</p>
        <p>נשמח לחגוג איתך בהזדמנויות נוספות.</p>
        <hr style="border:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#6b7280;font-size:12px">הודעה אוטומטית ממערכת ניהול החתונה</p>
      </div>`;
  }

  // maybe / default
  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
      <h2 style="color:#f59e0b">🤔 עדכון RSVP — ${coupleNames}</h2>
      <p>שלום ${p.guestName},</p>
      <p>תשובתך התקבלה — ציינת שאולי תגיע/י.</p>
      <p>נשמח לקבל אישור סופי בהקדם.</p>
      <hr style="border:1px solid #e5e7eb;margin:24px 0">
      <p style="color:#6b7280;font-size:12px">הודעה אוטומטית ממערכת ניהול החתונה</p>
    </div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: RsvpEmailPayload;
  try {
    payload = await req.json() as RsvpEmailPayload;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (!payload.guestEmail || !payload.guestName || !payload.status) {
    return errorResponse("guestName, guestEmail, and status are required", 400);
  }

  // Validate email format minimally
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.guestEmail)) {
    return errorResponse("Invalid email address", 400);
  }

  if (!["confirmed", "declined", "maybe"].includes(payload.status)) {
    return errorResponse("status must be confirmed, declined, or maybe", 400);
  }

  // If Resend is not configured, silently succeed (RSVP still works without email)
  if (!RESEND_API_KEY) {
    console.warn("[rsvp-email] RESEND_API_KEY not configured — skipping email");
    return jsonResponse({ ok: true, sent: false, reason: "not_configured" });
  }

  const subject =
    payload.status === "confirmed"
      ? `✅ אישור RSVP — ${payload.guestName}`
      : payload.status === "declined"
      ? `❌ עדכון RSVP — ${payload.guestName}`
      : `🤔 עדכון RSVP — ${payload.guestName}`;

  const emailBody: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: [payload.guestEmail],
    subject,
    html: _buildEmailHtml(payload),
  };

  if (REPLY_TO) {
    emailBody.reply_to = REPLY_TO;
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("[rsvp-email] Resend API error:", resp.status, detail);
      return errorResponse("Failed to send email", 502);
    }

    const result = await resp.json();
    return jsonResponse({ ok: true, sent: true, id: (result as { id?: string }).id });
  } catch (err) {
    console.error("[rsvp-email] Unexpected error:", err);
    return errorResponse("Internal error", 500);
  }
});
