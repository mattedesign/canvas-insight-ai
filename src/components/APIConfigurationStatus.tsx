import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Settings, ExternalLink } from 'lucide-react';

interface APIConfigurationStatusProps {
  debugInfo?: {
    fallbacksUsed?: number;
    pipelineSuccess?: boolean;
    availableAPIs?: string[];
    stages?: Array<{
      stage: string;
      model: string;
      success: boolean;
      error?: string;
      warning?: string;
    }>;
  };
  onRetry?: () => void;
  className?: string;
}

export const APIConfigurationStatus: React.FC<APIConfigurationStatusProps> = ({
  debugInfo,
  onRetry,
  className
}) => {
  if (!debugInfo) return null;

  const { fallbacksUsed = 0, pipelineSuccess = true, availableAPIs = [], stages = [] } = debugInfo;
  const hasFallbacks = fallbacksUsed > 0 || !pipelineSuccess;
  
  if (!hasFallbacks && availableAPIs.length > 0) {
    // All good - show success briefly or not at all
    return (
      <Alert className={`border-success/20 bg-success/10 ${className}`}>
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertTitle className="text-success">AI Analysis Complete</AlertTitle>
        <AlertDescription className="text-success/80">
          Real AI analysis using {availableAPIs.join(', ')}
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasFallbacks) return null; // No issues to report

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main warning alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>⚠️ Fallback Data Warning</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>
              You're seeing generic mock data instead of real AI analysis. 
              {fallbacksUsed > 0 && ` ${fallbacksUsed} AI service(s) failed.`}
            </p>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="destructive" className="text-xs">
                Fallback Data Active
              </Badge>
              {availableAPIs.length === 0 && (
                <Badge variant="outline" className="text-xs border-destructive text-destructive">
                  No API Keys Configured
                </Badge>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* API Status Details */}
      <Alert className="border-muted">
        <Settings className="h-4 w-4" />
        <AlertTitle>API Configuration Status</AlertTitle>
        <AlertDescription>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Configured APIs:</p>
              {availableAPIs.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {availableAPIs.map(api => (
                    <Badge key={api} variant="secondary" className="text-xs">
                      {api}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  No APIs Configured
                </Badge>
              )}
            </div>

            {stages.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Pipeline Status:</p>
                <div className="space-y-1">
                  {stages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      {stage.success ? (
                        <CheckCircle className="h-3 w-3 text-success" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive" />
                      )}
                      <span className="capitalize">{stage.stage.replace(/_/g, ' ')}</span>
                      <Badge variant={stage.success ? "secondary" : "destructive"} className="text-xs">
                        {stage.model}
                      </Badge>
                      {stage.warning && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                          {stage.warning}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  Retry Analysis
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open('https://supabase.com/dashboard/project/sdcmbfdtafkzpimwjpij/settings/functions', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Configure API Keys
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Configuration Instructions */}
      <Alert className="border-muted">
        <AlertTitle>Configuration Instructions</AlertTitle>
        <AlertDescription className="text-sm space-y-2">
          <p>To get real AI analysis instead of fallback data:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to Supabase Edge Function secrets (link above)</li>
            <li>Add at least one API key:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                <li><code className="text-xs bg-muted px-1 rounded">OPENAI_API_KEY</code> - For GPT-4 analysis</li>
                <li><code className="text-xs bg-muted px-1 rounded">ANTHROPIC_API_KEY</code> - For Claude analysis</li>
                <li><code className="text-xs bg-muted px-1 rounded">GOOGLE_VISION_API_KEY</code> - For metadata extraction</li>
              </ul>
            </li>
            <li>Retry the analysis after configuration</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
};