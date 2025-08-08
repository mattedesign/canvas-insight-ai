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
  image_urls: string[];
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
    const groupJobId: string | undefined = body.groupJobId || body.jobId || body.group_job_id;

    if (!groupJobId) {
      return Response.json({ error: "groupJobId (or jobId) is required" }, { status: 400, headers: corsHeaders });
    }

    // Load job
    const { data: job, error: jobErr } = await supabase
      .from("group_analysis_jobs")
      .select("id,user_id,project_id,image_urls,status,progress,current_stage")
      .eq("id", groupJobId)
      .maybeSingle<GroupJob>();

    if (jobErr) return Response.json({ error: jobErr.message }, { status: 500, headers: corsHeaders });
    if (!job) return Response.json({ error: "Group job not found" }, { status: 404, headers: corsHeaders });

    const insertEvent = async (fields: Partial<{ event_name: string; status: string; progress: number; message: string; metadata: Json }>) => {
      const nowISO = new Date().toISOString();
      const eventName = fields.event_name ?? "group-analysis/vision.event";
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
          .eq('group_job_id', job.id)
          .eq('event_name', `group-analysis/${stage}.started`)
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
      if (error) console.error("group-vision-openai: insert event failed", error, payload);
    };

    // Start stage
    const startedProgress = Math.max(30, job.progress ?? 0);
    await supabase.from('group_analysis_jobs').update({ current_stage: 'vision', status: job.status === 'pending' ? 'processing' : job.status, progress: startedProgress }).eq('id', job.id);

    await insertEvent({ event_name: 'group-analysis/vision.started', status: 'processing', progress: startedProgress, metadata: { provider: 'openai' } });

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      await insertEvent({ event_name: 'group-analysis/vision.failed', status: 'failed', progress: startedProgress, message: 'OPENAI_API_KEY not configured', metadata: { provider: 'openai' } });
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    const prompt = "For each image, extract concise visual cues: components[], textBlocks[], layoutSummary. Return strict JSON: { images: Array<{ url: string, components: string[], textBlocks: string[], layoutSummary: string }> }.";

    const content: any[] = [{ type: 'text', text: prompt }];
    for (const url of job.image_urls) {
      content.push({ type: 'image_url', image_url: { url } });
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [ { role: 'user', content } ],
        max_tokens: 1200,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) {
      const msg = `OpenAI API error: ${resp.status}`;
      await insertEvent({ event_name: 'group-analysis/vision.failed', status: 'failed', progress: startedProgress, message: msg, metadata: { provider: 'openai' } });
      return Response.json({ error: msg }, { status: 502, headers: corsHeaders });
    }

    const data = await resp.json();
    let parsed: Json | null = null;
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
    } catch (e) {
      await insertEvent({ event_name: 'group-analysis/vision.failed', status: 'failed', progress: startedProgress, message: 'Failed to parse OpenAI response', metadata: { provider: 'openai' } });
      return Response.json({ error: 'Failed to parse OpenAI response' }, { status: 500, headers: corsHeaders });
    }

    const completedProgress = Math.max(45, startedProgress);
    await insertEvent({ event_name: 'group-analysis/vision.completed', status: 'completed', progress: completedProgress, metadata: { provider: 'openai', result: parsed } });

    return Response.json({ ok: true, groupJobId }, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('group-vision-openai fatal', err);
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500, headers: corsHeaders });
  }
});
