/**
 * Memoized Components - Phase 4: Performance Optimizations
 * React.memo implementations for all major components
 */

import React from 'react';
import { UploadedImage, LegacyUXAnalysis as UXAnalysis } from '@/context/AppStateTypes';

// Props interface for memoization comparison
interface ImageCardProps {
  image: UploadedImage;
  analysis?: UXAnalysis;
  isSelected?: boolean;
  onSelect?: (imageId: string) => void;
  onRemove?: (imageId: string) => void;
}

// Memoized image card component
export const MemoizedImageCard = React.memo<ImageCardProps>(({ 
  image, 
  analysis, 
  isSelected, 
  onSelect, 
  onRemove 
}) => {
  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
      onClick={() => onSelect?.(image.id)}
    >
      <div className="aspect-video bg-muted rounded overflow-hidden mb-2">
        <img 
          src={image.url} 
          alt={image.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{image.name}</h3>
          <p className="text-xs text-muted-foreground">
            {image.dimensions ? `${image.dimensions.width}×${image.dimensions.height}` : 'Loading...'}
          </p>
        </div>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(image.id);
            }}
            className="text-destructive hover:text-destructive/80 ml-2"
          >
            ×
          </button>
        )}
      </div>
      {analysis && (
        <div className="mt-2 text-xs text-muted-foreground">
          Analysis: {analysis.status}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for optimal memoization
  return (
    prevProps.image.id === nextProps.image.id &&
    prevProps.image.name === nextProps.image.name &&
    prevProps.image.url === nextProps.image.url &&
    prevProps.image.status === nextProps.image.status &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.analysis?.status === nextProps.analysis?.status &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onRemove === nextProps.onRemove
  );
});

MemoizedImageCard.displayName = 'MemoizedImageCard';

// Memoized image grid component
interface ImageGridProps {
  images: UploadedImage[];
  analyses: UXAnalysis[];
  selectedImageId?: string | null;
  onImageSelect?: (imageId: string) => void;
  onImageRemove?: (imageId: string) => void;
}

export const MemoizedImageGrid = React.memo<ImageGridProps>(({ 
  images, 
  analyses, 
  selectedImageId, 
  onImageSelect, 
  onImageRemove 
}) => {
  // Create a map for O(1) analysis lookup
  const analysisMap = React.useMemo(() => {
    const map = new Map<string, UXAnalysis>();
    analyses.forEach(analysis => {
      map.set(analysis.imageId, analysis);
    });
    return map;
  }, [analyses]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image) => (
        <MemoizedImageCard
          key={image.id}
          image={image}
          analysis={analysisMap.get(image.id)}
          isSelected={selectedImageId === image.id}
          onSelect={onImageSelect}
          onRemove={onImageRemove}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.images.length === nextProps.images.length &&
    prevProps.analyses.length === nextProps.analyses.length &&
    prevProps.selectedImageId === nextProps.selectedImageId &&
    prevProps.onImageSelect === nextProps.onImageSelect &&
    prevProps.onImageRemove === nextProps.onImageRemove &&
    prevProps.images.every((img, index) => 
      img.id === nextProps.images[index]?.id &&
      img.status === nextProps.images[index]?.status
    )
  );
});

MemoizedImageGrid.displayName = 'MemoizedImageGrid';

// Memoized loading indicator
interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export const MemoizedLoadingIndicator = React.memo<LoadingIndicatorProps>(({ 
  isLoading, 
  message, 
  progress 
}) => {
  if (!isLoading) return null;

  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {progress !== undefined && (
          <div className="w-32 bg-secondary rounded-full h-2 mt-2 mx-auto">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

MemoizedLoadingIndicator.displayName = 'MemoizedLoadingIndicator';

// Memoized status bar
interface StatusBarProps {
  imageCount: number;
  analysisCount: number;
  isLoading: boolean;
  isSyncing: boolean;
  lastSync?: Date | null;
}

export const MemoizedStatusBar = React.memo<StatusBarProps>(({ 
  imageCount, 
  analysisCount, 
  isLoading, 
  isSyncing, 
  lastSync 
}) => {
  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-muted/50 border-t px-4 py-2 text-xs text-muted-foreground flex justify-between items-center">
      <div className="flex gap-4">
        <span>{imageCount} images</span>
        <span>{analysisCount} analyses</span>
      </div>
      <div className="flex items-center gap-2">
        {isLoading && <span className="text-primary">Loading...</span>}
        {isSyncing && <span className="text-primary">Syncing...</span>}
        <span>Last sync: {formatSyncTime(lastSync)}</span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.imageCount === nextProps.imageCount &&
    prevProps.analysisCount === nextProps.analysisCount &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isSyncing === nextProps.isSyncing &&
    prevProps.lastSync?.getTime() === nextProps.lastSync?.getTime()
  );
});

MemoizedStatusBar.displayName = 'MemoizedStatusBar';