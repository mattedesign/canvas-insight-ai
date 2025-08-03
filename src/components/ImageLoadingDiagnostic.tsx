import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFinalAppContext } from '@/context/FinalAppContext';

/**
 * ✅ PHASE 2: Diagnostic component to debug image loading issues
 */
export const ImageLoadingDiagnostic: React.FC = () => {
  const { state } = useFinalAppContext();
  const { uploadedImages, analyses } = state;
  const [imageStats, setImageStats] = useState<any>(null);

  useEffect(() => {
    if (uploadedImages.length > 0) {
      const stats = {
        totalImages: uploadedImages.length,
        imagesWithValidUrls: uploadedImages.filter(img => img.url && img.url.startsWith('http')).length,
        imagesWithBlobUrls: uploadedImages.filter(img => img.url && img.url.startsWith('blob:')).length,
        imagesWithInvalidUrls: uploadedImages.filter(img => !img.url || img.url.includes('undefined')).length,
        imagesWithAnalyses: analyses.length,
        imageUrlTypes: uploadedImages.reduce((acc, img) => {
          if (img.url?.includes('supabase')) acc.supabase++;
          else if (img.url?.startsWith('blob:')) acc.blob++;
          else if (img.url?.startsWith('data:')) acc.dataUrl++;
          else acc.other++;
          return acc;
        }, { supabase: 0, blob: 0, dataUrl: 0, other: 0 })
      };
      
      setImageStats(stats);
      console.log('[ImageLoadingDiagnostic] Current image stats:', stats);
    }
  }, [uploadedImages, analyses]);

  if (!imageStats || uploadedImages.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 mb-4 bg-muted/50">
      <h3 className="font-semibold mb-2">🔍 Image Loading Diagnostic</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div>
          <Badge variant="outline">Total Images</Badge>
          <div className="font-mono">{imageStats.totalImages}</div>
        </div>
        <div>
          <Badge variant={imageStats.imagesWithValidUrls === imageStats.totalImages ? "default" : "destructive"}>
            Valid URLs
          </Badge>
          <div className="font-mono">{imageStats.imagesWithValidUrls}/{imageStats.totalImages}</div>
        </div>
        <div>
          <Badge variant="secondary">With Analysis</Badge>
          <div className="font-mono">{imageStats.imagesWithAnalyses}</div>
        </div>
        <div>
          <Badge variant={imageStats.imagesWithInvalidUrls > 0 ? "destructive" : "default"}>
            Invalid URLs
          </Badge>
          <div className="font-mono">{imageStats.imagesWithInvalidUrls}</div>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-muted-foreground">
        URL Types: Supabase({imageStats.imageUrlTypes.supabase}) | 
        Blob({imageStats.imageUrlTypes.blob}) | 
        Data({imageStats.imageUrlTypes.dataUrl}) | 
        Other({imageStats.imageUrlTypes.other})
      </div>
      
      {imageStats.imagesWithInvalidUrls > 0 && (
        <div className="mt-2 text-xs text-destructive">
          ⚠️ {imageStats.imagesWithInvalidUrls} images have invalid URLs and may not display correctly
        </div>
      )}
    </Card>
  );
};