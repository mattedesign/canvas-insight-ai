import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { CanvasView } from '@/components/canvas/CanvasView';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { GroupEditDialog } from '@/components/GroupEditDialog';
import { CanvasUploadZone } from '@/components/CanvasUploadZone';
import { CanvasUploadProgress } from '@/components/CanvasUploadProgress';
import { useAppContext } from '@/context/AppContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DataMigrationService } from '@/services/DataMigrationService';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

const Canvas = () => {
  const navigate = useNavigate();
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
    handleImageUpload
  } = useAppContext();

  // Track if user has existing data in the database
  const [hasExistingData, setHasExistingData] = useState<boolean | null>(null);
  
  // Upload state
  const [uploadStages, setUploadStages] = useState<Array<{
    id: string;
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number;
    error?: string;
  }>>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

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

  // Canvas upload implementation
  const handleCanvasUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploadingFiles(true);
    setPendingFiles(files);
    
    const stages = files.map(file => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      status: 'pending' as const,
      progress: 0
    }));
    
    setUploadStages(stages);
    setOverallProgress(0);

    try {
      // Stage 1: Upload files to Supabase
      const uploadedImages = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const stageId = stages[i].id;
        
        // Update stage to processing
        setUploadStages(prev => prev.map(stage => 
          stage.id === stageId 
            ? { ...stage, status: 'processing', progress: 10 }
            : stage
        ));

        try {
          // Upload to Supabase
          const result = await handleImageUpload([file]);
          uploadedImages.push(result);
          
          // Update stage progress
          setUploadStages(prev => prev.map(stage => 
            stage.id === stageId 
              ? { ...stage, progress: 50 }
              : stage
          ));
          
        } catch (error) {
          console.error('Upload failed for:', file.name, error);
          setUploadStages(prev => prev.map(stage => 
            stage.id === stageId 
              ? { ...stage, status: 'error', error: 'Upload failed' }
              : stage
          ));
        }
      }

      // Stage 2: Extract metadata for uploaded images
      for (let i = 0; i < uploadedImages.length; i++) {
        const uploadResult = uploadedImages[i];
        const stageId = stages[i].id;
        
        try {
          setUploadStages(prev => prev.map(stage => 
            stage.id === stageId 
              ? { ...stage, progress: 75 }
              : stage
          ));

          // Extract metadata with retry
          if (uploadResult?.id) {
            debouncedMetadataExtraction(uploadResult.id);
          }
          
          setUploadStages(prev => prev.map(stage => 
            stage.id === stageId 
              ? { ...stage, status: 'completed', progress: 100 }
              : stage
          ));
        } catch (error) {
          console.error('Metadata extraction failed:', error);
          // Don't fail the whole process for metadata extraction
          setUploadStages(prev => prev.map(stage => 
            stage.id === stageId 
              ? { ...stage, status: 'completed', progress: 100 }
              : stage
          ));
        }
      }

      // Update overall progress
      setOverallProgress(100);
      
      toast.toast({
        category: 'success',
        title: "Upload Complete",
        description: `Successfully uploaded ${files.length} image${files.length > 1 ? 's' : ''}`,
        variant: "default"
      });
      
      // Clear upload state after delay
      setTimeout(() => {
        setUploadStages([]);
        setPendingFiles([]);
        setIsUploadingFiles(false);
        setOverallProgress(0);
      }, 3000);

    } catch (error) {
      console.error('Upload process failed:', error);
      toast.toast({
        category: 'error',
        title: "Upload Failed",
        description: "Upload failed. Please try again.",
        variant: "destructive"
      });
      setIsUploadingFiles(false);
    }
  }, [handleImageUpload, extractMetadataForImage, toast]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleCanvasUpload(files);
    }
    event.target.value = '';
  }, [handleCanvasUpload]);

  const handleCancelUpload = useCallback(() => {
    setUploadStages([]);
    setPendingFiles([]);
    setIsUploadingFiles(false);
    setOverallProgress(0);
  }, []);

  const handleRetryUpload = useCallback(() => {
    if (pendingFiles.length > 0) {
      handleCanvasUpload(pendingFiles);
    }
  }, [pendingFiles, handleCanvasUpload]);

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

  // Check for existing data on mount if authenticated
  const { user } = useAuth();
  useEffect(() => {
    const checkExistingData = async () => {
      if (user && hasExistingData === null) {
        try {
          const hasData = await DataMigrationService.hasExistingData();
          setHasExistingData(hasData);
        } catch (error) {
          console.error('Failed to check existing data:', error);
          setHasExistingData(false);
        }
      } else if (!user) {
        setHasExistingData(false);
      }
    };

    checkExistingData();
  }, [user, hasExistingData]);

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
          isUploading={isUploadingFiles}
          hasImages={uploadedImages.length > 0}
        />
        
        {/* Upload Progress */}
        <CanvasUploadProgress
          stages={uploadStages}
          overallProgress={overallProgress}
          isVisible={uploadStages.length > 0}
          onCancel={handleCancelUpload}
          onRetry={handleRetryUpload}
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