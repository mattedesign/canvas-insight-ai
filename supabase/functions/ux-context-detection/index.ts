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
  user_context: string | null;
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
      .select("id,user_id,image_url,user_context,status,progress,current_stage")
      .eq("id", jobId)
      .maybeSingle<Job>();

    if (jobErr) {
      console.error("Failed to load job", jobErr);
      return Response.json({ error: jobErr.message }, { status: 500, headers: corsHeaders });
    }
    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404, headers: corsHeaders });
    }

    // Mark stage started and log event
    const startedProgress = Math.max(5, job.progress ?? 0);
    const { error: updErr } = await supabase
      .from("analysis_jobs")
      .update({ current_stage: "context", status: job.status === "pending" ? "processing" : job.status, progress: startedProgress })
      .eq("id", job.id);
    if (updErr) {
      console.error("Failed to update job stage", updErr);
      return Response.json({ error: updErr.message }, { status: 500, headers: corsHeaders });
    }

    const insertEvent = async (fields: Partial<{ event_name: string; status: string; progress: number; message: string; metadata: Json }>) => {
      const nowISO = new Date().toISOString();
      const eventName = fields.event_name ?? "analysis/context.event";
      const stage = (eventName.split('/')[1] || '').split('.')[0] || 'context';
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
        const { data: startRows } = await supabase
          .from('analysis_events')
          .select('id, started_at, created_at')
          .eq('job_id', job.id)
          .eq('event_name', `analysis/${stage}.started`)
          .order('created_at', { ascending: false })
          .limit(1);
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

    await insertEvent({ event_name: "analysis/context.started", status: "processing", progress: startedProgress });

    // Invoke existing context-detection worker (vision model)
    const { data: ctxData, error: ctxErr } = await supabase.functions.invoke("context-detection", {
      body: {
        imageUrl: job.image_url,
        prompt: job.user_context ?? "Detect interface context",
        useMetadataMode: true,
        enhancedContextMode: false,
      },
    });

    if (ctxErr) {
      console.error("context-detection failed", ctxErr);
      // Mark job failed and log event — no fallback data
      await supabase
        .from("analysis_jobs")
        .update({ status: "failed", current_stage: "context", progress: startedProgress, error: ctxErr.message ?? "Context detection error" })
        .eq("id", job.id);
      await insertEvent({
        event_name: "analysis/context.failed",
        status: "failed",
        progress: startedProgress,
        message: ctxErr.message ?? "Context detection failed",
      });
      return Response.json({ error: "Context detection failed" }, { status: 502, headers: corsHeaders });
    }

    // Log completion with returned context (lightweight)
    const completedProgress = Math.max(20, startedProgress);
    await insertEvent({
      event_name: "analysis/context.completed",
      status: "completed",
      progress: completedProgress,
      metadata: { context: ctxData ?? null },
    });

    // Advance job state to next stage (vision)
    await supabase
      .from("analysis_jobs")
      .update({ current_stage: "vision", progress: completedProgress })
      .eq("id", job.id);

    // Emit next event via inngest-dispatch
    const { data: dispatchData, error: dispatchErr } = await supabase.functions.invoke("inngest-dispatch", {
      body: {
        name: "analysis/vision.started",
        data: { jobId: job.id },
      },
    });

    if (dispatchErr) {
      console.warn("Failed to dispatch vision.started", dispatchErr);
      await insertEvent({
        event_name: "analysis/vision.dispatch_failed",
        status: "warning",
        progress: completedProgress,
        message: dispatchErr.message ?? "Dispatch failed",
      });
      // Phase 3 will add orchestrator fallback; for now just report
    } else {
      await insertEvent({
        event_name: "analysis/vision.dispatched",
        status: "queued",
        progress: completedProgress,
        metadata: { response: dispatchData ?? null },
      });
    }

    return Response.json(
      { ok: true, jobId: job.id },
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("ux-context-detection fatal", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
