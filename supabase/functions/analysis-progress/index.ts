import "https://deno.land/x/xhr@0.4.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-inngest-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const INNGEST_KEY = Deno.env.get("INNGEST_EVENT_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error("Missing Supabase env vars");
    return new Response(JSON.stringify({ error: "Server misconfiguration: SUPABASE_URL or SERVICE_ROLE missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("authorization")?.replace(/Bearer\s+/i, "");
  const incomingKey = req.headers.get("x-inngest-key") || authHeader || "";

  if (!INNGEST_KEY || incomingKey !== INNGEST_KEY) {
    console.warn("Unauthorized analysis-progress call");
    return new Response(JSON.stringify({ error: "Unauthorized: invalid or missing Inngest key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    const body = await req.json();
    const {
      jobId,
      groupJobId,
      eventName,
      stage,
      status,
      progress,
      message,
      error,
      metadata,
    } = body || {};

    if (!jobId && !groupJobId) {
      return new Response(JSON.stringify({ error: "Missing jobId or groupJobId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeProgress = typeof progress === "number" ? Math.max(0, Math.min(100, Math.floor(progress))) : 0;

    let userId: string | null = null;

    if (jobId) {
      // Update analysis_jobs
      const update: Record<string, unknown> = {
        current_stage: stage ?? null,
        status: status ?? null,
        progress: safeProgress,
        error: error ?? null,
        updated_at: new Date().toISOString(),
      };
      if (status === "completed" || status === "failed") {
        update.completed_at = new Date().toISOString();
      }

      const { data: updatedJob, error: updateErr } = await supabase
        .from("analysis_jobs")
        .update(update)
        .eq("id", jobId)
        .select("id,user_id")
        .maybeSingle();

      if (updateErr) {
        console.error("Failed updating analysis_jobs:", updateErr);
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = (updatedJob as any)?.user_id ?? null;

      const { error: insertEvtErr } = await supabase.from("analysis_events").insert({
        job_id: jobId,
        user_id: userId,
        event_name: eventName ?? stage ?? status ?? "progress",
        stage: stage ?? null,
        status: status ?? null,
        progress: safeProgress,
        message: message ?? null,
        metadata: metadata ?? {},
      });

      if (insertEvtErr) {
        console.error("Failed inserting analysis_event:", insertEvtErr);
        // Don't fail the whole request on event insert; just log
      }
    }

    if (groupJobId) {
      // Update group_analysis_jobs
      const update: Record<string, unknown> = {
        current_stage: stage ?? null,
        status: status ?? null,
        progress: safeProgress,
        error: error ?? null,
        updated_at: new Date().toISOString(),
      };
      if (status === "completed" || status === "failed") {
        update.completed_at = new Date().toISOString();
      }

      const { data: updatedJob, error: updateErr } = await supabase
        .from("group_analysis_jobs")
        .update(update)
        .eq("id", groupJobId)
        .select("id,user_id")
        .maybeSingle();

      if (updateErr) {
        console.error("Failed updating group_analysis_jobs:", updateErr);
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = (updatedJob as any)?.user_id ?? null;

      const { error: insertEvtErr } = await supabase.from("analysis_events").insert({
        group_job_id: groupJobId,
        user_id: userId,
        event_name: eventName ?? stage ?? status ?? "progress",
        stage: stage ?? null,
        status: status ?? null,
        progress: safeProgress,
        message: message ?? null,
        metadata: metadata ?? {},
      });

      if (insertEvtErr) {
        console.error("Failed inserting analysis_event (group):", insertEvtErr);
        // Don't fail the whole request on event insert
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("analysis-progress error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
