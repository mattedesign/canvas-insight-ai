import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { FeatureFlagService } from "@/services/FeatureFlagService";
import { AnalysisStatusPipeline } from "@/components/AnalysisStatusPipeline";
import { useGroupAnalysisJob } from "@/hooks/useGroupAnalysisJob";

const usePageSEO = () => {
  useEffect(() => {
    const title = "Group Analysis V2 | UX Analysis Platform";
    document.title = title;
    const desc = "Track group UX analysis pipeline progress and results.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "description"); document.head.appendChild(meta); }
    meta.setAttribute("content", desc);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = window.location.href;
  }, []);
};

export default function GroupAnalysisV2() {
  usePageSEO();
  const [params] = useSearchParams();
  const groupJobId = params.get("groupJobId");
  const { user } = useAuth();
  FeatureFlagService.initialize();
const uiEnabled = FeatureFlagService.isEnabled('new_pipeline_ui', user?.id, user?.email);

  const { job } = useGroupAnalysisJob(groupJobId);

  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(!!groupJobId);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [finalResult, setFinalResult] = useState<any | null>(null);
  const [finalLoading, setFinalLoading] = useState<boolean>(false);
  const [finalError, setFinalError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupJobId) { setEvents([]); setEventsLoading(false); setEventsError(null); return; }
    let channel: any; let mounted = true;
    const load = async () => {
      setEventsLoading(true); setEventsError(null);
      const { data, error } = await supabase
        .from('analysis_events')
        .select('id, event_name, status, progress, message, metadata, created_at, started_at, ended_at, duration_ms')
        .eq('group_job_id', groupJobId)
        .order('created_at', { ascending: true });
      if (!mounted) return;
      if (error) setEventsError(error.message);
      setEvents(Array.isArray(data) ? data : []);
      setEventsLoading(false);
    };
    const subscribe = async () => {
      channel = supabase
        .channel(`group-analysis-events-${groupJobId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'analysis_events', filter: `group_job_id=eq.${groupJobId}` }, () => { load(); })
        .subscribe();
    };
    load(); subscribe();
    return () => { mounted = false; if (channel) supabase.removeChannel(channel); };
  }, [groupJobId]);

  useEffect(() => {
    let mounted = true;
    const loadFinal = async () => {
      if (!groupJobId || !job || job.status !== 'completed' || !job.group_id) return;
      setFinalLoading(true); setFinalError(null); setFinalResult(null);
      const { data, error } = await supabase
        .from('group_analyses')
        .select('id, summary, insights, recommendations, patterns, created_at')
        .eq('group_id', job.group_id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!mounted) return;
      if (error) setFinalError(error.message); else setFinalResult(Array.isArray(data) && data.length > 0 ? data[0] : null);
      setFinalLoading(false);
    };
    loadFinal();
    return () => { mounted = false };
  }, [groupJobId, job]);

  const stages = useMemo(() => {
    const base = [
      { id: 'context', name: 'Context detection', status: 'pending' as const },
      { id: 'vision', name: 'Vision analysis', status: 'pending' as const },
      { id: 'ai', name: 'AI analysis', status: 'pending' as const },
      { id: 'synthesis', name: 'Synthesis', status: 'pending' as const },
      { id: 'completed', name: 'Finalization', status: 'pending' as const },
    ];
    if (!job) return base;
    if (job.status === 'completed') return base.map((s) => ({ ...s, status: 'completed' as const }));
    if (job.status === 'failed') {
      const idx = base.findIndex((s) => job.current_stage?.includes(s.id));
      return base.map((s, i) => {
        if (i < idx) return { ...s, status: 'completed' as const };
        if (i === idx) return { ...s, status: 'error' as const };
        return s;
      });
    }
    const idx = base.findIndex((s) => job.current_stage?.includes(s.id));
    return base.map((s, i) => {
      if (i < idx) return { ...s, status: 'completed' as const };
      if (i === idx) return { ...s, status: 'running' as const, progress: job.progress ?? 0 };
      return s;
    });
  }, [job]);

  const overall = useMemo(() => {
    if (!job?.progress) return 0;
    return Math.max(0, Math.min(100, job.progress));
  }, [job?.progress]);

  const isComplete = job?.status === 'completed';
  const hasError = job?.status === 'failed';

  if (!uiEnabled) {
    return (
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Group Analysis V2</h1>
          <p className="text-sm text-muted-foreground">This feature is not enabled for your account.</p>
        </header>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Group Analysis V2</h1>
        <p className="text-sm text-muted-foreground">Append ?groupJobId=&lt;uuid&gt; to the URL.</p>
      </header>

      {!groupJobId ? (
        <section className="rounded border p-4"><p className="text-sm">No job selected.</p></section>
      ) : (
        <section className="space-y-6">
          <AnalysisStatusPipeline stages={stages as any} overallProgress={overall} isComplete={!!isComplete} hasError={!!hasError} />

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
                    {typeof ev.duration_ms === 'number' ? <> · <span>{(ev.duration_ms / 1000).toFixed(2)}s</span></> : null}
                    {ev.message ? <> · <span className="text-muted-foreground">{ev.message}</span></> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded border p-4">
            <h2 className="text-sm font-medium mb-2">Final results</h2>
            {finalLoading ? (
              <p className="text-sm text-muted-foreground">Loading final results…</p>
            ) : finalError ? (
              <p className="text-sm text-destructive">Failed to load results: {finalError}</p>
            ) : !finalResult ? (
              <p className="text-sm text-muted-foreground">No final group analysis found.</p>
            ) : (
              <article className="space-y-2">
                <div>
                  <h3 className="text-sm font-medium">Summary</h3>
                  <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-auto">{JSON.stringify(finalResult.summary ?? {}, null, 2)}</pre>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Insights ({Array.isArray(finalResult.insights) ? finalResult.insights.length : 0})</h3>
                  <ul className="list-disc pl-5 text-sm">
                    {Array.isArray(finalResult.insights) && finalResult.insights.slice(0, 10).map((s: any, i: number) => (
                      <li key={i}>{s}</li>
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
