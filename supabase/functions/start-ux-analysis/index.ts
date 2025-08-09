import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS for browser access
const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Inngest short endpoint builder (works in prod): https://inn.gs/e/{EVENT_KEY}
const buildInngestEndpoint = (eventKey: string) => `https://inn.gs/e/${eventKey}`;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
  const eventKey = Deno.env.get("INNGEST_EVENT_KEY");

  if (!supabaseUrl || !supabaseAnon) {
    return Response.json(
      { success: false, error: "Supabase URL/Anon key not configured" },
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

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    // Create a client which forwards the caller's JWT for RLS
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    // Resolve user id from JWT (explicit for clarity)
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user?.id) {
      return Response.json(
        { success: false, error: "Unauthorized: invalid or missing JWT" },
        { status: 401, headers: corsHeaders },
      );
    }
    const userId = userData.user.id;

    const { imageId, imageUrl, projectId, userContext, dispatchMode: rawDispatchMode } = await req.json();
    const dispatchMode = (typeof rawDispatchMode === 'string' && ['inngest','direct','both'].includes(rawDispatchMode))
      ? (rawDispatchMode as 'inngest' | 'direct' | 'both')
      : 'inngest';

    if (!imageId || !imageUrl) {
      return Response.json(
        { success: false, error: "imageId and imageUrl are required" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Server-side permission and rate limit check (blocks overuse)
    const { data: permitted, error: permErr } = await supabase.rpc('validate_user_permission', {
      operation: 'ai_analysis',
      resource_id: projectId ?? null,
    });
    if (permErr || permitted !== true) {
      return Response.json(
        { success: false, error: 'Rate limit exceeded or permission denied' },
        { status: 429, headers: corsHeaders },
      );
    }

    // Insert job (RLS requires auth.uid() = user_id)
    const { data: jobInsert, error: insertErr } = await supabase
      .from("analysis_jobs")
      .insert({
        user_id: userId,
        image_id: imageId,
        image_url: imageUrl,
        project_id: projectId ?? null,
        user_context: userContext ?? null,
        status: "processing",
        progress: 0,
        current_stage: "queued",
        metadata: { dispatchMode },
      })
      .select("id")
      .single();

    if (insertErr || !jobInsert?.id) {
      return Response.json(
        { success: false, error: "Failed to create job", details: insertErr?.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const jobId = jobInsert.id as string;

    // Dispatch according to dispatchMode
    if (dispatchMode === 'direct') {
      const { data: orkData, error: orkErr } = await supabase.functions.invoke('ux-orchestrator', { body: { jobId } });
      if (orkErr) {
        await supabase.from('analysis_jobs').update({ status: 'failed', error: `Direct orchestrator error: ${orkErr.message ?? 'unknown'}` }).eq('id', jobId);
        return Response.json({ success: false, error: 'Direct orchestrator failed' }, { status: 502, headers: corsHeaders });
      }
      return Response.json({ success: true, jobId, dispatch: 'direct' }, { status: 202, headers: corsHeaders });
    }

    if (dispatchMode !== 'direct' && !eventKey) {
      // Fallback: if Inngest event key is not configured, invoke orchestrator directly
      const { error: orkErr } = await supabase.functions.invoke('ux-orchestrator', { body: { jobId } });
      if (orkErr) {
        await supabase.from('analysis_jobs').update({ status: 'failed', error: `Direct orchestrator error (fallback): ${orkErr.message ?? 'unknown'}` }).eq('id', jobId);
        return Response.json({ success: false, error: 'Missing INNGEST_EVENT_KEY and direct orchestrator failed' }, { status: 502, headers: corsHeaders });
      }
      return Response.json({ success: true, jobId, dispatch: 'direct' }, { status: 202, headers: corsHeaders });
    }

    const endpoint = buildInngestEndpoint(eventKey!);
    const eventPayload = {
      name: 'ux-analysis/pipeline.started',
      data: { jobId, imageId, imageUrl, projectId: projectId ?? null, userId, dispatchMode },
      id: jobId,
      ts: Date.now(),
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      await supabase.from('analysis_jobs').update({ status: 'failed', error: `Inngest dispatch failed: ${res.status} ${res.statusText}` }).eq('id', jobId);
      return Response.json({ success: false, error: 'Failed to dispatch Inngest', response: text }, { status: 502, headers: corsHeaders });
    }

    if (dispatchMode === 'both') {
      supabase.functions
        .invoke('ux-orchestrator', { body: { jobId } })
        .then(() => console.log('[start-ux-analysis] Orchestrator invoked (both mode)'))
        .catch((err) => console.error('[start-ux-analysis] Orchestrator invoke error (both mode):', err));
      return Response.json({ success: true, jobId, dispatch: 'inngest+direct' }, { status: 202, headers: corsHeaders });
    }

    return Response.json({ success: true, jobId, dispatch: 'inngest' }, { status: 202, headers: corsHeaders });
  } catch (err) {
    console.error("start-ux-analysis error", err);
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
