import React, { useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const navigate = useNavigate();
  const { 
    uploadedImages, 
    analyses, 
    selectedImageId,
    showAnnotations,
    handleImageUpload,
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations
  } = useAppContext();

  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  const handleAddImages = useCallback(() => {
    fileInputRef?.click();
  }, [fileInputRef]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleImageUpload(files).then(() => {
        // Navigate to canvas after upload
        navigate('/canvas');
      });
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  }, [handleImageUpload, navigate]);

  const handleNavigateToPreviousAnalyses = () => {
    navigate('/projects');
  };

  const handleUploadComplete = useCallback(async (files: File[]) => {
    await handleImageUpload(files);
    navigate('/canvas');
  }, [handleImageUpload, navigate]);

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
        <div className="h-full flex items-center justify-center">
          <ImageUploadZone onImageUpload={handleUploadComplete} />
        </div>
      </div>
    </div>
  );
};

export default Upload;