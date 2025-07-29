import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { CanvasView } from '@/components/canvas/CanvasView';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { GroupEditDialog } from '@/components/GroupEditDialog';
import { CanvasUploadZone } from '@/components/CanvasUploadZone';

import { useSimplifiedAppContext } from '@/context/SimplifiedAppContext';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DataMigrationService, ProjectService } from '@/services/DataMigrationService';
import { SlugService } from '@/services/SlugService';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

const Canvas = () => {
  const navigate = useNavigate();
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const { 
    state,
    dispatch,
    stableHelpers,
    loadingMachine
  } = useSimplifiedAppContext();

  // Extract state properties (Phase 2.2: Simplified Context Value)
  const {
    uploadedImages,
    analyses,
    generatedConcepts,
    imageGroups,
    groupAnalysesWithPrompts,
    groupDisplayModes,
    selectedImageId,
    showAnnotations,
    isGeneratingConcept,
    isLoading,
    isUploading
  } = state;

  // Extract helper functions
  const {
    uploadImages: handleImageUpload,
    uploadImagesImmediate: handleImageUploadImmediate,
    syncData: updateAppStateFromDatabase,
    createGroup,
    generateConcept,
    clearCanvas
  } = stableHelpers;

  // Create missing handler functions using dispatch
  const handleClearCanvas = () => clearCanvas();
  const handleImageSelect = (imageId: string) => dispatch({ type: 'SET_SELECTED_IMAGE', payload: imageId });
  const handleToggleAnnotations = () => dispatch({ type: 'TOGGLE_ANNOTATIONS' });
  const handleGenerateConcept = (analysisId: string) => generateConcept(`Generate concept for analysis ${analysisId}`);
  const handleCreateGroup = (imageIds: string[]) => {
    const position = { x: 100, y: 100 };
    createGroup('New Group', 'Created from selection', '#3B82F6', imageIds, position);
  };
  const handleUngroup = (groupId: string) => dispatch({ type: 'DELETE_GROUP', payload: groupId });
  const handleDeleteGroup = (groupId: string) => dispatch({ type: 'DELETE_GROUP', payload: groupId });
  const handleEditGroup = (groupId: string, name: string, description: string, color: string) => {
    dispatch({ type: 'UPDATE_GROUP', payload: { id: groupId, updates: { name, description, color } } });
  };
  const handleGroupDisplayModeChange = (groupId: string, mode: 'standard' | 'stacked') => {
    dispatch({ type: 'SET_GROUP_DISPLAY_MODE', payload: { groupId, mode } });
  };
  const handleSubmitGroupPrompt = async (groupId: string, prompt: string, isCustom: boolean) => {
    // Mock group analysis for now
    const groupAnalysis = {
      id: `analysis-${Date.now()}`,
      sessionId: `session-${Date.now()}`, 
      groupId,
      prompt,
      isCustom,
      summary: {
        overallScore: 85,
        consistency: 80,
        thematicCoherence: 90,
        userFlowContinuity: 85
      },
      insights: [],
      recommendations: [],
      patterns: {
        commonElements: [],
        designInconsistencies: [],
        userJourneyGaps: []
      },
      createdAt: new Date()
    };
    dispatch({ type: 'ADD_GROUP_ANALYSIS', payload: groupAnalysis });
  };
  const handleEditGroupPrompt = (sessionId: string) => {
    console.log('Edit group prompt:', sessionId);
  };
  const handleCreateFork = (sessionId: string) => {
    console.log('Create fork:', sessionId);
  };
  const handleAnalysisComplete = (imageId: string, analysis: any) => {
    dispatch({ type: 'UPDATE_ANALYSIS', payload: { imageId, analysis } });
  };

  // Backward compatibility aliases
  const groupAnalyses = groupAnalysesWithPrompts;
  const groupPromptSessions = groupAnalysesWithPrompts;

  // Track if user has existing data in the database
  const [hasExistingData, setHasExistingData] = useState<boolean | null>(null);
  const [loadAttempted, setLoadAttempted] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string>('temp-project');

  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [groupEditDialogOpen, setGroupEditDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const toast = useFilteredToast();
  
  // Simple state - no more complex canvas state manager

  const handleAddImages = useCallback(() => {
    fileInputRef?.click();
  }, [fileInputRef]);

  // Debounced metadata extraction
  const extractMetadataForImage = useCallback(async (imageId: string) => {
    try {
      const { data: imageData, error: imageError } = await supabase
        .from('images')
        .select('storage_path')
        .eq('id', imageId)
        .single();

      if (imageError) throw imageError;

      const publicUrl = `https://sdcmbfdtafkzpimwjpij.supabase.co/storage/v1/object/public/images/${imageData.storage_path}`;
      
      const { data, error } = await supabase.functions.invoke('google-vision-metadata', {
        body: { imageId, imageUrl: publicUrl }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      throw error;
    }
  }, []);

  const { debounce } = useDebounce();
  const debouncedMetadataExtraction = debounce(extractMetadataForImage, 300);

  // Simplified canvas upload - load images immediately, upload in background
  const handleCanvasUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    console.log('Canvas upload started for', files.length, 'files');
    
    // Use immediate upload for fast canvas loading
    await handleImageUploadImmediate(files);
    
    toast.toast({
      category: 'success',
      title: "Images Added",
      description: `Successfully added ${files.length} image${files.length > 1 ? 's' : ''} to canvas`,
      variant: "default"
    });
  }, [handleImageUploadImmediate, toast]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleCanvasUpload(files);
    }
    event.target.value = '';
  }, [handleCanvasUpload]);


  const handleNavigateToPreviousAnalyses = () => {
    navigate('/projects');
  };

  const handleViewChange = (view: 'gallery' | 'canvas' | 'summary') => {
    if (view === 'gallery') {
      // Gallery route removed - stay on canvas
      return;
    } else if (view === 'summary') {
      navigate('/dashboard');
    }
  };

  const handleOpenAnalysisPanel = (analysisId: string) => {
    setSelectedAnalysisId(analysisId);
    setAnalysisPanelOpen(true);
  };

  const handleCloseAnalysisPanel = () => {
    setAnalysisPanelOpen(false);
    setSelectedAnalysisId(null);
  };

  const handleOpenGroupEdit = (groupId: string) => {
    setSelectedGroupId(groupId);
    setGroupEditDialogOpen(true);
  };

  const handleCloseGroupEdit = () => {
    setGroupEditDialogOpen(false);
    setSelectedGroupId(null);
  };

  // Load project by slug if provided - let AppContext handle general data loading
  const { user } = useAuth();
  useEffect(() => {
    // Handle both project slug loading and direct canvas access
    if (loadAttempted) return;
    
    const loadProjectBySlug = async () => {
      try {
        setLoadAttempted(true);
        
        if (projectSlug) {
          console.log('Loading project by slug:', projectSlug);
          const project = await SlugService.getProjectBySlug(projectSlug);
          
          if (!project) {
            console.error('Project not found for slug:', projectSlug);
            toast.toast({
              category: 'error',
              title: "Project not found",
              description: "The project you're looking for doesn't exist or you don't have access to it.",
              variant: "destructive",
            });
            navigate('/projects');
            return;
          }

          // Switch to the project and let AppContext load the data
          await ProjectService.switchToProject(project.id);
          setCurrentProjectId(project.id); // Update the project ID for canvas state manager
          console.log('Project switched, AppContext will handle data loading...');
        } else {
          // No project slug - get or create current project
          const currentProject = await ProjectService.getCurrentProject();
          setCurrentProjectId(currentProject);
          console.log('Using current project:', currentProject);
        }
      } catch (error) {
        console.error('Error loading project by slug:', error);
        toast.toast({
          category: 'error',
          title: "Error loading project",
          description: "Failed to load the project. Please try again.",
          variant: "destructive",
        });
        navigate('/projects');
      }
    };

    loadProjectBySlug();
  }, [projectSlug, navigate, toast]); // Removed user dependency to prevent conflicts

  // Simplified keyboard shortcuts
  useKeyboardShortcuts({
    onGroup: () => {
      // Group functionality handled by app context
      console.log('Group shortcut triggered');
    },
    onUndo: () => {
      console.log('Undo shortcut triggered');
    },
    onRedo: () => {
      console.log('Redo shortcut triggered');
    },
  });

  // Don't redirect to upload anymore - show upload zone in canvas instead

  // Show loading state while data is being loaded
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading your project...</p>
        </div>
      </div>
    );
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
      
      <div 
        className="flex-1 relative transition-all duration-300"
        style={{ 
          marginRight: analysisPanelOpen ? '480px' : '0px' 
        }}
      >
        <CanvasView 
          uploadedImages={uploadedImages} 
          analyses={analyses}
          generatedConcepts={generatedConcepts}
          imageGroups={imageGroups}
          groupAnalyses={groupAnalyses}
          groupPromptSessions={groupAnalysesWithPrompts.map(gap => ({ 
            id: gap.id,
            groupId: gap.groupId,
            prompt: gap.prompt,
            isCustom: false,
            status: 'completed' as const,
            createdAt: gap.createdAt
          }))}
          groupAnalysesWithPrompts={groupAnalysesWithPrompts}
          groupDisplayModes={groupDisplayModes}
          showAnnotations={showAnnotations}
          onToggleAnnotations={handleToggleAnnotations}
          onViewChange={handleViewChange}
          onImageSelect={handleImageSelect}
          onGenerateConcept={handleGenerateConcept}
          onCreateGroup={handleCreateGroup}
          onUngroup={handleUngroup}
          onDeleteGroup={handleDeleteGroup}
          onEditGroup={handleOpenGroupEdit}
          onGroupDisplayModeChange={handleGroupDisplayModeChange}
          onSubmitGroupPrompt={handleSubmitGroupPrompt}
          onEditGroupPrompt={handleEditGroupPrompt}
          onCreateFork={handleCreateFork}
          onOpenAnalysisPanel={handleOpenAnalysisPanel}
          onAnalysisComplete={handleAnalysisComplete}
          onImageUpload={handleCanvasUpload}
          isGeneratingConcept={isGeneratingConcept}
        />
        
        {/* Upload Zone - shows full overlay when no images, floating button when images exist */}
        <CanvasUploadZone
          onImageUpload={handleCanvasUpload}
          isUploading={isUploading}
          hasImages={uploadedImages.length > 0}
        />
      </div>
      
      <AnalysisPanel
        analysis={selectedAnalysisId ? analyses.find(a => a.id === selectedAnalysisId) || null : null}
        image={selectedAnalysisId ? uploadedImages.find(img => {
          const analysis = analyses.find(a => a.id === selectedAnalysisId);
          return analysis && img.id === analysis.imageId;
        }) || null : null}
        isOpen={analysisPanelOpen}
        onClose={handleCloseAnalysisPanel}
      />
      
      <GroupEditDialog
        isOpen={groupEditDialogOpen}
        onClose={handleCloseGroupEdit}
        onUpdateGroup={handleEditGroup}
        group={selectedGroupId ? imageGroups.find(g => g.id === selectedGroupId) || null : null}
        groupImages={selectedGroupId ? uploadedImages.filter(img => {
          const group = imageGroups.find(g => g.id === selectedGroupId);
          return group && group.imageIds.includes(img.id);
        }) : []}
      />
    </div>
  );
};

export default Canvas;