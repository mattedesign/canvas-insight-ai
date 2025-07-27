import React, { createContext, useContext, useState, useCallback } from 'react';
import { UXAnalysis, UploadedImage, GeneratedConcept, ImageGroup, GroupAnalysis } from '@/types/ux-analysis';
import { generateMockAnalysis } from '@/data/mockAnalysis';
import { generateMockGroupAnalysis } from '@/data/mockGroupAnalysis';
import { useImageViewer } from '@/hooks/useImageViewer';

interface AppContextType {
  // State
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  generatedConcepts: GeneratedConcept[];
  imageGroups: ImageGroup[];
  groupAnalyses: GroupAnalysis[];
  groupDisplayModes: Record<string, 'standard' | 'stacked'>;
  selectedImageId: string | null;
  showAnnotations: boolean;
  galleryTool: 'cursor' | 'draw';
  isGeneratingConcept: boolean;
  viewerState: ReturnType<typeof useImageViewer>['state'];
  
  // Actions
  handleImageUpload: (files: File[]) => Promise<void>;
  handleGenerateConcept: (analysisId: string) => Promise<void>;
  handleClearCanvas: () => void;
  handleImageSelect: (imageId: string) => void;
  handleToggleAnnotations: () => void;
  handleAnnotationClick: (annotationId: string) => void;
  handleGalleryToolChange: (tool: 'cursor' | 'draw') => void;
  handleAddComment: () => void;
  handleCreateGroup: (name: string, description: string, color: string, imageIds: string[]) => void;
  handleUngroup: (groupId: string) => void;
  handleDeleteGroup: (groupId: string) => void;
  handleGroupDisplayModeChange: (groupId: string, mode: 'standard' | 'stacked') => void;
  toggleAnnotation: (annotationId: string) => void;
  clearAnnotations: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [analyses, setAnalyses] = useState<UXAnalysis[]>([]);
  const [generatedConcepts, setGeneratedConcepts] = useState<GeneratedConcept[]>([]);
  const [imageGroups, setImageGroups] = useState<ImageGroup[]>([]);
  const [groupAnalyses, setGroupAnalyses] = useState<GroupAnalysis[]>([]);
  const [groupDisplayModes, setGroupDisplayModes] = useState<Record<string, 'standard' | 'stacked'>>({});
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [galleryTool, setGalleryTool] = useState<'cursor' | 'draw'>('cursor');
  const [isGeneratingConcept, setIsGeneratingConcept] = useState<boolean>(false);
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
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to load image'));
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
    setIsGeneratingConcept(true);
    
    try {
      const analysis = analyses.find(a => a.id === analysisId);
      if (!analysis) {
        throw new Error('Analysis not found');
      }

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
      
    } catch (error) {
      console.error('Failed to generate concept:', error);
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

  const handleGalleryToolChange = useCallback((tool: 'cursor' | 'draw') => {
    setGalleryTool(tool);
  }, []);

  const handleAddComment = useCallback(() => {
    console.log('Add comment mode activated');
  }, []);

  const handleCreateGroup = useCallback((name: string, description: string, color: string, imageIds: string[]) => {
    const groupId = `group-${Date.now()}`;
    const newGroup: ImageGroup = {
      id: groupId,
      name,
      description,
      imageIds,
      position: { x: 100, y: 100 }, // Default position, will be calculated in canvas
      color,
      createdAt: new Date(),
    };

    // Generate group analysis
    const groupAnalysis = generateMockGroupAnalysis(groupId, name);
    
    setImageGroups(prev => [...prev, newGroup]);
    setGroupAnalyses(prev => [...prev, groupAnalysis]);
  }, []);

  const handleUngroup = useCallback((groupId: string) => {
    setImageGroups(prev => prev.filter(group => group.id !== groupId));
    setGroupAnalyses(prev => prev.filter(analysis => analysis.groupId !== groupId));
  }, []);

  const handleDeleteGroup = useCallback((groupId: string) => {
    setImageGroups(prev => prev.filter(group => group.id !== groupId));
    setGroupAnalyses(prev => prev.filter(analysis => analysis.groupId !== groupId));
    setGroupDisplayModes(prev => {
      const newModes = { ...prev };
      delete newModes[groupId];
      return newModes;
    });
  }, []);

  const handleGroupDisplayModeChange = useCallback((groupId: string, mode: 'standard' | 'stacked') => {
    setGroupDisplayModes(prev => ({
      ...prev,
      [groupId]: mode
    }));
  }, []);

  const value: AppContextType = {
    // State
    uploadedImages,
    analyses,
    generatedConcepts,
    imageGroups,
    groupAnalyses,
    groupDisplayModes,
    selectedImageId,
    showAnnotations,
    galleryTool,
    isGeneratingConcept,
    viewerState,
    
    // Actions
    handleImageUpload,
    handleGenerateConcept,
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations,
    handleAnnotationClick,
    handleGalleryToolChange,
    handleAddComment,
    handleCreateGroup,
    handleUngroup,
    handleDeleteGroup,
    handleGroupDisplayModeChange,
    toggleAnnotation,
    clearAnnotations,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};