import React, { createContext, useContext, useState, useCallback } from 'react';
import { UXAnalysis, UploadedImage, GeneratedConcept, ImageGroup, GroupAnalysis, GroupPromptSession, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
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
  groupPromptSessions: GroupPromptSession[];
  groupAnalysesWithPrompts: GroupAnalysisWithPrompt[];
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
  handleCreateGroup: (imageIds: string[]) => void;
  handleUngroup: (groupId: string) => void;
  handleDeleteGroup: (groupId: string) => void;
  handleEditGroup: (groupId: string, name: string, description: string, color: string) => void;
  handleGroupDisplayModeChange: (groupId: string, mode: 'standard' | 'stacked') => void;
  handleSubmitGroupPrompt: (groupId: string, prompt: string, isCustom: boolean) => Promise<void>;
  handleEditGroupPrompt: (sessionId: string) => void;
  handleCreateFork: (sessionId: string) => void;
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
  const [groupPromptSessions, setGroupPromptSessions] = useState<GroupPromptSession[]>([]);
  const [groupAnalysesWithPrompts, setGroupAnalysesWithPrompts] = useState<GroupAnalysisWithPrompt[]>([]);
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

  const handleCreateGroup = useCallback((imageIds: string[]) => {
    const groupId = `group-${Date.now()}`;
    const groupNumber = imageGroups.length + 1;
    const defaultColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const color = defaultColors[(groupNumber - 1) % defaultColors.length];
    
    const newGroup: ImageGroup = {
      id: groupId,
      name: `Group ${groupNumber}`,
      description: '',
      imageIds,
      position: { x: 100, y: 100 }, // Default position, will be calculated in canvas
      color,
      createdAt: new Date(),
    };
    
    setImageGroups(prev => [...prev, newGroup]);
    // Note: No longer auto-generating analysis - waiting for prompt submission
  }, [imageGroups.length]);

  const handleUngroup = useCallback((groupId: string) => {
    setImageGroups(prev => prev.filter(group => group.id !== groupId));
    setGroupAnalyses(prev => prev.filter(analysis => analysis.groupId !== groupId));
    setGroupPromptSessions(prev => prev.filter(session => session.groupId !== groupId));
    setGroupAnalysesWithPrompts(prev => prev.filter(analysis => analysis.groupId !== groupId));
  }, []);

  const handleDeleteGroup = useCallback((groupId: string) => {
    setImageGroups(prev => prev.filter(group => group.id !== groupId));
    setGroupAnalyses(prev => prev.filter(analysis => analysis.groupId !== groupId));
    setGroupPromptSessions(prev => prev.filter(session => session.groupId !== groupId));
    setGroupAnalysesWithPrompts(prev => prev.filter(analysis => analysis.groupId !== groupId));
    setGroupDisplayModes(prev => {
      const newModes = { ...prev };
      delete newModes[groupId];
      return newModes;
    });
  }, []);

  const handleEditGroup = useCallback((groupId: string, name: string, description: string, color: string) => {
    setImageGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, name, description, color }
        : group
    ));
  }, []);

  const handleGroupDisplayModeChange = useCallback((groupId: string, mode: 'standard' | 'stacked') => {
    setGroupDisplayModes(prev => ({
      ...prev,
      [groupId]: mode
    }));
  }, []);

  const handleSubmitGroupPrompt = useCallback(async (groupId: string, prompt: string, isCustom: boolean) => {
    const sessionId = `session-${Date.now()}`;
    
    // Create prompt session
    const session: GroupPromptSession = {
      id: sessionId,
      groupId,
      prompt,
      isCustom,
      status: 'processing',
      createdAt: new Date(),
    };
    
    setGroupPromptSessions(prev => [...prev, session]);
    
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create analysis with prompt
      const analysisId = `analysis-${Date.now()}`;
      const analysis: GroupAnalysisWithPrompt = {
        id: analysisId,
        sessionId,
        groupId,
        prompt,
        summary: {
          overallScore: 75 + Math.floor(Math.random() * 20),
          consistency: 70 + Math.floor(Math.random() * 25),
          thematicCoherence: 80 + Math.floor(Math.random() * 15),
          userFlowContinuity: 65 + Math.floor(Math.random() * 30),
        },
        insights: [
          'Visual hierarchy is consistently applied across all screens',
          'Color palette maintains brand consistency throughout the group',
          'Typography scale follows design system guidelines',
          'Navigation patterns are coherent and intuitive',
        ],
        recommendations: [
          'Consider standardizing button sizes across all screens',
          'Implement consistent spacing patterns for better visual rhythm',
          'Align call-to-action placement for improved user flow',
        ],
        patterns: {
          commonElements: ['Primary buttons', 'Navigation bar', 'Card components', 'Form inputs'],
          designInconsistencies: ['Button sizes', 'Icon styles', 'Shadow depths'],
          userJourneyGaps: ['Missing back navigation', 'Unclear progress indicators'],
        },
        createdAt: new Date(),
      };
      
      setGroupAnalysesWithPrompts(prev => [...prev, analysis]);
      
      // Update session status
      setGroupPromptSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, status: 'completed' } : s)
      );
      
    } catch (error) {
      // Update session status to error
      setGroupPromptSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, status: 'error' } : s)
      );
    }
  }, []);

  const handleEditGroupPrompt = useCallback((sessionId: string) => {
    const session = groupPromptSessions.find(s => s.id === sessionId);
    if (session) {
      // Create new session for editing (branching)
      const newSessionId = `session-${Date.now()}`;
      const newSession: GroupPromptSession = {
        id: newSessionId,
        groupId: session.groupId,
        prompt: session.prompt,
        isCustom: true,
        status: 'pending',
        parentSessionId: sessionId,
        createdAt: new Date(),
      };
      
      setGroupPromptSessions(prev => [...prev, newSession]);
    }
  }, [groupPromptSessions]);

  const handleCreateFork = useCallback((sessionId: string) => {
    const session = groupPromptSessions.find(s => s.id === sessionId);
    if (session) {
      // Create new session as a fork
      const newSessionId = `session-${Date.now()}`;
      const newSession: GroupPromptSession = {
        id: newSessionId,
        groupId: session.groupId,
        prompt: '',
        isCustom: true,
        status: 'pending',
        parentSessionId: sessionId,
        createdAt: new Date(),
      };
      
      setGroupPromptSessions(prev => [...prev, newSession]);
    }
  }, [groupPromptSessions]);

  const value: AppContextType = {
    // State
    uploadedImages,
    analyses,
    generatedConcepts,
    imageGroups,
    groupAnalyses,
    groupPromptSessions,
    groupAnalysesWithPrompts,
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
    handleEditGroup,
    handleGroupDisplayModeChange,
    handleSubmitGroupPrompt,
    handleEditGroupPrompt,
    handleCreateFork,
    toggleAnnotation,
    clearAnnotations,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};