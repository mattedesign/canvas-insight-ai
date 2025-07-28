import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { UploadErrorBoundary } from '@/components/UploadErrorBoundary';
import { AnalysisErrorBoundary } from '@/components/AnalysisErrorBoundary';
import { AnalysisStatusIndicator } from '@/components/AnalysisStatusIndicator';
import { UploadStatusIndicator } from '@/components/UploadStatusIndicator';
import { EnhancedUploadProgress, createAnalysisStages } from '@/components/EnhancedUploadProgress';
import { NewSessionDialog } from '@/components/NewSessionDialog';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { DataMigrationService, ProjectService } from '@/services/DataMigrationService';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

const Upload = () => {
  const navigate = useNavigate();
  const { debounce } = useDebounce();
  const { 
    uploadedImages, 
    analyses, 
    selectedImageId,
    showAnnotations,
    isUploading,
    isLoading,
    handleImageUpload,
    handleImageUploadImmediate,
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations,
    loadDataFromDatabase
  } = useAppContext();

  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [hasPreviousData, setHasPreviousData] = useState(false);
  const [analysisStages, setAnalysisStages] = useState(createAnalysisStages());
  const [currentStage, setCurrentStage] = useState<string>('');
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string>('');

  // Check for existing data on mount
  useEffect(() => {
    const checkExistingData = async () => {
      try {
        const hasData = await DataMigrationService.hasExistingData();
        setHasPreviousData(hasData);
      } catch (error) {
        console.error('Error checking existing data:', error);
        setHasPreviousData(false);
      }
    };
    
    checkExistingData();
  }, []);

  // Enhanced metadata extraction with proper URL handling and retry mechanism
  const extractMetadataForImage = useCallback(async (imageId: string, retryCount = 0): Promise<boolean> => {
    const maxRetries = 3;
    
    try {
      // First, get the latest image data from database to ensure we have the correct storage URL
      const { data: imageData, error: imageError } = await supabase
        .from('images')
        .select('id, storage_path, metadata')
        .eq('id', imageId)
        .single();

      if (imageError) {
        console.error('Failed to fetch image data for metadata extraction:', imageError);
        return false;
      }

      // Skip if metadata already exists
      if (imageData?.metadata && typeof imageData.metadata === 'object' && 
          (imageData.metadata as any)?.provider === 'google-vision') {
        console.log('Metadata already exists for image:', imageId);
        return true;
      }

      // Construct proper Supabase storage URL
      if (!imageData?.storage_path) {
        console.warn('No storage path found for image:', imageId);
        return false;
      }

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(imageData.storage_path);

      const imageUrl = urlData.publicUrl;
      
      console.log('Extracting metadata for image:', imageId, 'with URL:', imageUrl);

      const { data, error } = await supabase.functions.invoke('google-vision-metadata', {
        body: {
          imageId,
          imageUrl,
          features: ['labels', 'text', 'faces', 'objects', 'colors']
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        console.log('Metadata extraction successful for image:', imageId);
        return true;
      } else {
        throw new Error(data?.error || 'Metadata extraction failed');
      }
    } catch (error) {
      console.error(`Metadata extraction failed for image ${imageId} (attempt ${retryCount + 1}):`, error);
      
      // Retry mechanism with exponential backoff
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying metadata extraction for image ${imageId} in ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return extractMetadataForImage(imageId, retryCount + 1);
      }
      
      console.warn(`Failed to extract metadata for image ${imageId} after ${maxRetries + 1} attempts`);
      return false;
    }
  }, []);

  // Debounced metadata extraction to prevent API overload
  const debounceMetadataExtraction = useCallback(() => {
    return debounce(extractMetadataForImage, 1000); // 1 second debounce to prevent spam
  }, [debounce, extractMetadataForImage]);

  const processUploadWithProgress = useCallback(async (files: File[]) => {
    setUploadError('');
    setOverallProgress(0);
    
    const stages = createAnalysisStages();
    setAnalysisStages(stages);
    
    try {
      // Stage 1: Upload
      setCurrentStage('upload');
      setAnalysisStages(prev => prev.map(stage => 
        stage.id === 'upload' ? { ...stage, status: 'active' } : stage
      ));
      
      // Call the immediate upload function
      await handleImageUploadImmediate(files);
      
      setAnalysisStages(prev => prev.map(stage => 
        stage.id === 'upload' ? { ...stage, status: 'completed', progress: 100 } : stage
      ));
      setOverallProgress(33);
      
      // Stage 2: Metadata Extraction (Google Vision - Background)
      setCurrentStage('processing');
      setAnalysisStages(prev => prev.map(stage => 
        stage.id === 'processing' ? { ...stage, status: 'active' } : stage
      ));
      
      // Wait for upload to complete and images to be saved to database
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadDataFromDatabase();
      
      // Get uploaded image IDs to extract metadata for
      const fileNames = files.map(f => f.name);
      
      // Trigger metadata extraction with proper database lookup
      const metadataPromises = files.map(async (file, index) => {
        // Wait a bit longer for each subsequent image to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, index * 500));
        
        // Find the corresponding uploaded image by name
        const { data: imageData } = await supabase
          .from('images')
          .select('id, storage_path')
          .eq('original_name', file.name)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (imageData?.id && imageData?.storage_path) {
          return extractMetadataForImage(imageData.id);
        } else {
          console.warn('Could not find database record for uploaded file:', file.name);
          return false;
        }
      });
      
      // Execute all metadata extractions (they'll be properly debounced internally)
      Promise.allSettled(metadataPromises).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const failed = results.length - successful;
        console.log(`Metadata extraction results: ${successful} successful, ${failed} failed`);
      });
      
      setAnalysisStages(prev => prev.map(stage => 
        stage.id === 'processing' ? { ...stage, status: 'completed', progress: 100 } : stage
      ));
      setOverallProgress(66);
      
      // Stage 3: Complete
      setCurrentStage('analysis');
      setAnalysisStages(prev => prev.map(stage => 
        stage.id === 'analysis' ? { ...stage, status: 'completed', progress: 100 } : stage
      ));
      setOverallProgress(100);
      
      // Navigate to canvas
      navigate('/canvas');
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setAnalysisStages(prev => prev.map(stage => 
        stage.id === currentStage ? { ...stage, status: 'error', error: 'Failed' } : stage
      ));
    }
  }, [handleImageUploadImmediate, navigate, currentStage, loadDataFromDatabase, extractMetadataForImage]);

  const handleUploadComplete = useCallback(async (files: File[]) => {
    // Check if we need to show session dialog
    if (hasPreviousData) {
      setPendingFiles(files);
      setSessionDialogOpen(true);
      return;
    }

    // No previous data, proceed directly
    await processUploadWithProgress(files);
  }, [processUploadWithProgress, hasPreviousData]);

  const handleCreateNewProject = useCallback(async (name?: string, description?: string) => {
    try {
      // Create new project and switch to it
      await ProjectService.createNewProject(name, description);
      
      // Clear current state silently for new project
      handleClearCanvas({ silent: true, forNewProject: true });
      
      // Process the upload with progress tracking
      if (pendingFiles.length > 0) {
        await processUploadWithProgress(pendingFiles);
        setPendingFiles([]);
      }
    } catch (error) {
      console.error('Failed to create new project:', error);
      setUploadError('Failed to create new project');
    }
  }, [pendingFiles, processUploadWithProgress, handleClearCanvas]);

  const handleAddToCurrent = useCallback(async () => {
    try {
      // Process the upload in current project with progress tracking
      if (pendingFiles.length > 0) {
        await processUploadWithProgress(pendingFiles);
        setPendingFiles([]);
      }
    } catch (error) {
      console.error('Failed to add to current project:', error);
      setUploadError('Failed to add to current project');
    }
  }, [pendingFiles, processUploadWithProgress]);

  const handleRetryUpload = useCallback(() => {
    if (pendingFiles.length > 0) {
      processUploadWithProgress(pendingFiles);
    }
  }, [pendingFiles, processUploadWithProgress]);

  const handleCancelUpload = useCallback(() => {
    setOverallProgress(0);
    setCurrentStage('');
    setAnalysisStages(createAnalysisStages());
    setUploadError('');
    setPendingFiles([]);
  }, []);

  const handleAddImages = useCallback(() => {
    fileInputRef?.click();
  }, [fileInputRef]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleUploadComplete(files);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  }, [handleUploadComplete]);

  const handleNavigateToPreviousAnalyses = () => {
    navigate('/projects');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Hidden file input */}
      <input
        ref={setFileInputRef}
        type="file"
        accept="image/*,.html"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      <Sidebar 
        onClearCanvas={handleClearCanvas}
        onAddImages={handleAddImages}
        uploadedImages={uploadedImages}
        analyses={analyses}
        selectedView="gallery"
        onViewChange={() => {}}
        selectedImageId={selectedImageId}
        onImageSelect={handleImageSelect}
        showAnnotations={showAnnotations}
        onToggleAnnotations={handleToggleAnnotations}
        onNavigateToPreviousAnalyses={handleNavigateToPreviousAnalyses}
      />
      
      <div className="flex-1">
        <div className="h-full flex flex-col items-center justify-center p-8 gap-6">
          <AnalysisStatusIndicator />
          <EnhancedUploadProgress
            stages={analysisStages}
            currentStage={currentStage}
            overallProgress={overallProgress}
            isActive={overallProgress > 0 && overallProgress < 100}
            onCancel={handleCancelUpload}
            onRetry={handleRetryUpload}
            error={uploadError}
          />
          <AnalysisErrorBoundary>
            <UploadErrorBoundary>
              <ImageUploadZone 
                onImageUpload={handleUploadComplete} 
                isUploading={overallProgress > 0 && overallProgress < 100}
              />
            </UploadErrorBoundary>
          </AnalysisErrorBoundary>
        </div>
      </div>

      <NewSessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        onCreateNew={handleCreateNewProject}
        onAddToCurrent={handleAddToCurrent}
        hasPreviousData={hasPreviousData}
      />
    </div>
  );
};

export default Upload;