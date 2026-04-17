// supabase/functions/push-dispatcher/index.ts — Sprint 103
//
// Deno Edge Function: dispatches Web Push notifications to one or more
// subscriber endpoints using the VAPID protocol.
//
// POST /functions/v1/push-dispatcher
// Body: { subscriptions: PushSubscriptionData[], payload: PushPayload }
// Returns: { sent: number, failed: number, errors: string[] }
//
// Environment variables required:
//   VAPID_PUBLIC_KEY  — URL-safe base64 VAPID public key
//   VAPID_PRIVATE_KEY — URL-safe base64 VAPID private key
//   VAPID_SUBJECT     — "mailto:" URL for VAPID contact

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface PushSubKeys {
  p256dh: string;
  auth:   string;
}

interface PushSubscriptionData {
  endpoint:       string;
  keys:           PushSubKeys;
  expirationTime: number | null;
}

interface PushPayload {
  title:  string;
  body?:  string;
  icon?:  string;
  badge?: string;
  tag?:   string;
  data?:  Record<string, unknown>;
}

interface DispatchRequest {
  subscriptions: PushSubscriptionData[];
  payload:       PushPayload;
}

interface DispatchResult {
  sent:   number;
  failed: number;
  errors: string[];
}

// ── VAPID helpers ─────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function buildVapidJWT(
  audience: string,
  subject: string,
  publicKeyB64: string,
  privateKeyB64: string,
): Promise<string> {
  const header  = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payload = btoa(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: subject,
  })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const unsigned = `${header}.${payload}`;

  const privateKeyBytes = urlBase64ToUint8Array(privateKeyB64);
  const key = await crypto.subtle.importKey(
    "raw",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${unsigned}.${sigB64}`;
}

// ── Individual push dispatch ──────────────────────────────────────────────

async function sendOnePush(
  sub: PushSubscriptionData,
  payloadJson: string,
  vapidJWT: string,
  vapidPublicKey: string,
): Promise<void> {
  const resp = await fetch(sub.endpoint, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/octet-stream",
      "Authorization": `vapid t=${vapidJWT},k=${vapidPublicKey}`,
      "TTL":           "86400",
    },
    body: new TextEncoder().encode(payloadJson),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Push failed (${resp.status}): ${text.slice(0, 200)}`);
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const vapidPublicKey  = Deno.env.get("VAPID_PUBLIC_KEY")  ?? "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const vapidSubject    = Deno.env.get("VAPID_SUBJECT")     ?? "mailto:admin@example.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: DispatchRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { subscriptions = [], payload } = body;

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0, failed: 0, errors: [] }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!payload?.title) {
    return new Response(JSON.stringify({ error: "payload.title is required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const payloadJson = JSON.stringify(payload);
  const result: DispatchResult = { sent: 0, failed: 0, errors: [] };

  for (const sub of subscriptions) {
    try {
      const audience = new URL(sub.endpoint).origin;
      const jwt = await buildVapidJWT(audience, vapidSubject, vapidPublicKey, vapidPrivateKey);
      await sendOnePush(sub, payloadJson, jwt, vapidPublicKey);
      result.sent++;
    } catch (err) {
      result.failed++;
      result.errors.push(String(err instanceof Error ? err.message : err));
    }
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
