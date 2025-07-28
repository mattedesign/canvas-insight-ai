import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { UploadErrorBoundary } from '@/components/UploadErrorBoundary';
import { AnalysisStatusIndicator } from '@/components/AnalysisStatusIndicator';
import { UploadStatusIndicator } from '@/components/UploadStatusIndicator';
import { EnhancedUploadProgress, createAnalysisStages } from '@/components/EnhancedUploadProgress';
import { NewSessionDialog } from '@/components/NewSessionDialog';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { DataMigrationService, ProjectService } from '@/services/DataMigrationService';
import { supabase } from '@/integrations/supabase/client';

const Upload = () => {
  const navigate = useNavigate();
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
      
      // Trigger metadata extraction for uploaded images in background
      for (const image of uploadedImages) {
        try {
          // Trigger Google Vision metadata extraction in background
          await supabase.functions.invoke('google-vision-metadata', {
            body: {
              imageId: image.id,
              imageUrl: image.url, // Use the image URL directly
              features: ['labels', 'text', 'faces', 'objects', 'colors']
            }
          });
        } catch (error) {
          console.warn('Metadata extraction failed for image:', image.id, error);
          // Don't fail the upload process if metadata extraction fails
        }
      }
      
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
  }, [handleImageUploadImmediate, navigate, currentStage]);

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
      
      // Clear current state
      handleClearCanvas();
      
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
          <UploadErrorBoundary>
            <ImageUploadZone 
              onImageUpload={handleUploadComplete} 
              isUploading={overallProgress > 0 && overallProgress < 100}
            />
          </UploadErrorBoundary>
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