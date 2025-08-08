import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnalysisStatusPipeline } from "@/components/AnalysisStatusPipeline";
import { AnalysisJobProgress } from "@/components/AnalysisJobProgress";
import { useAnalysisJob } from "@/hooks/useAnalysisJob";
import { supabase } from "@/integrations/supabase/client";

// Simple SEO helpers per page requirements
const usePageSEO = () => {
  useEffect(() => {
    const title = "Event-driven UX Analysis V2 | UX Analysis Platform";
    document.title = title;

    const desc = "Track event-driven UX analysis pipeline progress in real time.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;
  }, []);
};

export default function AnalysisV2() {
  usePageSEO();
  const [params] = useSearchParams();
  const jobId = params.get("jobId");
  const { job } = useAnalysisJob(jobId);

  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(!!jobId);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [finalResult, setFinalResult] = useState<any | null>(null);
  const [finalLoading, setFinalLoading] = useState<boolean>(false);
  const [finalError, setFinalError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setEvents([]);
      setEventsLoading(false);
      setEventsError(null);
      return;
    }

    let channel: any;
    let mounted = true;

    const load = async () => {
      setEventsLoading(true);
      setEventsError(null);
      const { data, error } = await supabase
        .from('analysis_events')
        .select('id, event_name, status, progress, message, metadata, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      if (!mounted) return;
      if (error) setEventsError(error.message);
      setEvents(Array.isArray(data) ? data : []);
      setEventsLoading(false);
    };

    const subscribe = async () => {
      channel = supabase
        .channel(`analysis-events-${jobId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'analysis_events', filter: `job_id=eq.${jobId}` }, () => {
          load();
        })
        .subscribe();
    };

    load();
    subscribe();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    let mounted = true;
    const loadFinal = async () => {
      if (!jobId || !job || job.status !== 'completed') return;
      setFinalLoading(true);
      setFinalError(null);
      setFinalResult(null);
      const query = supabase
        .from('ux_analyses')
        .select('id, summary, suggestions, visual_annotations, metadata, created_at')
        .eq('user_id', job.user_id)
        .eq('project_id', job.project_id)
        .order('created_at', { ascending: false })
        .limit(1);
      const { data, error } = await query;
      if (!mounted) return;
      if (error) {
        setFinalError(error.message);
      } else {
        setFinalResult(Array.isArray(data) && data.length > 0 ? data[0] : null);
      }
      setFinalLoading(false);
    };

    loadFinal();
    return () => { mounted = false };
  }, [job, jobId]);

  const stages = useMemo(() => {
    const base = [
      { id: "context", name: "Context detection", status: "pending" as const },
      { id: "vision", name: "Vision analysis", status: "pending" as const },
      { id: "ai", name: "AI analysis", status: "pending" as const },
      { id: "synthesis", name: "Synthesis", status: "pending" as const },
      { id: "completed", name: "Finalization", status: "pending" as const },
    ];

    if (!job) return base;

    if (job.status === "completed") {
      return base.map((s) => ({ ...s, status: "completed" as const }));
    }
    if (job.status === "failed") {
      const idx = base.findIndex((s) => job.current_stage?.includes(s.id));
      return base.map((s, i) => {
        if (i < idx) return { ...s, status: "completed" as const };
        if (i === idx) return { ...s, status: "error" as const };
        return s;
      });
    }

    const idx = base.findIndex((s) => job.current_stage?.includes(s.id));
    return base.map((s, i) => {
      if (i < idx) return { ...s, status: "completed" as const };
      if (i === idx) return { ...s, status: "running" as const, progress: job.progress ?? 0 };
      return s;
    });
  }, [job]);

  const overall = useMemo(() => {
    if (!job?.progress) return 0;
    return Math.max(0, Math.min(100, job.progress));
  }, [job?.progress]);

  const isComplete = job?.status === "completed";
  const hasError = job?.status === "failed";

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Event-driven UX Analysis (Analysis V2)</h1>
        <p className="text-sm text-muted-foreground">
          View real-time pipeline status. Provide a jobId query param to monitor a specific job.
        </p>
      </header>

      {!jobId ? (
        <section className="rounded border p-4">
          <p className="text-sm">No job selected. Append ?jobId=&lt;uuid&gt; to the URL to track a job.</p>
        </section>
      ) : (
        <section className="space-y-6">
          <AnalysisStatusPipeline
            stages={stages as any}
            overallProgress={overall}
            isComplete={!!isComplete}
            hasError={!!hasError}
          />

          <AnalysisJobProgress job={job ?? null} />

          <section className="rounded border p-4">
            <h2 className="text-sm font-medium mb-2">Stage events</h2>
            {eventsLoading ? (
              <p className="text-sm text-muted-foreground">Loading events…</p>
            ) : eventsError ? (
              <p className="text-sm text-destructive">Failed to load events: {eventsError}</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="space-y-1">
                {events.map((ev) => (
                  <li key={ev.id} className="text-sm">
                    <span className="font-mono">{new Date(ev.created_at).toLocaleTimeString()}</span>
                    {" · "}<span>{ev.event_name}</span>
                    {ev.status ? <> · <span className="uppercase text-muted-foreground">{ev.status}</span></> : null}
                    {typeof ev.progress === 'number' ? <> · <span>{ev.progress}%</span></> : null}
                    {ev.message ? <> · <span className="text-muted-foreground">{ev.message}</span></> : null}
                  </li>
                ))}
              </ul>
            )}

            {isComplete && (
              <p className="mt-3 text-xs text-muted-foreground">
                Analysis completed. Final results are stored securely; UI retrieval depends on data access policies.
              </p>
            )}
          </section>

          <section className="rounded border p-4">
            <h2 className="text-sm font-medium mb-2">Final results</h2>
            {!isComplete ? (
              <p className="text-sm text-muted-foreground">Pipeline not completed yet.</p>
            ) : finalLoading ? (
              <p className="text-sm text-muted-foreground">Loading final results…</p>
            ) : finalError ? (
              <p className="text-sm text-destructive">Failed to load results: {finalError}</p>
            ) : !finalResult ? (
              <p className="text-sm text-muted-foreground">No final analysis found.</p>
            ) : (
              <article className="space-y-2">
                <div>
                  <h3 className="text-sm font-medium">Summary</h3>
                  <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-auto">{JSON.stringify(finalResult.summary ?? {}, null, 2)}</pre>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Suggestions ({Array.isArray(finalResult.suggestions) ? finalResult.suggestions.length : 0})</h3>
                  <ul className="list-disc pl-5 text-sm">
                    {Array.isArray(finalResult.suggestions) && finalResult.suggestions.slice(0, 10).map((s: any, i: number) => (
                      <li key={i}>{s?.title || s?.id || 'Suggestion'}</li>
                    ))}
                  </ul>
                </div>
              </article>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
