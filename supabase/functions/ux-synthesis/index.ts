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
  image_id: string | null;
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
      .select("id,user_id,project_id,image_id,image_url,status,progress,current_stage")
      .eq("id", jobId)
      .maybeSingle<Job>();

    if (jobErr) return Response.json({ error: jobErr.message }, { status: 500, headers: corsHeaders });
    if (!job) return Response.json({ error: "Job not found" }, { status: 404, headers: corsHeaders });

    const insertEvent = async (fields: Partial<{ event_name: string; status: string; progress: number; message: string; metadata: Json }>) => {
      const nowISO = new Date().toISOString();
      const eventName = fields.event_name ?? "analysis/synthesis.event";
      const stage = (eventName.split('/')[1] || '').split('.')[0] || 'synthesis';
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
    const metadata: Json = { context, synthesisAt: new Date().toISOString(), jobId: job.id };

    // Resolve image_id: prefer job.image_id; fallback to parsing storage_path from public URL
    let imageId: string | null = (job as any)?.image_id ?? null;
    if (!imageId && job.image_url) {
      try {
        const url = new URL(job.image_url);
        const path = url.pathname; // /storage/v1/object/public/images/<storage_path>
        const marker = '/object/public/images/';
        const idx = path.indexOf(marker);
        if (idx !== -1) {
          const storagePath = decodeURIComponent(path.substring(idx + marker.length));
          const { data: imgRow } = await supabase
            .from('images')
            .select('id')
            .eq('storage_path', storagePath)
            .maybeSingle();
          if (imgRow?.id) imageId = imgRow.id as string;
        }
      } catch (_) {
        // ignore parse errors; imageId remains null
      }
    }

    // Persist final UX analysis
    const { error: insErr } = await supabase
      .from('ux_analyses')
      .insert({
        user_id: job.user_id,
        project_id: job.project_id,
        image_id: imageId,
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
