import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { UploadErrorBoundary } from '@/components/UploadErrorBoundary';
import { AnalysisStatusIndicator } from '@/components/AnalysisStatusIndicator';
import { UploadStatusIndicator } from '@/components/UploadStatusIndicator';
import { NewSessionDialog } from '@/components/NewSessionDialog';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { DataMigrationService, ProjectService } from '@/services/DataMigrationService';

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
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations,
    loadDataFromDatabase
  } = useAppContext();

  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [hasPreviousData, setHasPreviousData] = useState(false);

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

  const handleUploadComplete = useCallback(async (files: File[]) => {
    // Check if we need to show session dialog
    if (hasPreviousData) {
      setPendingFiles(files);
      setSessionDialogOpen(true);
      return;
    }

    // No previous data, proceed directly
    try {
      await handleImageUpload(files);
      setTimeout(() => {
        navigate('/canvas');
      }, 100);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [handleImageUpload, navigate, hasPreviousData]);

  const handleCreateNewProject = useCallback(async (name?: string, description?: string) => {
    try {
      // Create new project and switch to it
      await ProjectService.createNewProject(name, description);
      
      // Clear current state
      handleClearCanvas();
      
      // Process the upload
      if (pendingFiles.length > 0) {
        await handleImageUpload(pendingFiles);
        setPendingFiles([]);
        setTimeout(() => {
          navigate('/canvas');
        }, 100);
      }
    } catch (error) {
      console.error('Failed to create new project:', error);
    }
  }, [pendingFiles, handleImageUpload, handleClearCanvas, navigate]);

  const handleAddToCurrent = useCallback(async () => {
    try {
      // Process the upload in current project
      if (pendingFiles.length > 0) {
        await handleImageUpload(pendingFiles);
        setPendingFiles([]);
        setTimeout(() => {
          navigate('/canvas');
        }, 100);
      }
    } catch (error) {
      console.error('Failed to add to current project:', error);
    }
  }, [pendingFiles, handleImageUpload, navigate]);

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
          <UploadStatusIndicator 
            isUploading={isUploading}
            progress={0} // TODO: Add upload progress tracking
          />
          <UploadErrorBoundary>
            <ImageUploadZone onImageUpload={handleUploadComplete} isUploading={isUploading} />
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