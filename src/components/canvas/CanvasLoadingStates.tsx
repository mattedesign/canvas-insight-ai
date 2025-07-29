import React, { useState, useEffect } from 'react';
import { ProgressiveDataLoader } from '@/services/ProgressiveDataLoader';
import { ProjectService } from '@/services/DataMigrationService';

interface CanvasProgressiveLoaderProps {
  onDataLoaded: (data: {
    images: any[];
    analyses: any[];
    groups: any[];
    groupAnalyses: any[];
  }) => void;
}

export const CanvasProgressiveLoader: React.FC<CanvasProgressiveLoaderProps> = ({ 
  onDataLoaded 
}) => {
  const [loadingStage, setLoadingStage] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const projectId = await ProjectService.getCurrentProject();
        
        if (!projectId) {
          setError('No project found');
          return;
        }

        const data = await ProgressiveDataLoader.loadCanvasDataProgressively(
          projectId,
          (stage, progressValue) => {
            setLoadingStage(stage);
            setProgress(progressValue);
          }
        );
        
        setShowSkeleton(false);
        onDataLoaded(data);
      } catch (error) {
        console.error('Progressive loading failed:', error);
        setError(error instanceof Error ? error.message : 'Loading failed');
        setShowSkeleton(false);
      }
    };
    
    loadData();
  }, [onDataLoaded]);

  if (error) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-destructive">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (showSkeleton) {
    return (
      <div className="canvas-loading-container h-screen bg-background p-6">
        {/* Progress indicator */}
        <div className="progress-indicator mb-8 max-w-md mx-auto">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>{loadingStage}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
        
        {/* Canvas skeleton layout */}
        <div className="flex h-full">
          {/* Sidebar skeleton */}
          <div className="w-80 border-r bg-card p-4">
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded animate-pulse" />
              <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-muted rounded animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                      <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Main canvas skeleton */}
          <div className="flex-1 p-6">
            <div className="canvas-skeleton grid grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="image-skeleton">
                  <div className="skeleton-image animate-pulse bg-muted h-48 w-full rounded-lg mb-3" />
                  <div className="skeleton-analysis space-y-2">
                    <div className="animate-pulse bg-muted/60 h-4 w-3/4 rounded" />
                    <div className="animate-pulse bg-muted/60 h-4 w-1/2 rounded" />
                    <div className="animate-pulse bg-muted/40 h-20 w-full rounded" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Groups skeleton */}
            <div className="mt-8">
              <div className="h-6 bg-muted rounded animate-pulse w-32 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="border border-muted rounded-lg p-4">
                    <div className="h-5 bg-muted rounded animate-pulse w-1/2 mb-3" />
                    <div className="grid grid-cols-2 gap-2">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="h-16 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Loading states for different canvas components
export const ImageSkeleton: React.FC = () => (
  <div className="image-skeleton animate-pulse">
    <div className="bg-muted h-48 w-64 rounded-lg mb-2" />
    <div className="bg-muted/60 h-4 w-3/4 rounded mb-1" />
    <div className="bg-muted/40 h-3 w-1/2 rounded" />
  </div>
);

export const AnalysisSkeleton: React.FC = () => (
  <div className="analysis-skeleton animate-pulse space-y-3">
    <div className="bg-muted h-6 w-1/2 rounded" />
    <div className="space-y-2">
      <div className="bg-muted/60 h-4 w-full rounded" />
      <div className="bg-muted/60 h-4 w-3/4 rounded" />
      <div className="bg-muted/40 h-4 w-1/2 rounded" />
    </div>
    <div className="bg-muted/30 h-20 w-full rounded" />
  </div>
);

export const GroupSkeleton: React.FC = () => (
  <div className="group-skeleton animate-pulse border border-muted rounded-lg p-4">
    <div className="bg-muted h-5 w-1/2 rounded mb-3" />
    <div className="grid grid-cols-2 gap-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-muted h-16 rounded" />
      ))}
    </div>
  </div>
);

// Progress bar component for reuse
export const LoadingProgressBar: React.FC<{
  progress: number;
  stage: string;
  className?: string;
}> = ({ progress, stage, className = "" }) => (
  <div className={`progress-indicator ${className}`}>
    <div className="mb-2 flex justify-between text-sm text-muted-foreground">
      <span>{stage}</span>
      <span>{progress}%</span>
    </div>
    <div className="w-full bg-muted rounded-full h-2">
      <div 
        className="bg-primary h-2 rounded-full transition-all duration-300 ease-out" 
        style={{ width: `${progress}%` }} 
      />
    </div>
  </div>
);