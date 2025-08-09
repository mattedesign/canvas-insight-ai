import { Inngest } from "inngest";
import { serve } from "inngest/next";
import { createClient } from "@supabase/supabase-js";

// Inngest client
export const inngest = new Inngest({ name: "UX Analysis Orchestrator" });

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Vercel env");
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

// Single image: ux-analysis/pipeline.started
export const uxSingle = inngest.createFunction(
  { id: "ux-single-start" },
  { event: "ux-analysis/pipeline.started" },
  async ({ event, step }) => {
    const jobId = (event.data as any)?.jobId || (event as any)?.id;
    if (!jobId) throw new Error("jobId missing in event data");

    const supabase = getAdminClient();
    const { data, error } = await supabase.functions.invoke("ux-orchestrator", {
      body: { jobId },
    });

    if (error) throw error as unknown as Error;
    await step.waitFor("completed-or-failed", {
      event: "analysis/completed", // optional: if you later emit completion events
      if: (e) => (e.data as any)?.jobId === jobId,
      timeout: "5m",
    });
    return { ok: true, invoked: "ux-orchestrator", jobId, data };
  }
);

// Group: group-ux-analysis/pipeline.started
export const uxGroup = inngest.createFunction(
  { id: "ux-group-start" },
  { event: "group-ux-analysis/pipeline.started" },
  async ({ event, step }) => {
    const jobId = (event.data as any)?.jobId || (event as any)?.id;
    if (!jobId) throw new Error("group jobId missing in event data");

    const supabase = getAdminClient();
    const { data, error } = await supabase.functions.invoke("group-ux-orchestrator", {
      body: { groupJobId: jobId },
    });

    if (error) throw error as unknown as Error;
    await step.waitFor("group-completed-or-failed", {
      event: "group-analysis/completed", // optional future event
      if: (e) => (e.data as any)?.jobId === jobId,
      timeout: "15m",
    });
    return { ok: true, invoked: "group-ux-orchestrator", jobId, data };
  }
);

// Vercel serverless entrypoint
export default serve({ client: inngest, functions: [uxSingle, uxGroup] });
