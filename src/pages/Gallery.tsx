import React, { useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ImageViewer } from '@/components/ImageViewer';
import { ContextualPanel } from '@/components/ContextualPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

const Gallery = () => {
  const navigate = useNavigate();
  const { 
    uploadedImages, 
    analyses, 
    selectedImageId,
    showAnnotations,
    viewerState,
    galleryTool,
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations,
    handleAnnotationClick,
    handleGalleryToolChange,
    handleAddComment
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
    if (view === 'canvas') {
      navigate('/canvas');
    } else if (view === 'summary') {
      navigate('/dashboard');
    }
  };

  const selectedAnalysis = selectedImageId ? analyses.find(a => a.imageId === selectedImageId) : null;

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
        selectedView="gallery"
        onViewChange={handleViewChange}
        selectedImageId={selectedImageId}
        onImageSelect={handleImageSelect}
        showAnnotations={showAnnotations}
        onToggleAnnotations={handleToggleAnnotations}
        onNavigateToPreviousAnalyses={handleNavigateToPreviousAnalyses}
      />
      
      <div className="flex-1 relative">
        <ResizablePanelGroup direction="horizontal" className="w-full h-full">
          <ResizablePanel defaultSize={70} minSize={50}>
            {selectedAnalysis ? (
              <ImageViewer
                analysis={selectedAnalysis}
                selectedAnnotations={viewerState.selectedAnnotations}
                onAnnotationClick={handleAnnotationClick}
                onViewChange={handleViewChange}
                onDeleteImage={() => {
                  // Handle image deletion
                  const imageIndex = uploadedImages.findIndex(img => img.id === selectedImageId);
                  const analysisIndex = analyses.findIndex(a => a.imageId === selectedImageId);
                  
                  if (imageIndex !== -1) {
                    // setUploadedImages(prev => prev.filter((_, index) => index !== imageIndex));
                  }
                  if (analysisIndex !== -1) {
                    // setAnalyses(prev => prev.filter((_, index) => index !== analysisIndex));
                  }
                  
                  // Select next available image or redirect to upload
                  const remainingImages = uploadedImages.filter(img => img.id !== selectedImageId);
                  if (remainingImages.length > 0) {
                    handleImageSelect(remainingImages[0].id);
                  } else {
                    navigate('/upload');
                  }
                }}
                showAnnotations={showAnnotations}
                onToggleAnnotations={handleToggleAnnotations}
                onToolChange={handleGalleryToolChange}
                onAddComment={handleAddComment}
                currentTool={galleryTool}
                imageDimensions={uploadedImages.find(img => img.id === selectedImageId)?.dimensions}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Select an image to view details</p>
              </div>
            )}
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
            <ContextualPanel
              analysis={selectedAnalysis}
              selectedAnnotations={viewerState.selectedAnnotations}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Gallery;