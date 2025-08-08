import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Json = Record<string, unknown>;

type GroupJob = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  group_id: string | null;
  status: string | null;
  progress: number | null;
  current_stage: string | null;
  metadata: Json | null;
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
    const groupJobId: string | undefined = body.groupJobId || body.jobId || body.group_job_id;

    if (!groupJobId) {
      return Response.json({ error: "groupJobId (or jobId) is required" }, { status: 400, headers: corsHeaders });
    }

    // Load job
    const { data: job, error: jobErr } = await supabase
      .from("group_analysis_jobs")
      .select("id,user_id,project_id,group_id,status,progress,current_stage,metadata")
      .eq("id", groupJobId)
      .maybeSingle<GroupJob>();

    if (jobErr) return Response.json({ error: jobErr.message }, { status: 500, headers: corsHeaders });
    if (!job) return Response.json({ error: "Group job not found" }, { status: 404, headers: corsHeaders });

    const insertEvent = async (fields: Partial<{ event_name: string; status: string; progress: number; message: string; metadata: Json }>) => {
      const nowISO = new Date().toISOString();
      const eventName = fields.event_name ?? "group-analysis/synthesis.event";
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
          .eq('group_job_id', job.id)
          .eq('event_name', `group-analysis/${stage}.started`)
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
        group_job_id: job.id,
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
      if (error) console.error("group-synthesis: insert event failed", error, payload);
    };

    const startedProgress = Math.max(85, job.progress ?? 0);
    await supabase.from('group_analysis_jobs').update({ current_stage: 'synthesis', status: job.status === 'pending' ? 'processing' : job.status, progress: startedProgress }).eq('id', job.id);

    await insertEvent({ event_name: 'group-analysis/synthesis.started', status: 'processing', progress: startedProgress });

    // Fetch AI results
    const { data: aiRows } = await supabase
      .from('analysis_events')
      .select('metadata, created_at')
      .eq('group_job_id', job.id)
      .eq('event_name', 'group-analysis/ai.completed')
      .order('created_at', { ascending: false })
      .limit(1);
    const ai = aiRows?.[0]?.metadata?.analysis ?? null;

    if (!ai) {
      await insertEvent({ event_name: 'group-analysis/synthesis.failed', status: 'failed', progress: startedProgress, message: 'Missing AI analysis results' });
      return Response.json({ error: 'Missing AI analysis results' }, { status: 400, headers: corsHeaders });
    }

    // Compose final structures from AI output (no placeholders)
    const summaryRaw = (ai as any)?.summary ?? {};
    const summary = { ...summaryRaw, groupJobId: job.id };
    const insights = Array.isArray((ai as any)?.insights) ? (ai as any).insights : [];
    const recommendations = Array.isArray((ai as any)?.recommendations) ? (ai as any).recommendations : [];
    const patterns = (ai as any)?.patterns ?? {};
    const prompt = ((job.metadata as any)?.userContext as string | undefined) ?? '';

    // Persist group analysis
    const { error: insErr } = await supabase
      .from('group_analyses')
      .insert({
        group_id: job.group_id ?? null,
        prompt,
        is_custom: false,
        summary,
        insights,
        recommendations,
        patterns,
        parent_analysis_id: null,
      });

    if (insErr) {
      await insertEvent({ event_name: 'group-analysis/synthesis.failed', status: 'failed', progress: startedProgress, message: insErr.message });
      return Response.json({ error: insErr.message }, { status: 500, headers: corsHeaders });
    }

    const finalProgress = 100;
    await supabase.from('group_analysis_jobs').update({ status: 'completed', current_stage: 'completed', progress: finalProgress, completed_at: new Date().toISOString() }).eq('id', job.id);

    await insertEvent({ event_name: 'group-analysis/completed', status: 'completed', progress: finalProgress });

    return Response.json({ ok: true, groupJobId }, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('group-synthesis fatal', err);
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500, headers: corsHeaders });
  }
});
