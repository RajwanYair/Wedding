/**
 * supabase/functions/guest-lookup/index.ts — Sprint 128
 *
 * Deno Edge Function: look up a guest by phone number or id.
 * Used by the public RSVP flow so guests can check in without auth.
 *
 * Request: POST { phone?: string, id?: string }
 * Response: GuestPublic | { error: string }
 *
 * Deploy: supabase functions deploy guest-lookup
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GuestPublic {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  count: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: { phone?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!body.phone && !body.id) {
    return new Response(JSON.stringify({ error: "phone or id required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let query = supabase
    .from("guests")
    .select("id, firstName:first_name, lastName:last_name, status, count")
    .limit(1);

  if (body.id) {
    query = query.eq("id", body.id);
  } else if (body.phone) {
    // Normalise: strip spaces/dashes, ensure +972 prefix for Israeli numbers
    const normalized = body.phone.replace(/[\s\-]/g, "")
      .replace(/^0/, "+972");
    query = query.eq("phone", normalized);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!data || data.length === 0) {
    return new Response(JSON.stringify({ error: "Guest not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const guest: GuestPublic = data[0];
  return new Response(JSON.stringify(guest), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
