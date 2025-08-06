import React, { memo, useState, useEffect } from 'react';
import type { UploadedImage, UXAnalysis } from '@/types/ux-analysis';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { analysisService } from '@/services/TypeSafeAnalysisService';
import { Eye, BarChart3, Image as ImageIcon, Clock, CheckCircle, AlertCircle, Layers } from 'lucide-react';

interface CanvasImageNodeProps {
  image: UploadedImage;
  analysis?: UXAnalysis;
  onImageSelect?: (imageId: string) => void;
  onOpenAnalysisPanel?: (analysisId: string) => void;
  onAnalysisComplete?: (imageId: string, analysis: UXAnalysis) => void;
  showAnnotations?: boolean;
  isSelected?: boolean;
}

export const CanvasImageNode: React.FC<CanvasImageNodeProps> = memo(({
  image,
  analysis,
  onImageSelect,
  onOpenAnalysisPanel,
  onAnalysisComplete,
  showAnnotations = true,
  isSelected = false
}) => {
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load analysis history on mount
  useEffect(() => {
    if (image.id) {
      loadAnalysisHistory();
    }
  }, [image.id]);

  const loadAnalysisHistory = async () => {
    if (!image.id) return;
    
    setLoadingHistory(true);
    try {
      const history = await analysisService.getAnalysisHistory(image.id);
      setAnalysisHistory(history);
    } catch (error) {
      console.error('Failed to load analysis history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleImageClick = () => {
    onImageSelect?.(image.id);
  };

  const handleAnalysisClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (analysis?.id) {
      onOpenAnalysisPanel?.(analysis.id);
    }
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageSelect?.(image.id);
  };

  // Get analysis status info
  const getAnalysisStatusInfo = () => {
    if (!analysisHistory.length) {
      return { status: 'no-analysis', icon: AlertCircle, color: 'text-muted-foreground' };
    }
    
    if (analysisHistory.length === 1) {
      return { status: 'analyzed', icon: CheckCircle, color: 'text-green-600' };
    }
    
    return { status: 'multiple-versions', icon: Layers, color: 'text-blue-600' };
  };

  const analysisStatusInfo = getAnalysisStatusInfo();

  return (
    <Card 
      className={`canvas-image-node transition-all duration-200 hover:shadow-lg cursor-pointer ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={handleImageClick}
    >
      <CardContent className="p-4">
        {/* Image Container */}
        <div className="relative mb-3">
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted" style={{ maxWidth: '300px', maxHeight: '225px' }}>
            {image.url ? (
              <img
                src={image.url}
                alt={image.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            
            {/* Fallback for broken images */}
            <div className="hidden w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon size={48} />
            </div>
          </div>
          
          {/* Status badge */}
          <Badge 
            variant={image.status === 'completed' ? 'default' : 'secondary'}
            className="absolute top-2 right-2"
          >
            {image.status}
          </Badge>
          
          {/* Analysis Status and Version Indicators */}
          <div className="absolute bottom-2 left-2 flex gap-1">
            {analysisHistory.length > 0 && (
              <Badge 
                variant="outline" 
                className={`bg-background/80 backdrop-blur-sm text-xs flex items-center gap-1 ${analysisStatusInfo.color}`}
              >
                <analysisStatusInfo.icon className="h-3 w-3" />
                {analysisHistory.length > 1 ? `${analysisHistory.length} versions` : 'Analyzed'}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Image Info */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm truncate" title={image.name}>
            {image.name}
          </h4>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(image.file?.size || 0)}</span>
            {image.dimensions && (
              <span>{image.dimensions.width} × {image.dimensions.height}</span>
            )}
          </div>
        </div>
        
        {/* Analysis Summary */}
        {analysis && showAnnotations && (
          <div className="mt-3 p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={14} />
              <span className="text-xs font-medium">Analysis</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {analysis.suggestions?.length || 0} suggestions
            </div>
            {analysis.summary && (
              <div className="text-xs text-muted-foreground mt-1">
                Score: {(analysis.summary as any)?.overallScore || 'N/A'}
              </div>
            )}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleViewClick}
          >
            <Eye size={14} className="mr-1" />
            View
          </Button>
          
          {analysis && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleAnalysisClick}
            >
              <BarChart3 size={14} className="mr-1" />
              Analysis
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

CanvasImageNode.displayName = 'CanvasImageNode';

// Utility function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}