import React from 'react';
import { useAppState } from '@/hooks/useAppState';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

/**
 * ✅ PHASE 4: Diagnostic component to track image loading and canvas state
 * Only shown in development mode to help debug data flow issues
 */
export const ImageLoadingDiagnostic: React.FC = () => {
  const { uploadedImages, analyses, imageGroups } = useAppState();
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const imageValidation = uploadedImages.map(image => ({
    id: image.id,
    name: image.name,
    hasUrl: !!image.url,
    isValidUrl: image.url?.startsWith('http') || image.url?.startsWith('blob:') || false,
    hasFile: !!image.file,
    dimensions: image.dimensions,
    hasAnalysis: analyses.some(a => a.imageId === image.id)
  }));

  const stats = {
    total: uploadedImages.length,
    validUrls: imageValidation.filter(img => img.isValidUrl).length,
    withAnalysis: imageValidation.filter(img => img.hasAnalysis).length,
    invalidUrls: imageValidation.filter(img => img.hasUrl && !img.isValidUrl).length,
    missingUrls: imageValidation.filter(img => !img.hasUrl).length
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 max-w-md bg-background/95 backdrop-blur-sm">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold text-sm">Canvas Debug Info</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              Total: {stats.total}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              Groups: {imageGroups.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Valid URLs: {stats.validUrls}</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-blue-500" />
            <span>With Analysis: {stats.withAnalysis}</span>
          </div>
          {stats.invalidUrls > 0 && (
            <div className="flex items-center gap-1 col-span-2">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span className="text-red-500">Invalid URLs: {stats.invalidUrls}</span>
            </div>
          )}
          {stats.missingUrls > 0 && (
            <div className="flex items-center gap-1 col-span-2">
              <AlertCircle className="h-3 w-3 text-orange-500" />
              <span className="text-orange-500">Missing URLs: {stats.missingUrls}</span>
            </div>
          )}
        </div>

        {imageValidation.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-muted-foreground">Image Status:</div>
            {imageValidation.slice(0, 3).map(img => (
              <div key={img.id} className="flex items-center gap-2 text-xs">
                {img.isValidUrl ? (
                  <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                ) : img.hasUrl ? (
                  <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                ) : (
                  <Loader2 className="h-3 w-3 text-orange-500 flex-shrink-0" />
                )}
                <span className="truncate">{img.name}</span>
                {img.hasAnalysis && <Badge variant="secondary" className="text-xs px-1">A</Badge>}
              </div>
            ))}
            {imageValidation.length > 3 && (
              <div className="text-xs text-muted-foreground">
                ... and {imageValidation.length - 3} more images
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};