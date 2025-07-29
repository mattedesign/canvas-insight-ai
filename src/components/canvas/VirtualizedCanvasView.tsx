import React, { useMemo, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { UploadedImage, UXAnalysis } from '@/types/ux-analysis';
import { CanvasImageNode } from './CanvasImageNode';

interface VirtualizedCanvasViewProps {
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  onImageSelect?: (imageId: string) => void;
  onOpenAnalysisPanel?: (analysisId: string) => void;
  onAnalysisComplete?: (imageId: string, analysis: UXAnalysis) => void;
  showAnnotations?: boolean;
  selectedImageId?: string | null;
}

export const VirtualizedCanvasView: React.FC<VirtualizedCanvasViewProps> = ({ 
  uploadedImages, 
  analyses, 
  onImageSelect,
  onOpenAnalysisPanel,
  onAnalysisComplete,
  showAnnotations = true,
  selectedImageId,
  ...props 
}) => {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [itemsPerRow, setItemsPerRow] = useState(3); // Default to 3 items per row
  
  // Calculate virtual items based on canvas layout
  const virtualItems = useMemo(() => {
    return uploadedImages.map((image, index) => ({
      key: image.id,
      index,
      image,
      analysis: analyses.find(a => a.imageId === image.id)
    }));
  }, [uploadedImages, analyses]);
  
  // Calculate responsive items per row based on container width
  useEffect(() => {
    const updateItemsPerRow = () => {
      if (containerRef) {
        const containerWidth = containerRef.clientWidth;
        const itemWidth = 320; // Approximate width of each item including gap
        const newItemsPerRow = Math.max(1, Math.floor(containerWidth / itemWidth));
        setItemsPerRow(newItemsPerRow);
      }
    };
    
    updateItemsPerRow();
    window.addEventListener('resize', updateItemsPerRow);
    return () => window.removeEventListener('resize', updateItemsPerRow);
  }, [containerRef]);
  
  // Use react-virtual for efficient rendering
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(virtualItems.length / itemsPerRow),
    getScrollElement: () => containerRef,
    estimateSize: () => 420, // Estimated row height (image + analysis + padding)
    overscan: 2, // Render 2 additional rows above and below viewport
  });
  
  // Update visible range based on viewport
  useEffect(() => {
    const visibleItems = rowVirtualizer.getVirtualItems();
    if (visibleItems.length > 0) {
      const start = visibleItems[0].index * itemsPerRow;
      const end = Math.min((visibleItems[visibleItems.length - 1].index + 1) * itemsPerRow, virtualItems.length);
      setVisibleRange({ start, end });
    }
  }, [rowVirtualizer.getVirtualItems(), virtualItems.length, itemsPerRow]);
  
  // Performance monitoring
  useEffect(() => {
    console.log(`[VirtualCanvas] Rendering ${visibleRange.end - visibleRange.start} of ${virtualItems.length} items`);
  }, [visibleRange, virtualItems.length]);
  
  if (virtualItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">No images to display</p>
          <p className="text-sm">Upload images to get started</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={setContainerRef}
      className="canvas-virtualized-container bg-background"
      style={{ 
        height: '100%',
        overflow: 'auto',
        padding: '20px'
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * itemsPerRow;
          const rowItems = virtualItems.slice(startIndex, startIndex + itemsPerRow);
          
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
                display: 'grid',
                gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
                gap: '20px',
                padding: '10px 0'
              }}
            >
              {rowItems.map((item) => (
                <CanvasImageNode
                  key={item.key}
                  image={item.image}
                  analysis={item.analysis}
                  onImageSelect={onImageSelect}
                  onOpenAnalysisPanel={onOpenAnalysisPanel}
                  onAnalysisComplete={onAnalysisComplete}
                  showAnnotations={showAnnotations}
                  isSelected={selectedImageId === item.image.id}
                />
              ))}
            </div>
          );
        })}
      </div>
      
      {/* Virtual scroll indicator */}
      <div className="fixed bottom-4 right-4 bg-card border rounded-lg p-2 text-xs text-muted-foreground">
        Showing {visibleRange.start + 1}-{visibleRange.end} of {virtualItems.length}
      </div>
    </div>
  );
};

// Performance wrapper component
export const VirtualizedCanvasContainer: React.FC<VirtualizedCanvasViewProps> = (props) => {
  const { uploadedImages } = props;
  
  // Only virtualize if we have many images
  const shouldVirtualize = uploadedImages.length > 20;
  
  if (!shouldVirtualize) {
    return (
      <div className="canvas-simple-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {uploadedImages.map((image) => {
          const analysis = props.analyses.find(a => a.imageId === image.id);
          return (
            <CanvasImageNode
              key={image.id}
              image={image}
              analysis={analysis}
              onImageSelect={props.onImageSelect}
              onOpenAnalysisPanel={props.onOpenAnalysisPanel}
              onAnalysisComplete={props.onAnalysisComplete}
              showAnnotations={props.showAnnotations}
              isSelected={props.selectedImageId === image.id}
            />
          );
        })}
      </div>
    );
  }
  
  return <VirtualizedCanvasView {...props} />;
};