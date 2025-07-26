import React, { useState, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { UXAnalysis, UploadedImage, GeneratedConcept } from '@/types/ux-analysis';
import { generateMockAnalysis } from '@/data/mockAnalysis';
import { ImageUploadZone } from './ImageUploadZone';
import { Sidebar } from './Sidebar';
import { SummaryDashboard } from './summary/SummaryDashboard';
import { ImageViewer } from './ImageViewer';
import { ContextualPanel } from './ContextualPanel';
import { CanvasView } from './canvas/CanvasView';
import { useImageViewer } from '@/hooks/useImageViewer';


export const UXAnalysisTool: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [analyses, setAnalyses] = useState<UXAnalysis[]>([]);
  const [generatedConcepts, setGeneratedConcepts] = useState<GeneratedConcept[]>([]);
  const [selectedView, setSelectedView] = useState<'gallery' | 'canvas' | 'summary'>('canvas');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [galleryTool, setGalleryTool] = useState<'hand' | 'cursor' | 'draw'>('hand');
  const { state: viewerState, toggleAnnotation, clearAnnotations } = useImageViewer();

  const handleImageUpload = useCallback(async (files: File[]) => {
    const newImages: UploadedImage[] = [];
    const newAnalyses: UXAnalysis[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageId = `img-${Date.now()}-${i}`;
      const imageUrl = URL.createObjectURL(file);

      // Get actual image dimensions
      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = imageUrl;
      });

      // Create uploaded image record with full resolution
      const uploadedImage: UploadedImage = {
        id: imageId,
        name: file.name,
        url: imageUrl,
        file,
        dimensions,
      };

      // Generate mock analysis
      const analysis = generateMockAnalysis(imageId, file.name, imageUrl);

      newImages.push(uploadedImage);
      newAnalyses.push(analysis);
    }

    setUploadedImages(prev => [...prev, ...newImages]);
    setAnalyses(prev => [...prev, ...newAnalyses]);
    
    // Auto-select first image if none selected
    if (!selectedImageId && newImages.length > 0) {
      setSelectedImageId(newImages[0].id);
    }
  }, [selectedImageId]);

  const handleGenerateConcept = useCallback(async (analysisId: string) => {
    // Simulate concept generation with mock data
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate AI processing time
    
    const conceptId = `concept-${Date.now()}`;
    const mockConcept: GeneratedConcept = {
      id: conceptId,
      analysisId,
      imageUrl: `https://picsum.photos/400/300?random=${Date.now()}`, // Mock generated image
      title: "Enhanced User Experience Design",
      description: "An improved version of the interface with better accessibility, clearer visual hierarchy, and enhanced user flow based on the analysis suggestions.",
      improvements: [
        "Improved color contrast for better accessibility",
        "Simplified navigation structure",
        "Enhanced visual hierarchy with better typography",
        "Optimized button placement and sizing",
        "Added clear call-to-action elements"
      ],
      createdAt: new Date()
    };
    
    setGeneratedConcepts(prev => [...prev, mockConcept]);
  }, []);

  const handleClearCanvas = useCallback(() => {
    setUploadedImages([]);
    setAnalyses([]);
    setGeneratedConcepts([]);
    setSelectedImageId(null);
    clearAnnotations();
  }, [clearAnnotations]);

  const handleImageSelect = useCallback((imageId: string) => {
    setSelectedImageId(imageId);
    clearAnnotations();
  }, [clearAnnotations]);

  const handleToggleAnnotations = useCallback(() => {
    setShowAnnotations(prev => !prev);
  }, []);

  const handleAnnotationClick = useCallback((annotationId: string) => {
    toggleAnnotation(annotationId);
  }, [toggleAnnotation]);

  const handleAddImages = useCallback(() => {
    fileInputRef?.click();
  }, [fileInputRef]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleImageUpload(files);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  }, [handleImageUpload]);

  const handleGalleryToolChange = useCallback((tool: 'hand' | 'cursor' | 'draw') => {
    setGalleryTool(tool);
  }, []);

  const handleAddComment = useCallback(() => {
    // This could open a comment mode or show a toast
    console.log('Add comment mode activated');
  }, []);


  const showGalleryView = selectedView === 'gallery';
  const showCanvasView = selectedView === 'canvas';
  const showSummaryView = selectedView === 'summary';
  const selectedAnalysis = selectedImageId ? analyses.find(a => a.imageId === selectedImageId) : null;

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
        selectedView={selectedView}
        onViewChange={setSelectedView}
        selectedImageId={selectedImageId}
        onImageSelect={handleImageSelect}
        showAnnotations={showAnnotations}
        onToggleAnnotations={handleToggleAnnotations}
      />
      
      <div className="flex-1 relative">
        {showSummaryView ? (
          <SummaryDashboard analyses={analyses} />
        ) : uploadedImages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <ImageUploadZone onImageUpload={handleImageUpload} />
          </div>
        ) : showCanvasView ? (
          <CanvasView 
            uploadedImages={uploadedImages} 
            analyses={analyses}
            generatedConcepts={generatedConcepts}
            showAnnotations={showAnnotations}
            onToggleAnnotations={handleToggleAnnotations}
            onViewChange={setSelectedView}
            onImageSelect={handleImageSelect}
            onGenerateConcept={handleGenerateConcept}
          />
        ) : (
          <ResizablePanelGroup direction="horizontal" className="w-full h-full">
            <ResizablePanel defaultSize={70} minSize={50}>
              {selectedAnalysis ? (
                <ImageViewer
                  analysis={selectedAnalysis}
                  selectedAnnotations={viewerState.selectedAnnotations}
                  onAnnotationClick={handleAnnotationClick}
                  onViewChange={setSelectedView}
                  onDeleteImage={() => {
                    // Handle image deletion
                    const imageIndex = uploadedImages.findIndex(img => img.id === selectedImageId);
                    const analysisIndex = analyses.findIndex(a => a.imageId === selectedImageId);
                    
                    if (imageIndex !== -1) {
                      setUploadedImages(prev => prev.filter((_, index) => index !== imageIndex));
                    }
                    if (analysisIndex !== -1) {
                      setAnalyses(prev => prev.filter((_, index) => index !== analysisIndex));
                    }
                    
                    // Select next available image or null
                    const remainingImages = uploadedImages.filter(img => img.id !== selectedImageId);
                    setSelectedImageId(remainingImages.length > 0 ? remainingImages[0].id : null);
                  }}
                  showAnnotations={showAnnotations}
                  onToggleAnnotations={handleToggleAnnotations}
                  onToolChange={handleGalleryToolChange}
                  onAddComment={handleAddComment}
                  currentTool={galleryTool}
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
        )}
      </div>
    </div>
  );
};