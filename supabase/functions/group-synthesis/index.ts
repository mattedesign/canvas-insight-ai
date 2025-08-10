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

// --- Normalization helpers for AI-driven outputs (Option A)
function tryParseJson(text: string): any | null {
  try { return JSON.parse(text); } catch { return null; }
}

function extractJsonSubstring(text: string): string | null {
  // Heuristic: find first '{' and last '}'
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  return null;
}

function normalizeAIGroupOutput(raw: unknown): {
  ok: boolean;
  summary: Record<string, unknown>;
  insights: unknown[];
  recommendations: unknown[];
  patterns: Record<string, unknown>;
  warnings: string[];
  ai_raw: unknown;
} {
  const warnings: string[] = [];
  let obj: any = null;

  if (raw && typeof raw === 'object') {
    obj = raw as any;
  } else if (typeof raw === 'string') {
    const direct = tryParseJson(raw);
    if (direct) {
      obj = direct;
    } else {
      const sub = extractJsonSubstring(raw);
      const parsed = sub ? tryParseJson(sub) : null;
      if (parsed) {
        obj = parsed;
        warnings.push('Parsed JSON from unstructured text');
      } else {
        warnings.push('Could not parse JSON from text content');
      }
    }
  }

  if (!obj || typeof obj !== 'object') {
    return { ok: false, summary: {}, insights: [], recommendations: [], patterns: {}, warnings, ai_raw: raw };
  }

  // Accept several shapes: obj, obj.analysis, obj.data, obj.result
  const candidate = (obj.analysis ?? obj.data ?? obj.result ?? obj) as any;

  const summary = (candidate.summary && typeof candidate.summary === 'object') ? { ...candidate.summary } : {};
  const insights = Array.isArray(candidate.insights) ? candidate.insights : [];
  const recommendations = Array.isArray(candidate.recommendations) ? candidate.recommendations : [];
  const patterns = (candidate.patterns && typeof candidate.patterns === 'object') ? candidate.patterns : {};

  // Type coercions for common fields (no fake defaults)
  if (summary.overallScore != null) {
    const n = Number(summary.overallScore);
    if (Number.isFinite(n)) {
      summary.overallScore = Math.max(0, Math.min(100, n));
    } else {
      warnings.push('summary.overallScore was not numeric');
      delete (summary as any).overallScore;
    }
  }

  if (summary.categoryScores && typeof summary.categoryScores === 'object') {
    const cs: any = summary.categoryScores;
    for (const k of Object.keys(cs)) {
      const n = Number(cs[k]);
      if (Number.isFinite(n)) cs[k] = n; else warnings.push(`categoryScores.${k} was not numeric`);
    }
  }

  const ok = Object.keys(summary).length > 0 || insights.length > 0 || recommendations.length > 0 || Object.keys(patterns).length > 0;
  return { ok, summary, insights, recommendations, patterns, warnings, ai_raw: raw };
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

    // Fetch AI results (lenient) and normalize
    const { data: aiRows } = await supabase
      .from('analysis_events')
      .select('metadata, created_at')
      .eq('group_job_id', job.id)
      .like('event_name', 'group-analysis/ai.%')
      .order('created_at', { ascending: false })
      .limit(1);

    const aiMeta: any = aiRows?.[0]?.metadata ?? null;
    const rawCandidate = aiMeta?.analysis ?? aiMeta?.raw ?? aiMeta?.content ?? aiMeta?.response ?? aiMeta ?? null;

    const norm = normalizeAIGroupOutput(rawCandidate);
    if (!norm.ok) {
      await insertEvent({
        event_name: 'group-analysis/synthesis.failed',
        status: 'failed',
        progress: startedProgress,
        message: 'AI output could not be normalized',
        metadata: {
          reason: 'normalization_failed',
          had_ai_event: !!aiMeta,
          ai_preview: typeof rawCandidate === 'string' ? (rawCandidate as string).slice(0, 500) : (rawCandidate ? 'object' : null)
        }
      });
      await supabase.from('group_analysis_jobs').update({ status: 'failed', current_stage: 'failed', error: 'AI output could not be normalized' }).eq('id', job.id);
      return Response.json({ error: 'AI output could not be normalized' }, { status: 400, headers: corsHeaders });
    }

    // Compose final structures from normalized output (no fabricated values)
    const summary = { ...(norm.summary || {}), groupJobId: job.id } as Record<string, unknown>;
    const insights = Array.isArray(norm.insights) ? norm.insights : [];
    const recommendations = Array.isArray(norm.recommendations) ? norm.recommendations : [];
    const patterns = (norm.patterns && typeof norm.patterns === 'object') ? norm.patterns : {};
    const prompt = ((job.metadata as any)?.userContext as string | undefined) ?? '';

    // Persist group analysis with raw + warnings for auditability
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
        metadata: { groupJobId: job.id, normalization: { warnings: norm.warnings }, ai_raw_output: norm.ai_raw },
      });

    if (insErr) {
      await insertEvent({ event_name: 'group-analysis/synthesis.failed', status: 'failed', progress: startedProgress, message: insErr.message });
      await supabase.from('group_analysis_jobs').update({ status: 'failed', current_stage: 'failed', error: insErr.message }).eq('id', job.id);
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
