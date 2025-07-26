import React, { useState, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
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
  const [selectedView, setSelectedView] = useState<'gallery' | 'canvas' | 'summary'>('canvas');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
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

  const handleClearCanvas = useCallback(() => {
    setUploadedImages([]);
    setAnalyses([]);
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


  const showGalleryView = selectedView === 'gallery';
  const showCanvasView = selectedView === 'canvas';
  const showSummaryView = selectedView === 'summary';
  const selectedAnalysis = selectedImageId ? analyses.find(a => a.imageId === selectedImageId) : null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        onClearCanvas={handleClearCanvas}
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
          <CanvasView uploadedImages={uploadedImages} analyses={analyses} showAnnotations={showAnnotations} />
        ) : (
          <ResizablePanelGroup direction="horizontal" className="w-full h-full">
            <ResizablePanel defaultSize={70} minSize={50}>
              {selectedAnalysis ? (
                <ImageViewer
                  analysis={selectedAnalysis}
                  selectedAnnotations={viewerState.selectedAnnotations}
                  onAnnotationClick={handleAnnotationClick}
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