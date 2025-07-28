import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { CanvasView } from '@/components/canvas/CanvasView';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { GroupEditDialog } from '@/components/GroupEditDialog';
import { CanvasUploadZone } from '@/components/CanvasUploadZone';

import { useAppContext } from '@/context/AppContext';
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
    isGeneratingConcept,
    isLoading,
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations,
    handleGenerateConcept,
    handleCreateGroup,
    handleUngroup,
    handleDeleteGroup,
    handleEditGroup,
    handleGroupDisplayModeChange,
    handleSubmitGroupPrompt,
    handleEditGroupPrompt,
    handleCreateFork,
    handleAnalysisComplete,
    handleImageUpload,
    updateAppStateFromDatabase
  } = useAppContext();

  // Track if user has existing data in the database
  const [hasExistingData, setHasExistingData] = useState<boolean | null>(null);

  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [groupEditDialogOpen, setGroupEditDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const toast = useFilteredToast();

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

    // Process images immediately for display
    await handleImageUpload(files);
    
    toast.toast({
      category: 'success',
      title: "Images Added",
      description: `Successfully added ${files.length} image${files.length > 1 ? 's' : ''} to canvas`,
      variant: "default"
    });
  }, [handleImageUpload, toast]);

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

  // Load project by slug if provided, otherwise check for existing data
  const { user } = useAuth();
  useEffect(() => {
    const loadProjectBySlug = async () => {
      if (projectSlug) {
        try {
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

          // Switch to the project
          await ProjectService.switchToProject(project.id);
          
          // Load project data and update AppContext state
          const result = await DataMigrationService.loadAllFromDatabase();
          if (result.success && result.data) {
            console.log('Project data loaded successfully, updating context state...');
            // Update AppContext with loaded data
            updateAppStateFromDatabase(result.data);
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
      } else {
        // Check for existing data in current project
        const checkExistingData = async () => {
          if (user && hasExistingData === null) {
            try {
              const hasData = await DataMigrationService.hasExistingData();
              setHasExistingData(hasData);
              if (hasData) {
                console.log('Loading existing project data...');
                const result = await DataMigrationService.loadAllFromDatabase();
                if (result.success && result.data) {
                  console.log('Existing data loaded, updating context state...');
                  // Update context with loaded data
                  updateAppStateFromDatabase(result.data);
                }
              }
            } catch (error) {
              console.error('Failed to check existing data:', error);
              setHasExistingData(false);
            }
          } else if (!user) {
            setHasExistingData(false);
          }
        };

        checkExistingData();
      }
    };

    loadProjectBySlug();
  }, [projectSlug, navigate, toast, user, hasExistingData]);

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onGroup: () => {
      if (uploadedImages.length > 0) {
        // If on canvas, trigger group creation if multiple items selected
        // You could add additional logic here to select multiple items first
        console.log('Group shortcut triggered');
      }
    },
    onUndo: () => {
      console.log('Undo shortcut triggered');
      // Wire this up to your undo functionality
    },
    onRedo: () => {
      console.log('Redo shortcut triggered');
      // Wire this up to your redo functionality
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
          groupPromptSessions={groupPromptSessions}
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
          isUploading={false}
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