import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UXAnalysis, UploadedImage, GeneratedConcept, ImageGroup, GroupAnalysis, GroupPromptSession, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { generateMockAnalysis } from '@/data/mockAnalysis';
import { generateMockGroupAnalysis } from '@/data/mockGroupAnalysis';
import { useImageViewer } from '@/hooks/useImageViewer';
import { useAuth } from '@/context/AuthContext';
import { DataMigrationService, ProjectService } from '@/services/DataMigrationService';
import { CanvasStateService, CanvasState } from '@/services/CanvasStateService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  
  // Migration state
  isLoading: boolean;
  isSyncing: boolean;
  
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
  
  // Migration actions
  syncToDatabase: () => Promise<void>;
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
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Existing state
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
  
  // Migration state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  const { state: viewerState, toggleAnnotation, clearAnnotations } = useImageViewer();

  // Load data from database when user authenticates
  useEffect(() => {
    if (user && !isLoading) {
      loadDataFromDatabase();
    } else if (!user) {
      // Reset project ID when user logs out
      ProjectService.resetProject();
    }
  }, [user]);

  const loadDataFromDatabase = async () => {
    setIsLoading(true);
    try {
      const result = await DataMigrationService.loadAllFromDatabase();
      if (result.success && result.data) {
        setUploadedImages(result.data.uploadedImages);
        setAnalyses(result.data.analyses);
        setImageGroups(result.data.imageGroups);
        setGroupAnalysesWithPrompts(result.data.groupAnalysesWithPrompts);
        setGeneratedConcepts(result.data.generatedConcepts);
        setGroupAnalyses(result.data.groupAnalyses);
        setGroupPromptSessions(result.data.groupPromptSessions);
      }
    } catch (error) {
      console.error('Failed to load data from database:', error);
      toast({
        title: "Loading failed",
        description: "Could not load your data. You can continue working and sync later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncToDatabase = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      const result = await DataMigrationService.migrateAllToDatabase({
        uploadedImages,
        analyses,
        imageGroups,
        groupAnalysesWithPrompts
      });
      
      if (result.success) {
        toast({
          title: "Synced successfully",
          description: "Your data has been saved to the cloud.",
        });
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Failed to sync to database:', error);
      toast({
        title: "Sync failed",
        description: "Could not save your data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImageUpload = useCallback(async (files: File[]) => {
    const newImages: UploadedImage[] = [];
    const newAnalyses: UXAnalysis[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageId = `img-${Date.now()}-${i}`;

      // Get actual image dimensions first
      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const imageUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(imageUrl); // Clean up
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load image'));
        };
        img.src = imageUrl;
      });

      let imageUrl = URL.createObjectURL(file);
      
      // If user is authenticated, upload to Supabase Storage
      if (user) {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const fileName = `${authUser.id}/${imageId}/${file.name}`;
            const { error: uploadError } = await supabase.storage
              .from('images')
              .upload(fileName, file);

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);
              imageUrl = urlData.publicUrl;
            }
          }
        } catch (error) {
          console.error('Failed to upload to storage, using local URL:', error);
        }
      }

      // Create uploaded image record with actual storage URL or local fallback
      const uploadedImage: UploadedImage = {
        id: imageId,
        name: file.name,
        url: imageUrl,
        file,
        dimensions,
      };

      // Generate analysis via edge function if authenticated, otherwise use mock
      let analysis;
      if (user) {
        try {
          const { data, error } = await supabase.functions.invoke('ux-analysis', {
            body: {
              type: 'ANALYZE_IMAGE',
              payload: {
                imageId,
                imageUrl,
                imageName: file.name,
                userContext: ''
              }
            }
          });
          
          if (error) throw error;
          if (data.success) {
            analysis = data.data;
          } else {
            throw new Error('Analysis failed');
          }
        } catch (error) {
          console.error('Edge function analysis failed, using mock:', error);
          analysis = generateMockAnalysis(imageId, file.name, imageUrl);
        }
      } else {
        analysis = generateMockAnalysis(imageId, file.name, imageUrl);
      }

      newImages.push(uploadedImage);
      newAnalyses.push(analysis);
    }

    setUploadedImages(prev => [...prev, ...newImages]);
    setAnalyses(prev => [...prev, ...newAnalyses]);
    
    // Auto-select first image if none selected
    if (!selectedImageId && newImages.length > 0) {
      setSelectedImageId(newImages[0].id);
    }

    // Auto-sync to database if user is authenticated
    if (user) {
      setTimeout(() => syncToDatabase(), 1000);
    }
  }, [selectedImageId, user]);

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

  const handleCreateGroup = useCallback(async (imageIds: string[]) => {
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
    
    // Update local state immediately for instant UI response
    setImageGroups(prev => [...prev, newGroup]);
    
    // Persist to database if user is authenticated
    if (user) {
      try {
        const projectId = await ProjectService.getCurrentProject();
        const { data, error } = await supabase
          .from('image_groups')
          .insert({
            id: groupId,
            project_id: projectId,
            name: newGroup.name,
            description: newGroup.description,
            color: newGroup.color,
            position: newGroup.position as any
          })
          .select()
          .single();

        if (error) throw error;

        // Insert group-image associations
        if (imageIds.length > 0) {
          const associations = imageIds.map(imageId => ({
            group_id: groupId,
            image_id: imageId
          }));

          const { error: associationError } = await supabase
            .from('group_images')
            .insert(associations);

          if (associationError) throw associationError;
        }

        toast({
          title: "Group created",
          description: `${newGroup.name} has been created with ${imageIds.length} images.`,
        });
      } catch (error) {
        console.error('Failed to persist group:', error);
        toast({
          title: "Group created locally",
          description: "Group was created but may not sync until you're online.",
          variant: "destructive",
        });
      }
    }
  }, [imageGroups.length, user, toast]);

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
      let analysis: GroupAnalysisWithPrompt;
      
      // Use edge function for authenticated users, mock for others
      if (user) {
        try {
          const { data, error } = await supabase.functions.invoke('ux-analysis', {
            body: {
              type: 'ANALYZE_GROUP',
              payload: {
                groupId,
                prompt,
                isCustom,
                imageIds: imageGroups.find(g => g.id === groupId)?.imageIds || []
              }
            }
          });
          
          if (error) throw error;
          
          if (data.success) {
            // Transform edge function response to match our interface
            analysis = {
              id: `analysis-${Date.now()}`,
              sessionId,
              groupId,
              prompt,
              summary: data.data.summary,
              insights: data.data.insights,
              recommendations: data.data.recommendations,
              patterns: data.data.patterns,
              createdAt: new Date(),
            };
            
            // Persist analysis to database
            await supabase
              .from('group_analyses')
              .insert({
                id: analysis.id,
                group_id: groupId,
                prompt,
                is_custom: isCustom,
                summary: analysis.summary as any,
                insights: analysis.insights as any,
                recommendations: analysis.recommendations as any,
                patterns: analysis.patterns as any
              });
              
          } else {
            throw new Error('Group analysis failed');
          }
        } catch (error) {
          console.error('Edge function group analysis failed, using mock:', error);
          // Fall back to mock analysis
          analysis = {
            id: `analysis-${Date.now()}`,
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
        }
      } else {
        // Mock analysis for unauthenticated users
        await new Promise(resolve => setTimeout(resolve, 3000));
        analysis = {
          id: `analysis-${Date.now()}`,
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
      }
      
      setGroupAnalysesWithPrompts(prev => [...prev, analysis]);
      
      // Update session status
      setGroupPromptSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, status: 'completed' } : s)
      );

      toast({
        title: "Group analysis complete",
        description: `Analysis for "${prompt}" has been generated.`,
      });
      
    } catch (error) {
      console.error('Group analysis failed:', error);
      // Update session status to error
      setGroupPromptSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, status: 'error' } : s)
      );
      
      toast({
        title: "Analysis failed",
        description: "Could not complete the group analysis. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, imageGroups, toast]);

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
    isLoading,
    isSyncing,
    
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
    syncToDatabase,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
