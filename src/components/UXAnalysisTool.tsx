import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { generateTitleFromPrompt } from '@/utils/promptGenerator';
import { toast } from 'sonner';
import { useProject } from '@/contexts/ProjectContext';
import { imageService } from '@/services/imageService';
import { analysisService } from '@/services/analysisService';


export const UXAnalysisTool: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [analyses, setAnalyses] = useState<UXAnalysis[]>([]);
  const [generatedConcepts, setGeneratedConcepts] = useState<GeneratedConcept[]>([]);
  const [selectedView, setSelectedView] = useState<'gallery' | 'canvas' | 'summary'>('summary');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [galleryTool, setGalleryTool] = useState<'cursor' | 'draw'>('cursor');
  const [isGeneratingConcept, setIsGeneratingConcept] = useState<boolean>(false);
  const { state: viewerState, toggleAnnotation, clearAnnotations } = useImageViewer();

  const handleImageUpload = useCallback(async (files: File[]) => {
    if (!currentProject) {
      toast.error('Please select a project first');
      return;
    }

    const newImages: UploadedImage[] = [];
    const newAnalyses: UXAnalysis[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Upload to Supabase Storage
        const imageUrl = await imageService.uploadImageFile(file, currentProject.id);
        
        // Get actual image dimensions
        const img = new Image();
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = imageUrl;
        });

        // Create image record in database
        const uploadedImage = await imageService.createImage({
          projectId: currentProject.id,
          name: file.name,
          url: imageUrl,
          file,
          dimensions,
        });

        // Generate mock analysis (in production, this would call your AI service)
        const mockAnalysis = generateMockAnalysis(
          uploadedImage.id, 
          file.name, 
          imageUrl, 
          currentProject.id
        );
        
        // Save analysis to database
        const savedAnalysis = await analysisService.createAnalysis(mockAnalysis);

        newImages.push(uploadedImage);
        newAnalyses.push(savedAnalysis);
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newImages.length > 0) {
      setUploadedImages(prev => [...prev, ...newImages]);
      setAnalyses(prev => [...prev, ...newAnalyses]);
      
      // Auto-select first image if none selected
      if (!selectedImageId && newImages.length > 0) {
        setSelectedImageId(newImages[0].id);
      }
      
      toast.success(`Successfully uploaded ${newImages.length} image(s)`);
    }
  }, [selectedImageId, currentProject]);

  const handleGenerateConcept = useCallback(async (analysisId: string) => {
    setIsGeneratingConcept(true);
    
    try {
      const analysis = analyses.find(a => a.id === analysisId);
      if (!analysis) {
        throw new Error('Analysis not found');
      }

      toast.info('Generating concept visualization...');
      
      // Simulate concept generation with mock data
      await new Promise(resolve => setTimeout(resolve, 2000));

      const conceptId = `concept-${Date.now()}`;
      const title = `Enhanced Design Concept`;
      
      const newConcept: GeneratedConcept = {
        id: conceptId,
        analysisId,
        imageUrl: `https://picsum.photos/1024/768?random=${conceptId}`,
        title,
        description: `A conceptual design addressing key usability issues identified in the analysis. This improved version implements best practices for enhanced user experience.`,
        improvements: analysis.suggestions
          .filter(s => s.impact === 'high')
          .slice(0, 5)
          .map(s => s.title),
        createdAt: new Date()
      };
      
      setGeneratedConcepts(prev => [...prev, newConcept]);
      toast.success('Concept visualization generated!');
      
    } catch (error) {
      console.error('Failed to generate concept:', error);
      toast.error('Failed to generate concept. Please try again.');
    } finally {
      setIsGeneratingConcept(false);
    }
  }, [analyses]);

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

  const handleGalleryToolChange = useCallback((tool: 'cursor' | 'draw') => {
    setGalleryTool(tool);
  }, []);

  const handleAddComment = useCallback(() => {
    // This could open a comment mode or show a toast
    console.log('Add comment mode activated');
  }, []);

  const handleNavigateToPreviousAnalyses = useCallback(() => {
    navigate('/previous-analyses');
  }, [navigate]);


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
        onNavigateToPreviousAnalyses={handleNavigateToPreviousAnalyses}
        currentProject={currentProject}
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
            isGeneratingConcept={isGeneratingConcept}
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
        )}
      </div>
    </div>
  );
};