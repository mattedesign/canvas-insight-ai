import { useEffect } from 'react';
import { useAppState } from './useAppState';

export const useDataLoadingDiagnostic = () => {
  const { uploadedImages, analyses, imageGroups, isLoading, error } = useAppState();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    console.group('🔍 [DataLoadingDiagnostic] State Update');
    console.log('Loading:', isLoading);
    console.log('Error:', error);
    console.log('Images:', {
      count: uploadedImages.length,
      details: uploadedImages.map(img => ({
        id: img.id,
        name: img.name,
        hasUrl: !!img.url,
        urlPrefix: img.url ? img.url.substring(0, 50) : 'NO_URL',
        hasDimensions: !!img.dimensions,
        dimensions: img.dimensions,
        status: img.status
      }))
    });
    console.log('Analyses:', analyses.length);
    console.log('Groups:', imageGroups.length);
    console.groupEnd();

    // Log potential issues
    const missingUrls = uploadedImages.filter(img => !img.url);
    if (missingUrls.length > 0) {
      console.error('🚨 [DataLoadingDiagnostic] Images missing URLs:', missingUrls);
    }

    const missingDimensions = uploadedImages.filter(img => !img.dimensions);
    if (missingDimensions.length > 0) {
      console.warn('⚠️ [DataLoadingDiagnostic] Images missing dimensions:', missingDimensions);
    }

    const invalidUrls = uploadedImages.filter(img => img.url && img.url.includes('undefined'));
    if (invalidUrls.length > 0) {
      console.error('🚨 [DataLoadingDiagnostic] Images with invalid URLs:', invalidUrls);
    }
  }, [uploadedImages, analyses, imageGroups, isLoading, error]);

  return {
    imageCount: uploadedImages.length,
    analysisCount: analyses.length,
    groupCount: imageGroups.length,
    hasIssues: uploadedImages.some(img => !img.url || !img.dimensions || img.url.includes('undefined')),
    isLoading,
    error
  };
};