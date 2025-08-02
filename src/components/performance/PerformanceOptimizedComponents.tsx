/**
 * Phase 4: Performance Optimized Components
 * Memoized components with proper dependency management
 */

import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  StrictUploadedImage, 
  StrictUXAnalysis, 
  StrictImageGroup 
} from '@/types/strict-interfaces';
import { Upload, Trash2, Eye, MoreVertical } from 'lucide-react';

// Memoized image thumbnail with optimized rendering
interface OptimizedImageThumbnailProps {
  readonly image: StrictUploadedImage;
  readonly analysis?: StrictUXAnalysis;
  readonly isSelected: boolean;
  readonly onSelect: (imageId: string) => void;
  readonly onDelete: (imageId: string) => void;
  readonly onView: (imageId: string) => void;
}

export const OptimizedImageThumbnail = React.memo<OptimizedImageThumbnailProps>(({
  image,
  analysis,
  isSelected,
  onSelect,
  onDelete,
  onView
}) => {
  // Memoize expensive calculations
  const statusColor = useMemo(() => {
    switch (image.status) {
      case 'completed': return 'default';
      case 'error': return 'destructive';
      case 'processing': 
      case 'analyzing': return 'secondary';
      default: return 'outline';
    }
  }, [image.status]);

  const analysisScore = useMemo(() => {
    return analysis?.summary.overallScore || 0;
  }, [analysis?.summary.overallScore]);

  // Stable callback references
  const handleSelect = useCallback(() => {
    onSelect(image.id);
  }, [onSelect, image.id]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(image.id);
  }, [onDelete, image.id]);

  const handleView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onView(image.id);
  }, [onView, image.id]);

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
      }`}
      onClick={handleSelect}
    >
      <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
        <img
          src={image.url}
          alt={image.name}
          className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge variant={statusColor} className="text-xs">
            {image.status}
          </Badge>
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
          <Button size="sm" variant="secondary" onClick={handleView}>
            <Eye className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <CardContent className="p-3">
        <div className="space-y-2">
          <h3 className="font-medium text-sm truncate" title={image.name}>
            {image.name}
          </h3>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{image.dimensions.width}×{image.dimensions.height}</span>
            {analysis && (
              <div className="flex items-center gap-1">
                <span>Score:</span>
                <Badge variant="outline" className="text-xs">
                  {analysisScore}/100
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.image.id === nextProps.image.id &&
    prevProps.image.status === nextProps.image.status &&
    prevProps.image.url === nextProps.image.url &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.analysis?.summary.overallScore === nextProps.analysis?.summary.overallScore &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onView === nextProps.onView
  );
});

OptimizedImageThumbnail.displayName = 'OptimizedImageThumbnail';

// Memoized image grid with virtualization support
interface OptimizedImageGridProps {
  readonly images: ReadonlyArray<StrictUploadedImage>;
  readonly analyses: ReadonlyArray<StrictUXAnalysis>;
  readonly selectedImageId: string | null;
  readonly onImageSelect: (imageId: string) => void;
  readonly onImageDelete: (imageId: string) => void;
  readonly onImageView: (imageId: string) => void;
  readonly itemsPerRow?: number;
}

export const OptimizedImageGrid = React.memo<OptimizedImageGridProps>(({
  images,
  analyses,
  selectedImageId,
  onImageSelect,
  onImageDelete,
  onImageView,
  itemsPerRow = 4
}) => {
  // Create optimized analysis lookup map
  const analysisMap = useMemo(() => {
    const map = new Map<string, StrictUXAnalysis>();
    analyses.forEach(analysis => {
      map.set(analysis.imageId, analysis);
    });
    return map;
  }, [analyses]);

  // Memoize grid style calculations
  const gridStyle = useMemo(() => ({
    gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`
  }), [itemsPerRow]);

  // Early return for empty state
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Upload className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No images uploaded</p>
        <p className="text-sm">Upload images to start analyzing</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4" style={gridStyle}>
      {images.map((image) => (
        <OptimizedImageThumbnail
          key={image.id}
          image={image}
          analysis={analysisMap.get(image.id)}
          isSelected={selectedImageId === image.id}
          onSelect={onImageSelect}
          onDelete={onImageDelete}
          onView={onImageView}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.images.length === nextProps.images.length &&
    prevProps.analyses.length === nextProps.analyses.length &&
    prevProps.selectedImageId === nextProps.selectedImageId &&
    prevProps.itemsPerRow === nextProps.itemsPerRow &&
    prevProps.onImageSelect === nextProps.onImageSelect &&
    prevProps.onImageDelete === nextProps.onImageDelete &&
    prevProps.onImageView === nextProps.onImageView &&
    // Deep comparison for arrays (consider using a more sophisticated comparison for large datasets)
    prevProps.images.every((img, index) => 
      img.id === nextProps.images[index]?.id &&
      img.status === nextProps.images[index]?.status
    )
  );
});

OptimizedImageGrid.displayName = 'OptimizedImageGrid';

// Memoized analysis results panel
interface OptimizedAnalysisResultsProps {
  readonly analysis: StrictUXAnalysis;
  readonly onExport: (analysisId: string) => void;
  readonly onRegenerateAnalysis: (analysisId: string) => void;
}

export const OptimizedAnalysisResults = React.memo<OptimizedAnalysisResultsProps>(({
  analysis,
  onExport,
  onRegenerateAnalysis
}) => {
  const handleExport = useCallback(() => {
    onExport(analysis.id);
  }, [onExport, analysis.id]);

  const handleRegenerate = useCallback(() => {
    onRegenerateAnalysis(analysis.id);
  }, [onRegenerateAnalysis, analysis.id]);

  const scoreColor = useMemo(() => {
    const score = analysis.summary?.overallScore || 0;
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  }, [analysis.summary?.overallScore]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{analysis.imageName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Analysis completed • {analysis.createdAt.toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExport}>
              Export
            </Button>
            <Button size="sm" variant="outline" onClick={handleRegenerate}>
              Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <Badge variant={scoreColor}>
              {analysis.summary?.overallScore || 'N/A'}/100
            </Badge>
          </div>
          <Progress value={analysis.summary?.overallScore || 0} className="h-2" />
        </div>

        {/* Category Scores */}
        <div className="space-y-3">
          <h4 className="font-medium">Category Breakdown</h4>
          {Object.entries(analysis.summary.categoryScores).map(([category, score]) => (
            <div key={category} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="capitalize">{category}</span>
                <span className="font-medium">{score}/100</span>
              </div>
              <Progress value={score} className="h-1" />
            </div>
          ))}
        </div>

        {/* Key Issues */}
        {analysis.summary.keyIssues.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Key Issues</h4>
            <ul className="space-y-1">
              {analysis.summary.keyIssues.map((issue, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Strengths */}
        {analysis.summary.strengths.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Strengths</h4>
            <ul className="space-y-1">
              {analysis.summary.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-success mt-1">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

OptimizedAnalysisResults.displayName = 'OptimizedAnalysisResults';

// Memoized loading states
interface OptimizedLoadingStatesProps {
  readonly isLoading: boolean;
  readonly loadingMessage?: string;
  readonly progress?: number;
  readonly variant?: 'spinner' | 'skeleton' | 'progress';
}

export const OptimizedLoadingStates = React.memo<OptimizedLoadingStatesProps>(({
  isLoading,
  loadingMessage = 'Loading...',
  progress,
  variant = 'spinner'
}) => {
  if (!isLoading) return null;

  switch (variant) {
    case 'skeleton':
      return (
        <div className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      );

    case 'progress':
      return (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          </div>
          {progress !== undefined && (
            <div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center mt-1">
                {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          {progress !== undefined && (
            <div className="w-32 mt-2">
              <Progress value={progress} className="h-1" />
            </div>
          )}
        </div>
      );
  }
});

OptimizedLoadingStates.displayName = 'OptimizedLoadingStates';