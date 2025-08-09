// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildInngestEndpoint(eventKey: string): string {
  return `https://inn.gs/e/${eventKey}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const INNGEST_EVENT_KEY = Deno.env.get('INNGEST_EVENT_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!INNGEST_EVENT_KEY) {
      return new Response(JSON.stringify({ error: 'Missing INNGEST_EVENT_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await req.json();
    const { groupId, imageUrls, groupName, projectId = null, userContext = null } = body || {};

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'imageUrls array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Server-side rate-limit/permission gate to prevent abuse
    const { data: permitted, error: permErr } = await supabase.rpc('validate_user_permission', {
      operation: 'ai_analysis',
      resource_id: projectId ?? null,
    });
    if (permErr || permitted !== true) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded or permission denied' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Insert job
    const { data: jobInsert, error: insertError } = await supabase
      .from('group_analysis_jobs')
      .insert({
        user_id: user.id,
        group_id: groupId ?? null,
        project_id: projectId,
        image_urls: imageUrls,
        status: 'processing',
        progress: 0,
        current_stage: 'queued',
        error: null,
        metadata: { groupName, userContext },
      })
      .select('id')
      .single();

    if (insertError || !jobInsert) {
      console.error('[start-group-ux-analysis] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create job' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const jobId = jobInsert.id as string;

    // Dispatch Inngest event
    const eventEndpoint = buildInngestEndpoint(INNGEST_EVENT_KEY);
    const inngestPayload = {
      name: 'group-ux-analysis/pipeline.started',
      data: {
        jobId,
        userId: user.id,
        groupId: groupId || null,
        projectId,
        imageUrls,
        userContext,
        groupName: groupName || null,
      },
      id: jobId,
      ts: Date.now(),
    };

    const inngestRes = await fetch(eventEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inngestPayload),
    });

    if (!inngestRes.ok) {
      const text = await inngestRes.text();
      console.error('[start-group-ux-analysis] Inngest dispatch failed:', text);

      // Fallback: invoke group-ux-orchestrator directly
      const { error: fallbackErr } = await supabase.functions.invoke('group-ux-orchestrator', {
        body: { jobId }
      });

      if (fallbackErr) {
        // Mark job as failed if fallback also fails
        await supabase
          .from('group_analysis_jobs')
          .update({ status: 'failed', error: `Dispatch failed; fallback error: ${fallbackErr.message ?? 'unknown'}` })
          .eq('id', jobId);

        return new Response(JSON.stringify({ error: 'Failed to dispatch Inngest event and group orchestrator fallback', response: text }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ jobId, fallback: 'group-ux-orchestrator' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Fire-and-forget direct orchestrator as safety net (parallel to Inngest)
    // This ensures progress updates even if Inngest is not configured in this environment
    supabase.functions
      .invoke('group-ux-orchestrator', { body: { jobId } })
      .then(() => console.log('[start-group-ux-analysis] Orchestrator invoked in parallel'))
      .catch((err) => console.error('[start-group-ux-analysis] Orchestrator parallel invoke error:', err));

    return new Response(JSON.stringify({ jobId, dispatch: 'inngest+direct' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    console.error('[start-group-ux-analysis] Unexpected error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
