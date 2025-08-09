import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// CORS headers
const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-inngest-secret",
};

type Json = Record<string, unknown>;

type InngestEvent = {
  name?: string;
  id?: string;
  jobId?: string;
  groupJobId?: string;
  data?: Record<string, unknown> | null;
};

type IncomingBody = InngestEvent | { events: InngestEvent[] } | null;

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

function extractTargets(ev: InngestEvent) {
  const name = (ev.name || "").trim();
  const data = (ev.data || {}) as Record<string, unknown>;
  const explicitJobId = (ev.jobId as string) || (data["jobId"] as string) || (data["id"] as string) || (ev.id as string);
  const explicitGroupJobId = (ev.groupJobId as string) || (data["groupJobId"] as string);

  if (/^group-ux-analysis\/pipeline\.started$/i.test(name)) {
    return { kind: "group" as const, groupJobId: explicitJobId || explicitGroupJobId };
  }
  if (/^ux-analysis\/pipeline\.started$/i.test(name) || /^analysis\/job\.created$/i.test(name)) {
    // analysis/job.created carries job fields under data
    const jobId = explicitJobId;
    return { kind: "single" as const, jobId };
  }
  // Fallback: if we only have groupJobId provided, treat as group
  if (explicitGroupJobId) return { kind: "group" as const, groupJobId: explicitGroupJobId };
  return { kind: "single" as const, jobId: explicitJobId };
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const configuredSecret = Deno.env.get("INNGEST_WEBHOOK_SECRET");
  if (!configuredSecret) {
    return Response.json(
      { success: false, error: "INNGEST_WEBHOOK_SECRET not configured in Supabase Edge Function secrets" },
      { status: 500, headers: corsHeaders },
    );
  }

  const provided = req.headers.get("x-inngest-secret") || req.headers.get("X-Inngest-Secret");
  if (!provided || provided !== configuredSecret) {
    return Response.json(
      { success: false, error: "Unauthorized: invalid X-Inngest-Secret" },
      { status: 401, headers: corsHeaders },
    );
  }

  if (req.method !== "POST") {
    return Response.json(
      { success: false, error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const body = (await req.json()) as IncomingBody;
    if (!body) {
      return Response.json(
        { success: false, error: "Missing body" },
        { status: 400, headers: corsHeaders },
      );
    }

    const events: InngestEvent[] = Array.isArray((body as any).events)
      ? ((body as any).events as InngestEvent[])
      : [body as InngestEvent];

    const supabase = getAdminClient();

    const results = await Promise.all(
      events.map(async (ev) => {
        const target = extractTargets(ev);
        try {
          if (target.kind === "group") {
            if (!target.groupJobId) throw new Error("groupJobId not found in event payload");
            const { data, error } = await supabase.functions.invoke("group-ux-orchestrator", {
              body: { groupJobId: target.groupJobId },
            });
            if (error) throw error as unknown as Error;
            return { event: ev.name, kind: target.kind, invoked: "group-ux-orchestrator", ok: true, data };
          } else {
            if (!target.jobId) throw new Error("jobId not found in event payload");
            const { data, error } = await supabase.functions.invoke("ux-orchestrator", {
              body: { jobId: target.jobId },
            });
            if (error) throw error as unknown as Error;
            return { event: ev.name, kind: target.kind, invoked: "ux-orchestrator", ok: true, data };
          }
        } catch (e) {
          console.error("[inngest-webhook] invoke error", { event: ev?.name, err: e });
          return { event: ev.name, ok: false, error: e instanceof Error ? e.message : String(e) };
        }
      }),
    );

    const anyOk = results.some((r) => (r as any).ok);
    return Response.json(
      { success: anyOk, results },
      { status: anyOk ? 200 : 500, headers: corsHeaders },
    );
  } catch (err) {
    console.error("[inngest-webhook] fatal error", err);
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
