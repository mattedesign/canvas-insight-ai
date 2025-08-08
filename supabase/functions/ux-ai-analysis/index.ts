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
      const nowISO = new Date().toISOString();
      const eventName = fields.event_name ?? "analysis/ai.event";
      const stage = (eventName.split('/')[1] || '').split('.')[0] || 'ai';
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

    // Move job to AI stage
    const startedProgress = Math.max(60, job.progress ?? 0);
    await supabase
      .from("analysis_jobs")
      .update({ current_stage: "ai", status: job.status === "pending" ? "processing" : job.status, progress: startedProgress })
      .eq("id", job.id);

    await insertEvent({ event_name: "analysis/ai.started", status: "processing", progress: startedProgress });

    // Fetch latest context
    const { data: ctxRows } = await supabase
      .from("analysis_events")
      .select("metadata, created_at")
      .eq("job_id", job.id)
      .eq("event_name", "analysis/context.completed")
      .order("created_at", { ascending: false })
      .limit(1);
    const context = ctxRows?.[0]?.metadata?.context ?? null;

    // Fetch vision results per provider
    const fetchVision = async (provider: string) => {
      const { data } = await supabase
        .from("analysis_events")
        .select("metadata, created_at")
        .eq("job_id", job.id)
        .eq("event_name", "analysis/vision.completed")
        .contains("metadata", { provider })
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0]?.metadata?.result ?? null;
    };

    const [visionOpenAI, visionGoogle] = await Promise.all([
      fetchVision("openai"),
      fetchVision("google"),
    ]);

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      await insertEvent({ event_name: "analysis/ai.failed", status: "failed", progress: startedProgress, message: "OPENAI_API_KEY not configured" });
      return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500, headers: corsHeaders });
    }

    // Build analysis prompt
    const promptUser = `You are a senior UX analyst. Merge the provided context and vision findings into a structured UX review.
Return JSON with keys: summary(object), suggestions(array of {id, title, description, impact: high|medium|low}), visualAnnotations(array), metadata(object).
Only return valid JSON.`;

    const messages = [
      { role: 'system', content: 'You produce precise, actionable UX analysis as strict JSON.' },
      { role: 'user', content: [
        { type: 'text', text: promptUser },
        { type: 'text', text: `Context:\n${JSON.stringify(context ?? {})}` },
        { type: 'text', text: `Vision (OpenAI):\n${JSON.stringify(visionOpenAI ?? {})}` },
        { type: 'text', text: `Vision (Google):\n${JSON.stringify(visionGoogle ?? {})}` },
      ]},
    ];

    let resp: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages,
            max_tokens: 1400,
            temperature: 0.2,
            response_format: { type: 'json_object' }
          })
        });
        if (resp.ok) break;
      } catch (_) {}
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }

    if (!resp.ok) {
      const msg = `OpenAI API error: ${resp.status}`;
      await insertEvent({ event_name: "analysis/ai.failed", status: "failed", progress: startedProgress, message: msg });
      return Response.json({ error: msg }, { status: 502, headers: corsHeaders });
    }

    const data = await resp.json();
    let parsed: Json | null = null;
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
    } catch (e) {
      await insertEvent({ event_name: "analysis/ai.failed", status: "failed", progress: startedProgress, message: "Failed to parse AI response" });
      return Response.json({ error: 'Failed to parse AI response' }, { status: 500, headers: corsHeaders });
    }

    const completedProgress = Math.max(85, startedProgress);
    await insertEvent({ event_name: "analysis/ai.completed", status: "completed", progress: completedProgress, metadata: { analysis: parsed } });

    await supabase
      .from("analysis_jobs")
      .update({ current_stage: "synthesis", progress: completedProgress })
      .eq("id", job.id);

    // Dispatch synthesis
    const { data: dispatchData, error: dispatchErr } = await supabase.functions.invoke('inngest-dispatch', {
      body: { name: 'analysis/synthesis.started', data: { jobId: job.id } }
    });
    if (dispatchErr) {
      await insertEvent({ event_name: 'analysis/synthesis.dispatch_failed', status: 'warning', progress: completedProgress, message: dispatchErr.message ?? 'Dispatch failed' });
    } else {
      await insertEvent({ event_name: 'analysis/synthesis.dispatched', status: 'queued', progress: completedProgress, metadata: { response: dispatchData ?? null } });
    }

    return Response.json({ ok: true, jobId: job.id }, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("ux-ai-analysis fatal", err);
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500, headers: corsHeaders });
  }
});
