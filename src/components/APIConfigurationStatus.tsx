import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Settings, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiStatusService, type APIStatusResult } from '@/services/APIStatusService';

interface APIConfigurationStatusProps {
  debugInfo?: {
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
  showLiveStatus?: boolean;
}

export const APIConfigurationStatus: React.FC<APIConfigurationStatusProps> = ({
  debugInfo,
  onRetry,
  className,
  showLiveStatus = true
}) => {
  const [liveStatus, setLiveStatus] = useState<APIStatusResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Load live API status on mount and periodically
  useEffect(() => {
    if (!showLiveStatus) return;

    const checkStatus = async () => {
      try {
        setIsChecking(true);
        setLastError(null);
        const status = await apiStatusService.checkAPIStatus();
        setLiveStatus(status);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : 'Status check failed');
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [showLiveStatus]);

  const handleManualRefresh = async () => {
    if (isChecking) return;
    
    try {
      setIsChecking(true);
      setLastError(null);
      const status = await apiStatusService.checkAPIStatus(true); // Force refresh
      setLiveStatus(status);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Status check failed');
    } finally {
      setIsChecking(false);
    }
  };

  // Use live status if available, fallback to debugInfo
  const statusData = liveStatus || {
    availableAPIs: debugInfo?.availableAPIs || [],
    stages: debugInfo?.stages || [],
    isReady: (debugInfo?.availableAPIs?.length || 0) > 0,
    errors: []
  };

  const { availableAPIs, stages, isReady, errors } = statusData;
  
  if (isReady && availableAPIs.length > 0) {
    // All good - show success
    return (
      <Alert className={`border-success/20 bg-success/10 ${className}`}>
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertTitle className="text-success flex items-center gap-2">
          AI Analysis Ready
          {showLiveStatus && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleManualRefresh}
              disabled={isChecking}
              className="h-6 w-6 p-0 text-success hover:bg-success/10"
            >
              <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </AlertTitle>
        <AlertDescription className="text-success/80">
          Real AI analysis using {availableAPIs.join(', ')}
          {liveStatus && (
            <div className="text-xs mt-1 opacity-70">
              Last checked: {new Date(liveStatus.configuredAPIs[0]?.lastChecked || Date.now()).toLocaleTimeString()}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Show API configuration needed
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Live Status Error */}
      {lastError && (
        <Alert className="border-destructive/20 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Status Check Failed</AlertTitle>
          <AlertDescription className="text-destructive/80">
            {lastError}
          </AlertDescription>
        </Alert>
      )}

      {/* API Status Details */}
      <Alert className="border-muted">
        <Settings className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          API Configuration Required
          {showLiveStatus && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleManualRefresh}
              disabled={isChecking}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </AlertTitle>
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
              {showLiveStatus && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={handleManualRefresh}
                  disabled={isChecking}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
                  {isChecking ? 'Checking...' : 'Refresh Status'}
                </Button>
              )}
            </div>

            {/* Show any configuration errors */}
            {errors.length > 0 && (
              <div className="mt-3 p-2 bg-destructive/10 rounded border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-1">Configuration Issues:</p>
                <ul className="text-xs text-destructive/80 space-y-0.5">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Configuration Instructions */}
      <Alert className="border-muted">
        <AlertTitle>Configuration Instructions</AlertTitle>
        <AlertDescription className="text-sm space-y-2">
          <p>To enable AI analysis, configure at least one API key:</p>
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