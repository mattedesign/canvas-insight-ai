/**
 * Enhanced Analysis Trigger Component
 * Provides UI to trigger both traditional and natural AI analysis
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  Zap, 
  Settings, 
  Info,
  Sparkles,
  Target
} from 'lucide-react';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { AnalysisContext } from '@/types/contextTypes';
import { startUxAnalysis } from '@/services/StartUxAnalysis';
import { useAnalysisJob } from '@/hooks/useAnalysisJob';
import { AnalysisJobProgress } from './AnalysisJobProgress';
import { fetchLatestAnalysis } from '@/services/fetchLatestAnalysis';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface EnhancedAnalysisTriggerProps {
  image: UploadedImage;
  userContext?: string;
  analysisContext?: AnalysisContext;
  onAnalysisComplete?: (analysis: UXAnalysis) => void;
  onAnalysisError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function EnhancedAnalysisTrigger({
  image,
  userContext,
  analysisContext,
  onAnalysisComplete,
  onAnalysisError,
  disabled = false,
  className = ""
}: EnhancedAnalysisTriggerProps) {
  const [useNaturalPipeline, setUseNaturalPipeline] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const { job } = useAnalysisJob(jobId);

  const handleAnalyze = async () => {
    if (!image.url || isAnalyzing || jobId) return;

    setIsAnalyzing(true);

    try {
      console.log('🚀 Starting analysis job:', {
        useNaturalPipeline,
        hasAnalysisContext: !!analysisContext,
        imageUrl: image.url.substring(0, 50) + '...'
      });

      const { jobId: newJobId } = await startUxAnalysis({
        imageId: image.id,
        imageUrl: image.url,
        projectId: undefined,
        userContext: userContext || null,
      });

      console.log('✅ startUxAnalysis returned jobId:', newJobId);
      setJobId(newJobId);
      toast.info('Analysis started. Tracking progress...');
    } catch (error: any) {
      console.error('❌ Failed to start analysis:', error);
      const message = error?.message || 'Failed to start analysis';
      toast.error(message);
      onAnalysisError?.(message);
      setIsAnalyzing(false);
    }
  };

  React.useEffect(() => {
    if (!jobId || !job) return;

    if (job.status === 'completed') {
      (async () => {
        try {
          const latest = await fetchLatestAnalysis(image.id);
          onAnalysisComplete?.(latest as UXAnalysis);
          toast.success('Analysis complete');
        } catch (e: any) {
          const msg = e?.message || 'Failed to fetch analysis results';
          toast.error(msg);
          onAnalysisError?.(msg);
        } finally {
          setJobId(null);
          setIsAnalyzing(false);
        }
      })();
    } else if (job.status === 'failed') {
      const msg = job.error || 'Analysis failed';
      toast.error(msg);
      onAnalysisError?.(msg);
      setJobId(null);
      setIsAnalyzing(false);
    }
  }, [jobId, job]);

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            UX Analysis
          </CardTitle>
          <Badge variant={useNaturalPipeline ? "default" : "secondary"}>
            {useNaturalPipeline ? 'Natural AI' : 'Traditional'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Pipeline Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="natural-pipeline"
                checked={useNaturalPipeline}
                onCheckedChange={setUseNaturalPipeline}
                disabled={isAnalyzing}
              />
              <Label htmlFor="natural-pipeline" className="text-sm font-medium">
                Natural AI Pipeline
              </Label>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Pipeline Description */}
          <div className="text-sm text-muted-foreground space-y-2">
            {useNaturalPipeline ? (
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Natural AI Analysis:</strong> Multiple AI models provide unfiltered insights, 
                  then a meta-analysis AI synthesizes them into domain-specific, actionable recommendations. 
                  Preserves AI richness while generating genuinely relevant insights.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Traditional Analysis:</strong> Structured analysis using predefined schemas 
                  and validation rules. Consistent output format with comprehensive coverage 
                  of standard UX principles.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Context Information */}
        {analysisContext && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4" />
              Analysis Context
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Interface: {analysisContext.image.primaryType}</div>
              <div>Domain: {analysisContext.image.domain || 'General'}</div>
              <div>User Role: {analysisContext.user.inferredRole}</div>
              <div>Confidence: {Math.round(analysisContext.confidence * 100)}%</div>
            </div>
          </div>
        )}

        {/* Progress Display */}
        {jobId && (
<div className="space-y-2">
  <AnalysisJobProgress job={job} />
  {jobId && (
    <Button asChild variant="outline" className="w-full">
      <Link to={`/job/${jobId}`}>View Live Status</Link>
    </Button>
  )}
</div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleAnalyze}
          disabled={disabled || isAnalyzing || !!jobId || !image.url}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Brain className="mr-2 h-4 w-4 animate-pulse" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Start {useNaturalPipeline ? 'Natural' : 'Traditional'} Analysis
            </>
          )}
        </Button>

        {/* Additional Information */}
        <div className="text-xs text-muted-foreground text-center pt-2">
          {useNaturalPipeline ? (
            'Natural analysis adapts to what AI models actually find in your interface'
          ) : (
            'Traditional analysis follows structured UX evaluation frameworks'
          )}
        </div>
      </CardContent>
    </Card>
  );
}