import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AnalysisJobProgress } from "@/components/AnalysisJobProgress";
import { useAnalysisJob } from "@/hooks/useAnalysisJob";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const JobStatusPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { job, loading, error } = useAnalysisJob(jobId ?? null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    document.title = `UX Analysis Job Status${jobId ? ` • ${jobId}` : ""}`;
  }, [jobId]);

  const meta = useMemo(() => ({
    status: job?.status ?? "unknown",
    stage: job?.current_stage ?? "n/a",
    progress: job?.progress ?? 0,
  }), [job]);

  return (
    <main className="min-h-screen bg-background">
      <section className="container mx-auto max-w-3xl p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Analysis Job Status</CardTitle>
              <Badge variant={meta.status === 'completed' ? 'default' : meta.status === 'failed' ? 'destructive' : 'secondary'}>
                {meta.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-muted-foreground">Loading job…</p>}
            {error && <p className="text-destructive">{error}</p>}

            {!loading && !error && (
              <>
                <AnalysisJobProgress job={job} />
                <div className="text-sm text-muted-foreground">
                  <p>Job ID: <span className="font-mono">{jobId}</span></p>
                  {job?.image_url && (
                    <p>Image: <a className="underline" href={job.image_url} target="_blank" rel="noreferrer">open</a></p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild variant="secondary">
                    <Link to="/dashboard">Back to Dashboard</Link>
                  </Button>
                  {jobId && (
                    <Button asChild variant="outline">
                      <a href={`${window.location.origin}/job/${jobId}`} target="_blank" rel="noreferrer">Open in new tab</a>
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setShowRaw((v) => !v)}>
                    {showRaw ? "Hide" : "Show"} raw response
                  </Button>
                </div>

                {showRaw && (
                  <>
                    <Separator />
                    <pre className="text-xs bg-muted/40 p-4 rounded overflow-x-auto">
                      {JSON.stringify(job, null, 2)}
                    </pre>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default JobStatusPage;
