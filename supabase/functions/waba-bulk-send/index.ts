/**
 * supabase/functions/waba-bulk-send/index.ts
 * S395 — WhatsApp template bulk-send Edge Function
 *
 * Accepts a list of recipients and a template name, fans out individual
 * WhatsApp Cloud API calls server-side, and returns per-recipient results.
 * Rate-limited to 30 sends per invocation to stay within WABA throughput
 * limits; callers should paginate larger batches.
 *
 * Env vars required:
 *   WA_ACCESS_TOKEN      — WhatsApp Cloud API permanent / system-user token
 *   WA_PHONE_NUMBER_ID   — sender phone number ID (from Meta Business)
 *
 * POST /functions/v1/waba-bulk-send
 * Body:
 *   {
 *     recipients: Array<{ to: string, params?: string[] }>,
 *     template: string,    // pre-registered WABA template name
 *     lang?: string        // BCP-47 language code, default "he"
 *   }
 *
 * Response:
 *   {
 *     sent: number,
 *     failed: number,
 *     results: Array<{ to: string, ok: boolean, messageId?: string, error?: string }>
 *   }
 */

import { handlePreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";

const WA_API_VERSION = "v20.0";
const WA_API_BASE    = `https://graph.facebook.com/${WA_API_VERSION}`;
const MAX_BATCH      = 30;

// ── Types ─────────────────────────────────────────────────────────────────

interface Recipient {
  to: string;
  params?: string[];
}

interface BulkBody {
  recipients: Recipient[];
  template: string;
  lang?: string;
}

interface SendResult {
  to: string;
  ok: boolean;
  messageId?: string;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

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
            parameters: params.map((p) => ({ type: "text", text: p })),
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

async function sendOne(
  token: string,
  phoneNumberId: string,
  to: string,
  template: string,
  lang: string,
  params: string[],
): Promise<SendResult> {
  const payload = buildTemplatePayload(to, template, lang, params);
  try {
    const res = await fetch(`${WA_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return { to, ok: false, error: `HTTP ${res.status}: ${errBody}` };
    }
    const data = await res.json() as { messages?: { id: string }[] };
    const messageId = data.messages?.[0]?.id;
    return { to, ok: true, messageId };
  } catch (err) {
    return { to, ok: false, error: String(err) };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const token = Deno.env.get("WA_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WA_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId) {
    return errorResponse("Missing WA_ACCESS_TOKEN or WA_PHONE_NUMBER_ID", 500);
  }

  let body: BulkBody;
  try {
    body = await req.json() as BulkBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { recipients, template, lang = "he" } = body;
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return errorResponse("recipients must be a non-empty array", 400);
  }
  if (!template || typeof template !== "string") {
    return errorResponse("template name is required", 400);
  }
  // Guard against oversized batches
  const batch = recipients.slice(0, MAX_BATCH);

  const results: SendResult[] = await Promise.all(
    batch.map((r) =>
      sendOne(token, phoneNumberId, r.to, template, lang, r.params ?? [])
    ),
  );

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  return jsonResponse({ sent, failed, results });
});
