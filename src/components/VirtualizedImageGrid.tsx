/**
 * Virtualized Image Grid - Phase 4.2: Performance Optimizations
 * Implements virtualization for large lists of images
 */

import React, { memo, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { UploadedImage, LegacyUXAnalysis as UXAnalysis } from '@/context/AppStateTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Eye, Download } from 'lucide-react';

interface VirtualizedImageGridProps {
  images: UploadedImage[];
  analyses: UXAnalysis[];
  selectedImageId?: string | null;
  onImageSelect?: (imageId: string) => void;
  onImageRemove?: (imageId: string) => void;
  itemHeight?: number;
  itemsPerRow?: number;
  containerHeight?: number;
}

interface ImageItemProps {
  image: UploadedImage;
  analysis?: UXAnalysis;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

const ImageItem = memo<ImageItemProps>(({ 
  image, 
  analysis, 
  isSelected, 
  onSelect, 
  onRemove 
}) => {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="aspect-square bg-muted rounded-md overflow-hidden mb-3">
          <img
            src={image.url}
            alt={image.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium truncate">
              {image.name}
            </h4>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className="h-6 w-6 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {analysis ? (
              <>
                <Badge variant="outline" className="text-xs">
                  Analyzed
                </Badge>
                {analysis.summary?.overallScore && (
                  <Badge 
                    variant={analysis.summary.overallScore > 7 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    Score: {analysis.summary.overallScore}/10
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Pending
              </Badge>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {image.dimensions.width}×{image.dimensions.height}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ImageItem.displayName = 'ImageItem';

export const VirtualizedImageGrid = memo<VirtualizedImageGridProps>(({
  images,
  analyses,
  selectedImageId,
  onImageSelect,
  onImageRemove,
  itemHeight = 280,
  itemsPerRow = 4,
  containerHeight = 600
}) => {
  // Create analysis lookup map for O(1) access
  const analysisMap = useMemo(() => {
    const map = new Map<string, UXAnalysis>();
    analyses.forEach(analysis => {
      map.set(analysis.imageId, analysis);
    });
    return map;
  }, [analyses]);

  // Calculate rows needed
  const rows = Math.ceil(images.length / itemsPerRow);

  // Virtual container ref
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Initialize virtualizer
  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 2,
  });

  // Get items for virtual rows
  const getRowItems = (rowIndex: number) => {
    const startIndex = rowIndex * itemsPerRow;
    const endIndex = Math.min(startIndex + itemsPerRow, images.length);
    return images.slice(startIndex, endIndex);
  };

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No images uploaded yet</p>
          <p className="text-sm">Upload some images to get started with analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {images.length} image{images.length !== 1 ? 's' : ''}
        </div>
        <div className="text-sm text-muted-foreground">
          Virtualized ({rows} rows)
        </div>
      </div>
      
      <div
        ref={parentRef}
        className="h-full overflow-auto border rounded-lg bg-background"
        style={{ height: containerHeight }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rowItems = getRowItems(virtualRow.index);
            
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div 
                  className="grid gap-4 p-4"
                  style={{
                    gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
                    height: '100%',
                  }}
                >
                  {rowItems.map((image) => (
                    <ImageItem
                      key={image.id}
                      image={image}
                      analysis={analysisMap.get(image.id)}
                      isSelected={selectedImageId === image.id}
                      onSelect={() => onImageSelect?.(image.id)}
                      onRemove={() => onImageRemove?.(image.id)}
                    />
                  ))}
                  
                  {/* Fill empty slots to maintain grid structure */}
                  {rowItems.length < itemsPerRow && 
                    Array.from({ length: itemsPerRow - rowItems.length }).map((_, index) => (
                      <div key={`empty-${index}`} className="invisible" />
                    ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

VirtualizedImageGrid.displayName = 'VirtualizedImageGrid';