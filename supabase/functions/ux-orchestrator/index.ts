import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Json = Record<string, unknown>;

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function runPipeline(jobId: string) {
  const supabase = getAdminClient();

  // Kick off context stage
  const ctxRes = await supabase.functions.invoke('ux-context-detection', {
    body: { jobId },
  });
  if (ctxRes.error) {
    // context worker already marks job failed and logs the failure event
    return;
  }

  // Run both vision providers in parallel (continue even if one fails)
  const [openaiRes, googleRes] = await Promise.all([
    supabase.functions.invoke('ux-vision-openai', { body: { jobId } }).catch((e) => ({ error: e })),
    supabase.functions.invoke('ux-vision-google', { body: { jobId } }).catch((e) => ({ error: e })),
  ]);

  // Proceed to AI stage regardless (the AI worker reads whatever vision results exist)
  const aiRes = await supabase.functions.invoke('ux-ai-analysis', {
    body: { jobId },
  });
  if (aiRes.error) {
    // AI worker logs its own failure; stop here
    return;
  }

  // Final synthesis stage
  await supabase.functions.invoke('ux-synthesis', {
    body: { jobId },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    const { jobId } = await req.json().catch(() => ({ jobId: undefined }));
    if (!jobId || typeof jobId !== 'string') {
      return Response.json({ error: "jobId is required" }, { status: 400, headers: corsHeaders });
    }

    // Launch the pipeline asynchronously and return immediately
    try {
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions environment
      EdgeRuntime?.waitUntil?.(runPipeline(jobId)) ?? runPipeline(jobId);
    } catch {
      // Fallback: just run without waitUntil if not available
      runPipeline(jobId);
    }

    return Response.json({ ok: true, jobId, started: true }, { status: 202, headers: corsHeaders });
  } catch (err) {
    console.error('ux-orchestrator fatal', err);
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500, headers: corsHeaders });
  }
});
