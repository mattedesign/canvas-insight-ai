import React, { useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { UploadErrorBoundary } from '@/components/UploadErrorBoundary';
import { AnalysisStatusIndicator } from '@/components/AnalysisStatusIndicator';
import { UploadStatusIndicator } from '@/components/UploadStatusIndicator';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

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
    handleToggleAnnotations
  } = useAppContext();

  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  const handleUploadComplete = useCallback(async (files: File[]) => {
    try {
      await handleImageUpload(files);
      // Add a small delay to ensure state updates are processed
      setTimeout(() => {
        navigate('/canvas');
      }, 100);
    } catch (error) {
      console.error('Upload failed:', error);
      // Error handling is already done in AppContext
    }
  }, [handleImageUpload, navigate]);

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
    </div>
  );
};

export default Upload;