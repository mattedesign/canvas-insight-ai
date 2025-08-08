import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Json = Record<string, unknown>;

type Job = {
  id: string;
  user_id: string | null;
  image_url: string;
  status: string | null;
  progress: number | null;
  current_stage: string | null;
};

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    const supabase = getAdminClient();
    const body = await req.json().catch(() => ({} as any));
    const jobId: string | undefined = body.jobId || body.job_id;

    if (!jobId) {
      return Response.json({ error: "jobId is required" }, { status: 400, headers: corsHeaders });
    }

    // Load job
    const { data: job, error: jobErr } = await supabase
      .from("analysis_jobs")
      .select("id,user_id,image_url,status,progress,current_stage")
      .eq("id", jobId)
      .maybeSingle<Job>();

    if (jobErr) {
      console.error("Failed to load job", jobErr);
      return Response.json({ error: jobErr.message }, { status: 500, headers: corsHeaders });
    }
    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404, headers: corsHeaders });
    }

    const insertEvent = async (fields: Partial<{ event_name: string; status: string; progress: number; message: string; metadata: Json }>) => {
      const nowISO = new Date().toISOString();
      const eventName = fields.event_name ?? "analysis/vision.event";
      const stage = (eventName.split('/')[1] || '').split('.')[0] || 'vision';
      const provider = (fields.metadata as any)?.provider;
      let started_at: string | null = null;
      let ended_at: string | null = null;
      let duration_ms: number | null = null;

      if (eventName.endsWith('.started') || fields.status === 'processing') {
        started_at = nowISO;
      }
      if (
        eventName.endsWith('.completed') ||
        eventName.endsWith('.failed') ||
        fields.status === 'completed' ||
        fields.status === 'failed'
      ) {
        ended_at = nowISO;
        let query: any = supabase
          .from('analysis_events')
          .select('id, started_at, created_at')
          .eq('job_id', job.id)
          .eq('event_name', `analysis/${stage}.started`)
          .order('created_at', { ascending: false })
          .limit(1);
        if (provider) {
          query = query.contains('metadata', { provider });
        }
        const { data: startRows } = await query;
        const startAt = startRows?.[0]?.started_at || startRows?.[0]?.created_at || null;
        if (startAt) {
          started_at = started_at ?? startAt;
          duration_ms = new Date(ended_at).getTime() - new Date(startAt).getTime();
        }
      }

      const payload: any = {
        id: crypto.randomUUID(),
        job_id: job.id,
        user_id: job.user_id,
        event_name: eventName,
        stage,
        status: fields.status ?? null,
        progress: fields.progress ?? 0,
        message: fields.message ?? null,
        metadata: fields.metadata ?? {},
        started_at,
        ended_at,
        duration_ms,
      };
      const { error } = await supabase.from("analysis_events").insert(payload);
      if (error) console.error("Failed to insert analysis_event", error, payload);
    };

    const markProviderDone = async (provider: string) => {
      const { data, error } = await supabase
        .from("analysis_events")
        .select("id")
        .eq("job_id", job.id)
        .in("event_name", ["analysis/vision.completed", "analysis/vision.failed"]) 
        .contains("metadata", { provider }) as any;
      if (error) {
        console.warn("check provider done error", error);
        return false;
      }
      return Array.isArray(data) && data.length > 0;
    };

    // Start event and stage
    const startedProgress = Math.max(30, job.progress ?? 0);
    await supabase
      .from("analysis_jobs")
      .update({ current_stage: "vision", status: job.status === "pending" ? "processing" : job.status, progress: startedProgress })
      .eq("id", job.id);

    await insertEvent({ event_name: "analysis/vision.started", status: "processing", progress: startedProgress, metadata: { provider: "google" } });

    // Call existing google-vision-metadata function
    let gData: any = null;
    let gErr: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase.functions.invoke('google-vision-metadata', { body: { imageUrl: job.image_url } });
      gData = data; gErr = error;
      if (!gErr) break;
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }

    if (gErr) {
      await insertEvent({ event_name: "analysis/vision.failed", status: "failed", progress: startedProgress, message: gErr.message ?? 'Google Vision failed', metadata: { provider: 'google' } });
      return Response.json({ error: gErr.message ?? 'Google Vision failed' }, { status: 502, headers: corsHeaders });
    }

    const completedProgress = Math.max(55, startedProgress);
    await insertEvent({ event_name: "analysis/vision.completed", status: "completed", progress: completedProgress, metadata: { provider: "google", result: gData ?? null } });

    // If both providers done (completed or failed), move to AI stage and dispatch
    const openaiDone = await markProviderDone('openai');
    const googleDone = await markProviderDone('google');

    if (openaiDone && googleDone) {
      await supabase.from('analysis_jobs').update({ current_stage: 'ai', progress: Math.max(completedProgress, 60) }).eq('id', job.id);
      const { data: dispatchData, error: dispatchErr } = await supabase.functions.invoke('inngest-dispatch', {
        body: { name: 'analysis/ai.started', data: { jobId: job.id } }
      });
      if (dispatchErr) {
        await insertEvent({ event_name: 'analysis/ai.dispatch_failed', status: 'warning', progress: completedProgress, message: dispatchErr.message ?? 'Dispatch failed' });
      } else {
        await insertEvent({ event_name: 'analysis/ai.dispatched', status: 'queued', progress: completedProgress, metadata: { response: dispatchData ?? null } });
      }
    }

    return Response.json({ ok: true, jobId: job.id }, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("ux-vision-google fatal", err);
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500, headers: corsHeaders });
  }
});
