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
  project_id: string | null;
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
      .select("id,user_id,project_id,image_url,status,progress,current_stage")
      .eq("id", jobId)
      .maybeSingle<Job>();

    if (jobErr) return Response.json({ error: jobErr.message }, { status: 500, headers: corsHeaders });
    if (!job) return Response.json({ error: "Job not found" }, { status: 404, headers: corsHeaders });

    const insertEvent = async (fields: Partial<{ event_name: string; status: string; progress: number; message: string; metadata: Json }>) => {
      const payload: any = {
        id: crypto.randomUUID(),
        job_id: job.id,
        user_id: job.user_id,
        event_name: fields.event_name ?? "analysis/synthesis.event",
        status: fields.status ?? null,
        progress: fields.progress ?? 0,
        message: fields.message ?? null,
        metadata: fields.metadata ?? {},
      };
      const { error } = await supabase.from("analysis_events").insert(payload);
      if (error) console.error("Failed to insert analysis_event", error, payload);
    };

    const startedProgress = Math.max(85, job.progress ?? 0);
    await supabase
      .from("analysis_jobs")
      .update({ current_stage: "synthesis", status: job.status === "pending" ? "processing" : job.status, progress: startedProgress })
      .eq("id", job.id);

    await insertEvent({ event_name: "analysis/synthesis.started", status: "processing", progress: startedProgress });

    // Fetch AI results + context + vision to consolidate
    const { data: aiRows } = await supabase
      .from("analysis_events")
      .select("metadata, created_at")
      .eq("job_id", job.id)
      .eq("event_name", "analysis/ai.completed")
      .order("created_at", { ascending: false })
      .limit(1);
    const ai = aiRows?.[0]?.metadata?.analysis ?? null;

    const { data: ctxRows } = await supabase
      .from("analysis_events")
      .select("metadata, created_at")
      .eq("job_id", job.id)
      .eq("event_name", "analysis/context.completed")
      .order("created_at", { ascending: false })
      .limit(1);
    const context = ctxRows?.[0]?.metadata?.context ?? null;

    if (!ai) {
      await insertEvent({ event_name: "analysis/synthesis.failed", status: "failed", progress: startedProgress, message: "Missing AI analysis results" });
      return Response.json({ error: 'Missing AI analysis results' }, { status: 400, headers: corsHeaders });
    }

    // Compose final structures from AI output (no placeholders)
    const summary = (ai as any)?.summary ?? {};
    const suggestions = Array.isArray((ai as any)?.suggestions) ? (ai as any).suggestions : [];
    const visual_annotations = Array.isArray((ai as any)?.visualAnnotations) ? (ai as any).visualAnnotations : [];
    const metadata: Json = { context, synthesisAt: new Date().toISOString() };

    // Persist final UX analysis
    const { error: insErr } = await supabase
      .from('ux_analyses')
      .insert({
        user_id: job.user_id,
        project_id: job.project_id,
        image_id: null,
        summary,
        suggestions,
        visual_annotations,
        metadata,
        status: 'completed',
        analysis_type: 'full_analysis',
      });

    if (insErr) {
      await insertEvent({ event_name: "analysis/synthesis.failed", status: "failed", progress: startedProgress, message: insErr.message });
      return Response.json({ error: insErr.message }, { status: 500, headers: corsHeaders });
    }

    const finalProgress = 100;
    await supabase
      .from('analysis_jobs')
      .update({ status: 'completed', current_stage: 'completed', progress: finalProgress, completed_at: new Date().toISOString() })
      .eq('id', job.id);

    await insertEvent({ event_name: 'analysis/completed', status: 'completed', progress: finalProgress });

    return Response.json({ ok: true, jobId: job.id }, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("ux-synthesis fatal", err);
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500, headers: corsHeaders });
  }
});
