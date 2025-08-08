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
  image_urls: string[];
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

async function insertEvent(supabase: any, job: GroupJob, fields: Partial<{ event_name: string; status: string; progress: number; message: string; metadata: Json }>) {
  const nowISO = new Date().toISOString();
  const eventName = fields.event_name ?? "group-analysis/event";
  const stage = (eventName.split('/')[1] || '').split('.')[0] || 'group';
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
  if (error) console.error("group-ux-orchestrator: insert event failed", error, payload);
}

async function runPipeline(groupJobId: string) {
  const supabase = getAdminClient();

  // Load job
  const { data: job, error: jobErr } = await supabase
    .from("group_analysis_jobs")
    .select("id,user_id,project_id,group_id,image_urls,status,progress,current_stage,metadata")
    .eq("id", groupJobId)
    .maybeSingle<GroupJob>();

  if (jobErr) throw new Error(jobErr.message);
  if (!job) throw new Error('Group job not found');

  // Context stage: log metadata only (real, not synthesized)
  const startedProgress = Math.max(5, job.progress ?? 0);
  await supabase.from('group_analysis_jobs').update({ current_stage: 'context', status: job.status === 'pending' ? 'processing' : job.status, progress: startedProgress }).eq('id', job.id);
  await insertEvent(supabase, job, { event_name: 'group-analysis/context.started', status: 'processing', progress: startedProgress });

  const contextMeta = {
    groupName: (job.metadata as any)?.groupName ?? null,
    userContext: (job.metadata as any)?.userContext ?? null,
    imageCount: Array.isArray(job.image_urls) ? job.image_urls.length : 0,
    sample: Array.isArray(job.image_urls) ? job.image_urls.slice(0, 3) : [],
  };
  const ctxCompleted = Math.max(15, startedProgress);
  await insertEvent(supabase, job, { event_name: 'group-analysis/context.completed', status: 'completed', progress: ctxCompleted, metadata: { context: contextMeta } });
  await supabase.from('group_analysis_jobs').update({ current_stage: 'vision', progress: ctxCompleted }).eq('id', job.id);

  // Vision stage: run providers in parallel
  const vStart = Math.max(25, ctxCompleted);
  await insertEvent(supabase, job, { event_name: 'group-analysis/vision.started', status: 'processing', progress: vStart });

  const [openaiRes, googleRes] = await Promise.allSettled([
    supabase.functions.invoke('group-vision-openai', { body: { groupJobId: job.id } }),
    supabase.functions.invoke('group-vision-google', { body: { groupJobId: job.id } }),
  ]);

  const vDone = Math.max(55, vStart);
  await insertEvent(supabase, job, { event_name: 'group-analysis/vision.completed', status: 'completed', progress: vDone });
  await supabase.from('group_analysis_jobs').update({ current_stage: 'ai', progress: Math.max(60, vDone) }).eq('id', job.id);

  // AI stage
  const aiRes = await supabase.functions.invoke('group-ai-analysis', { body: { groupJobId: job.id } });
  if ((aiRes as any).error) return; // group-ai-analysis logs its own failure

  // Synthesis
  await supabase.functions.invoke('group-synthesis', { body: { groupJobId: job.id } });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }
    const { groupJobId, jobId } = await req.json().catch(() => ({ }));
    const id = groupJobId || jobId;
    if (!id || typeof id !== 'string') {
      return Response.json({ error: "groupJobId (or jobId) is required" }, { status: 400, headers: corsHeaders });
    }

    try {
      // @ts-ignore
      EdgeRuntime?.waitUntil?.(runPipeline(id)) ?? runPipeline(id);
    } catch {
      runPipeline(id);
    }
    return Response.json({ ok: true, groupJobId: id, started: true }, { status: 202, headers: corsHeaders });
  } catch (err) {
    console.error('group-ux-orchestrator fatal', err);
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500, headers: corsHeaders });
  }
});
