import React, { useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { CanvasView } from '@/components/canvas/CanvasView';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

const Canvas = () => {
  const navigate = useNavigate();
  const { 
    uploadedImages, 
    analyses, 
    generatedConcepts,
    imageGroups,
    groupAnalyses,
    groupDisplayModes,
    selectedImageId,
    showAnnotations,
    isGeneratingConcept,
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations,
    handleGenerateConcept,
    handleCreateGroup,
    handleUngroup,
    handleDeleteGroup,
    handleGroupDisplayModeChange
  } = useAppContext();

  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  const handleAddImages = useCallback(() => {
    fileInputRef?.click();
  }, [fileInputRef]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // Handle additional image uploads
    }
    event.target.value = '';
  }, []);

  const handleNavigateToPreviousAnalyses = () => {
    navigate('/projects');
  };

  const handleViewChange = (view: 'gallery' | 'canvas' | 'summary') => {
    if (view === 'gallery') {
      navigate('/gallery');
    } else if (view === 'summary') {
      navigate('/dashboard');
    }
  };

  // Redirect to upload if no images
  if (uploadedImages.length === 0) {
    navigate('/upload');
    return null;
  }

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
        selectedView="canvas"
        onViewChange={handleViewChange}
        selectedImageId={selectedImageId}
        onImageSelect={handleImageSelect}
        showAnnotations={showAnnotations}
        onToggleAnnotations={handleToggleAnnotations}
        onNavigateToPreviousAnalyses={handleNavigateToPreviousAnalyses}
      />
      
      <div className="flex-1 relative">
        <CanvasView 
          uploadedImages={uploadedImages} 
          analyses={analyses}
          generatedConcepts={generatedConcepts}
          imageGroups={imageGroups}
          groupAnalyses={groupAnalyses}
          groupDisplayModes={groupDisplayModes}
          showAnnotations={showAnnotations}
          onToggleAnnotations={handleToggleAnnotations}
          onViewChange={handleViewChange}
          onImageSelect={handleImageSelect}
          onGenerateConcept={handleGenerateConcept}
          onCreateGroup={handleCreateGroup}
          onUngroup={handleUngroup}
          onDeleteGroup={handleDeleteGroup}
          onGroupDisplayModeChange={handleGroupDisplayModeChange}
          isGeneratingConcept={isGeneratingConcept}
        />
      </div>
    </div>
  );
};

export default Canvas;