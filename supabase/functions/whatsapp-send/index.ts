/**
 * supabase/functions/whatsapp-send/index.ts
 * Phase 10.1 — WhatsApp Cloud API Edge Function
 *
 * Proxies WhatsApp Cloud API v20 message sends, keeping the access token
 * server-side. Supports text and pre-registered template messages.
 *
 * Env vars required:
 *   WA_ACCESS_TOKEN  — WhatsApp Cloud API permanent / system-user token
 *   WA_PHONE_NUMBER_ID — sender phone number ID (from Meta Business)
 *
 * POST /functions/v1/whatsapp-send
 * Body:
 *   { to: string, text: string }                          // free-form text
 *   { to: string, template: string, lang?: string,        // template message
 *     params?: string[] }
 */

import { handlePreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";

const WA_API_VERSION = "v20.0";
const WA_API_BASE    = `https://graph.facebook.com/${WA_API_VERSION}`;

// ── Message builders ──────────────────────────────────────────────────────

interface TextBody {
  to: string;
  text: string;
  template?: undefined;
}

interface TemplateBody {
  to: string;
  template: string;
  lang?: string;
  params?: string[];
  text?: undefined;
}

type SendBody = TextBody | TemplateBody;

function buildTextPayload(to: string, text: string) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: text },
  };
}

function buildTemplatePayload(
  to: string,
  templateName: string,
  lang: string,
  params: string[],
) {
  const components =
    params.length > 0
      ? [
          {
            type: "body",
            parameters: params.map((p) => ({ type: "text", text: String(p) })),
          },
        ]
      : [];

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: lang },
      components,
    },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const accessToken  = Deno.env.get("WA_ACCESS_TOKEN");
  const phoneNumId   = Deno.env.get("WA_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumId) {
    return errorResponse("WhatsApp Cloud API not configured", 503);
  }

  let body: SendBody;
  try {
    body = (await req.json()) as SendBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const to = String(body.to ?? "").replace(/\D/g, "");
  if (!to || to.length < 7) {
    return errorResponse("Invalid 'to' phone number", 400);
  }

  let payload: Record<string, unknown>;

  if (body.template) {
    // Template message
    const lang   = String(body.lang ?? "he");
    const params = Array.isArray(body.params) ? body.params.map(String) : [];
    payload = buildTemplatePayload(to, body.template, lang, params);
  } else if (body.text) {
    // Free-text message — must be within 24 h session window
    const text = String(body.text).slice(0, 4096);
    payload = buildTextPayload(to, text);
  } else {
    return errorResponse("Provide either 'text' or 'template'", 400);
  }

  const url = `${WA_API_BASE}/${phoneNumId}/messages`;
  let waRes: Response;
  try {
    waRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`WA API fetch error: ${msg}`, 502);
  }

  const data = await waRes.json();
  if (!waRes.ok) {
    return jsonResponse({ ok: false, waError: data }, waRes.status);
  }

  return jsonResponse({ ok: true, messageId: (data as { messages?: Array<{ id: string }> }).messages?.[0]?.id });
});
