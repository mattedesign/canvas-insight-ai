import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// CORS headers for browser access
const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Inngest short ingest endpoint base (Event Key in path)
const INNGEST_SHORT_BASE = "https://inn.gs/e";

interface EmitEventRequest {
  name: string; // e.g. "analysis/job.created"
  data?: Record<string, unknown>;
  user?: string;
  ts?: string;
  id?: string;
  environment?: string;
}

// Map legacy -> standardized event names
function normalizeEventName(name: string): string {
  const trimmed = name.trim();
  const mappings: Array<[RegExp, string]> = [
    [/^ux-analysis\/pipeline\.started$/i, 'analysis/context.started'],
    [/^group-ux-analysis\/pipeline\.started$/i, 'group-analysis/context.started'],
    [/^ux-analysis\/vision\.started$/i, 'analysis/vision.started'],
    [/^ux-analysis\/vision\.completed$/i, 'analysis/vision.completed'],
    [/^ux-analysis\/ai\.started$/i, 'analysis/ai.started'],
    [/^ux-analysis\/synthesis\.started$/i, 'analysis/synthesis.started'],
    [/^ux-analysis\/completed$/i, 'analysis/completed'],
  ];
  for (const [rx, out] of mappings) {
    if (rx.test(trimmed)) return out;
  }
  return trimmed; // already standardized
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

// Build payload with normalized names
const wireEvents = events.map((ev) => ({
  name: normalizeEventName(ev.name),
  data: ev.data ?? {},
}));
const payload = wireEvents.length === 1 ? wireEvents[0] : wireEvents;

    const endpoint = `${INNGEST_SHORT_BASE}/${eventKey}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
          endpoint,
        },
        { status: res.status, headers: corsHeaders },
      );
    }

    return Response.json(
      { success: true, response: maybeJson, endpoint },
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
