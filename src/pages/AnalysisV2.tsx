import React, { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AnalysisStatusPipeline } from "@/components/AnalysisStatusPipeline";
import { AnalysisJobProgress } from "@/components/AnalysisJobProgress";
import { useAnalysisJob } from "@/hooks/useAnalysisJob";

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

  const stages = useMemo(() => {
    // Derive simple stage statuses from current job state
    const base = [
      { id: "context-detection", name: "Context detection", status: "pending" as const },
      { id: "vision-analysis", name: "Vision analysis", status: "pending" as const },
      { id: "ai-analysis", name: "AI analysis", status: "pending" as const },
      { id: "synthesis", name: "Synthesis", status: "pending" as const },
      { id: "finalization", name: "Finalization", status: "pending" as const },
    ];

    if (!job) return base;

    if (job.status === "completed") {
      return base.map((s) => ({ ...s, status: "completed" as const }));
    }
    if (job.status === "failed") {
      // Mark current stage as error, previous as completed
      const idx = base.findIndex((s) => job.current_stage?.includes(s.id));
      return base.map((s, i) => {
        if (i < idx) return { ...s, status: "completed" as const };
        if (i === idx) return { ...s, status: "error" as const };
        return s;
      });
    }

    // Processing/running case
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
        </section>
      )}
    </main>
  );
}
