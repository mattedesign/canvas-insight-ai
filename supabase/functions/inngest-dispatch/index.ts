import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// CORS headers for browser access
const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Inngest Events API endpoint (v2)
const INNGEST_EVENTS_ENDPOINT = "https://api.inngest.com/v2/events";

interface EmitEventRequest {
  name: string; // e.g. "analysis/job.created"
  data?: Record<string, unknown>;
  user?: string; // user id (uuid) if applicable
  ts?: string; // ISO timestamp
  id?: string; // optional idempotency key
  environment?: string; // optional; helpful for filtering
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const eventKey = Deno.env.get("INNGEST_EVENT_KEY");
  if (!eventKey) {
    return Response.json(
      {
        success: false,
        error: "INNGEST_EVENT_KEY is not configured in Supabase Edge Function secrets.",
      },
      { status: 500, headers: corsHeaders },
    );
  }

  try {
    if (req.method !== "POST") {
      return Response.json(
        { success: false, error: "Method not allowed" },
        { status: 405, headers: corsHeaders },
      );
    }

    const body = (await req.json()) as EmitEventRequest | { events: EmitEventRequest[] };

    // Support both single event and batch shape
    const events: EmitEventRequest[] = Array.isArray((body as any).events)
      ? (body as any).events
      : [body as EmitEventRequest];

    // Basic validation
    for (const ev of events) {
      if (!ev || typeof ev.name !== "string" || ev.name.trim().length === 0) {
        return Response.json(
          { success: false, error: "Invalid event: 'name' is required" },
          { status: 400, headers: corsHeaders },
        );
      }
    }

    // Build payload for Inngest v2 API
    const payload = {
      events: events.map((ev) => ({
        name: ev.name,
        data: ev.data ?? {},
        user: ev.user,
        ts: ev.ts ?? new Date().toISOString(),
        id: ev.id,
      })),
    };

    const res = await fetch(INNGEST_EVENTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${eventKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    const maybeJson = (() => {
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    })();

    if (!res.ok) {
      return Response.json(
        {
          success: false,
          status: res.status,
          statusText: res.statusText,
          response: maybeJson,
        },
        { status: res.status, headers: corsHeaders },
      );
    }

    return Response.json(
      { success: true, response: maybeJson },
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("inngest-dispatch error", err);
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
