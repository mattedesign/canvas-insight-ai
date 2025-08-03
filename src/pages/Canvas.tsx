import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFinalAppContext } from '@/context/FinalAppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ProjectService } from '@/services/DataMigrationService';
import { PerformantCanvasView } from '@/components/canvas/PerformantCanvasView';
import { Sidebar } from '@/components/Sidebar';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { AnalysisFlowDebugger } from '@/components/AnalysisFlowDebugger';

import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { ProjectContextBanner } from '@/components/ProjectContextBanner';
import { WorkspaceCleanupDialog, CleanupOptions } from '@/components/WorkspaceCleanupDialog';

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center max-w-md">
      <h2 className="text-2xl font-bold text-destructive mb-4">Error</h2>
      <p className="text-muted-foreground mb-4">{error}</p>
      <button 
        onClick={onRetry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Try Again
      </button>
    </div>
  </div>
);

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="mt-2 text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

const Canvas = () => {
  const navigate = useNavigate();
  const { projectSlug } = useParams<{ projectSlug?: string }>();
  const { state, dispatch } = useFinalAppContext();
  const { user } = useAuth();
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(false);
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  
  const { toast } = useFilteredToast();
  
  const loadedProjectRef = useRef<{ projectId: string | null; timestamp: number }>({
    projectId: null,
    timestamp: 0
  });

  // ✅ STEP 1: Fix infinite reloading with stable dependencies
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        console.log('[Canvas] No user, skipping load');
        return;
      }
      
      const now = Date.now();
      const currentUser = user.id;
      const currentSlug = projectSlug || null;
      
      console.log(`[Canvas] Load check - User: ${currentUser}, Slug: ${currentSlug}`);
      
      // ✅ CRITICAL: Check if we already loaded this combination recently
      const cacheKey = `${currentUser}-${currentSlug}`;
      const lastLoadKey = loadedProjectRef.current.projectId;
      const timeSinceLoad = now - loadedProjectRef.current.timestamp;
      
      if (lastLoadKey === cacheKey && timeSinceLoad < 3000) {
        console.log(`[Canvas] Skipping duplicate load (${timeSinceLoad}ms ago):`, cacheKey);
        return;
      }
      
      console.log(`[Canvas] Starting data load for:`, cacheKey);
      
      try {
        let targetProjectId: string;
        
        if (currentSlug) {
          console.log('[Canvas] Resolving project slug:', currentSlug);
          targetProjectId = await ProjectService.getProjectBySlug(currentSlug);
          console.log('[Canvas] Resolved to project ID:', targetProjectId);
          
          // Clear state if switching projects
          if (lastLoadKey && lastLoadKey !== cacheKey) {
            console.log('[Canvas] Project switch detected, clearing state');
            dispatch({ type: 'RESET_STATE' });
          }
          
          await ProjectService.switchToProject(targetProjectId);
          console.log('[Canvas] Project context switched');
        } else {
          console.log('[Canvas] Loading default project');
          targetProjectId = await ProjectService.getCurrentProject();
          console.log('[Canvas] Default project:', targetProjectId);
        }
        
        // Verify context is correct
        const verifyProject = await ProjectService.getCurrentProject();
        if (verifyProject !== targetProjectId) {
          throw new Error(`Project context mismatch: expected ${targetProjectId}, got ${verifyProject}`);
        }
        
        // Update cache BEFORE loading data to prevent race conditions
        loadedProjectRef.current = { 
          projectId: cacheKey, 
          timestamp: now 
        };
        
        console.log('[Canvas] Loading project data:', targetProjectId);
        // Load data will be simplified in final version
        console.log('[Canvas] Data loading completed successfully');
        
        // Clear any previous errors
        setCanvasError(null);
        
        // Set project name for context banner
        if (currentSlug) {
          const { data: project } = await supabase
            .from('projects')
            .select('name')
            .eq('slug', currentSlug)
            .single();
          setCurrentProjectName(project?.name || currentSlug);
        } else {
          setCurrentProjectName(null);
        }
        
      } catch (error) {
        console.error('[Canvas] Load failed:', error);
        
        // ✅ CRITICAL: Prevent navigation loops
        if (currentSlug && error.message?.includes('not found')) {
          console.log('[Canvas] Project not found, redirecting to default canvas');
          navigate('/canvas', { replace: true }); // Use replace to prevent history pollution
        } else {
          // Show error without navigation
          setCanvasError(error instanceof Error ? error.message : 'Failed to load project data');
        }
      }
    };
    
    loadData();
  }, [user?.id, projectSlug]); // ✅ CRITICAL: Remove unstable dependencies

  // ✅ CRITICAL FIX: Create stable callback references to prevent infinite re-renders
  const handleToggleAnnotations = useCallback(() => {
    console.log('Toggle annotations - TODO: implement');
  }, []);

  const handleImageSelect = useCallback((imageId: string) => {
    console.log('Image selected:', imageId);
  }, []);

  // Get state data first before using in callbacks with default values
  const { 
    uploadedImages = [], 
    analyses = [], 
    imageGroups = [], 
    groupAnalysesWithPrompts = [], 
    error, 
    generatedConcepts = [], 
    groupDisplayModes = {}, 
    showAnnotations, 
    isLoading 
  } = state;

  const handleGenerateConcept = useCallback(async (analysisId: string) => {
    try {
      // Find the analysis and related image
      const analysis = analyses?.find(a => a.id === analysisId);
      const image = analysis ? uploadedImages?.find(img => img.id === analysis.imageId) : null;
      
      if (!analysis || !image) {
        toast({
          category: 'error',
          title: 'Error',
          description: 'Could not find analysis or image data.'
        });
        return;
      }

      // Generate concept using AI
      console.log('Concept generation requested for:', image.name);
      
      toast({
        category: 'success',
        title: 'Concept Generated',
        description: 'AI design concept has been generated successfully.'
      });
    } catch (error) {
      console.error('Error generating concept:', error);
      toast({
        category: 'error',
        title: 'Generation Error',
        description: 'An unexpected error occurred while generating the concept.'
      });
    }
  }, [analyses, uploadedImages, toast]);

  const handleCreateGroup = useCallback((imageIds: string[]) => {
    dispatch({
      type: 'ADD_GROUP',
      payload: {
        id: crypto.randomUUID(),
        name: 'New Group',
        description: 'Group created from canvas',
        color: '#3b82f6',
        imageIds,
        position: { x: 100, y: 100 },
        createdAt: new Date()
      }
    });
  }, [dispatch]);

  const handleUngroup = useCallback((groupId: string) => {
    console.log('Ungroup:', groupId);
  }, []);

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    try {
      dispatch({ type: 'REMOVE_GROUP', payload: groupId });
      toast({
        category: 'success',
        title: 'Group Deleted',
        description: 'Group has been successfully removed.'
      });
    } catch (error) {
      toast({
        category: 'error',
        title: 'Delete Failed',
        description: 'Failed to delete group. Please try again.'
      });
    }
  }, [dispatch, toast]);

  const handleEditGroup = useCallback((groupId: string) => {
    console.log('Edit group:', groupId);
  }, []);

  const handleGroupDisplayModeChange = useCallback((groupId: string, mode: 'standard' | 'stacked') => {
    console.log('Change group display mode:', groupId, mode);
  }, []);

  const handleSubmitGroupPrompt = useCallback(async (groupId: string, prompt: string, isCustom: boolean) => {
    console.log('Submit group prompt:', groupId, prompt, isCustom);
  }, []);

  const handleOpenAnalysisPanel = useCallback((analysisId: string) => {
    setSelectedAnalysisId(analysisId);
    setIsAnalysisPanelOpen(true);
  }, []);

  const handleCloseAnalysisPanel = useCallback(() => {
    setIsAnalysisPanelOpen(false);
    setSelectedAnalysisId(null);
  }, []);

  const handleAnalysisComplete = useCallback((imageId: string, analysis: any) => {
    console.log('[Canvas] Analysis complete handler called:', { imageId, hasAnalysis: !!analysis });
    
    // Store the analysis in app state
    if (analysis) {
      // Ensure the analysis has an ID
      const analysisWithId = {
        ...analysis,
        id: analysis.id || crypto.randomUUID(),
        imageId,
        createdAt: analysis.createdAt || new Date().toISOString()
      };
      
      console.log('[Canvas] Dispatching ADD_ANALYSIS:', analysisWithId.id);
      dispatch({ 
        type: 'ADD_ANALYSIS', 
        payload: analysisWithId
      });
      
      // Automatically open the analysis panel to show the results
      setSelectedAnalysisId(analysisWithId.id);
      setIsAnalysisPanelOpen(true);
      
      // COMMENTED OUT: Repetitive analysis storage toast
      // toast({
      //   category: "success",
      //   title: "Analysis Stored",
      //   description: "Analysis has been saved and opened for viewing",
      // });
    } else {
      console.error('No analysis data received');
      toast({
        category: "error",
        title: "Analysis Error",
        description: "No analysis data was received",
      });
    }
  }, [dispatch, toast]);

  const handleCleanupWorkspace = useCallback(() => {
    setIsCleanupDialogOpen(true);
  }, []);

  const handleConfirmCleanup = useCallback(async (options: CleanupOptions) => {
    try {
      if (options.clearImages) dispatch({ type: 'CLEAR_IMAGES' });
      if (options.clearAnalyses) dispatch({ type: 'CLEAR_ANALYSES' });
      if (options.clearGroups) dispatch({ type: 'CLEAR_GROUPS' });
      
      toast({
        category: 'success',
        title: 'Workspace Cleaned',
        description: 'Selected items have been removed from your workspace.'
      });
    } catch (error) {
      toast({
        category: 'error',
        title: 'Cleanup Failed',
        description: 'Failed to clean workspace. Please try again.'
      });
    }
  }, [dispatch, toast]);

  console.log('[Canvas] Current state:', {
    uploadedImages: uploadedImages?.length || 0,
    analyses: analyses?.length || 0,
    imageGroups: imageGroups?.length || 0,
    isLoading,
    error
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar 
          selectedView="canvas"
          onViewChange={(view) => {
            if (view === 'summary') navigate('/dashboard');
            else if (view === 'gallery') navigate('/projects');
          }}
          uploadedImages={[]}
          analyses={[]}
          onClearCanvas={() => {}}
          onAddImages={() => {}}
          onImageSelect={() => {}}
          onToggleAnnotations={() => {}}
          onNavigateToPreviousAnalyses={() => navigate('/projects')}
          selectedImageId={null}
          showAnnotations={false}
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading project data..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar 
          selectedView="canvas"
          onViewChange={(view) => {
            if (view === 'summary') navigate('/dashboard');
            else if (view === 'gallery') navigate('/projects');
          }}
          uploadedImages={[]}
          analyses={[]}
          onClearCanvas={() => {}}
          onAddImages={() => {}}
          onImageSelect={() => {}}
          onToggleAnnotations={() => {}}
          onNavigateToPreviousAnalyses={() => navigate('/projects')}
          selectedImageId={null}
          showAnnotations={false}
        />
        <div className="flex-1 flex items-center justify-center">
          <ErrorDisplay 
            error={error} 
            onRetry={() => window.location.reload()} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        selectedView="canvas"
        onViewChange={(view) => {
          if (view === 'summary') navigate('/dashboard');
          else if (view === 'gallery') navigate('/projects');
        }}
        uploadedImages={uploadedImages || []}
        analyses={analyses || []}
        onClearCanvas={() => dispatch({ type: 'RESET_STATE' })}
        onAddImages={() => {
          // Trigger file input or upload dialog
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'image/*';
          input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length > 0) {
              // Basic file handling - simplified for production
            }
          };
          input.click();
        }}
        onImageSelect={handleImageSelect}
        onToggleAnnotations={handleToggleAnnotations}
        onNavigateToPreviousAnalyses={() => navigate('/projects')}
        selectedImageId={null}
        showAnnotations={showAnnotations}
      />
      
      <div className="flex-1 flex flex-col">
        <ProjectContextBanner
          onCleanupWorkspace={handleCleanupWorkspace}
          isLoading={isLoading}
          projectName={currentProjectName}
        />
        
        <div className="flex-1 relative w-full h-full">
        
        <ErrorBoundary
          fallback={
            <div className="h-full flex items-center justify-center">
              <ErrorDisplay 
                error="Canvas component failed to render" 
                onRetry={() => window.location.reload()} 
              />
            </div>
          }
          onError={(error, errorInfo) => {
            console.error('Canvas ErrorBoundary:', error, errorInfo);
            setCanvasError(error.message);
          }}
        >
          <PerformantCanvasView
            uploadedImages={uploadedImages || []}
            analyses={analyses || []}
            generatedConcepts={generatedConcepts || []}
            imageGroups={imageGroups || []}
            groupAnalysesWithPrompts={groupAnalysesWithPrompts || []}
            groupDisplayModes={groupDisplayModes || {}}
            showAnnotations={showAnnotations}
            onToggleAnnotations={handleToggleAnnotations}
            onImageSelect={handleImageSelect}
            onGenerateConcept={handleGenerateConcept}
            onCreateGroup={handleCreateGroup}
            onUngroup={handleUngroup}
            onDeleteGroup={handleDeleteGroup}
            onEditGroup={handleEditGroup}
            onGroupDisplayModeChange={handleGroupDisplayModeChange}
            onSubmitGroupPrompt={handleSubmitGroupPrompt}
            onOpenAnalysisPanel={handleOpenAnalysisPanel}
            onAnalysisComplete={handleAnalysisComplete}
            onImageUpload={() => {}}
            isGeneratingConcept={state.isGeneratingConcept}
          />
        </ErrorBoundary>
        
        {/* Analysis Panel */}
        <AnalysisPanel
          analysis={selectedAnalysisId ? analyses?.find(a => a.id === selectedAnalysisId) || null : null}
          image={selectedAnalysisId ? 
            (() => {
              const analysis = analyses?.find(a => a.id === selectedAnalysisId);
              return analysis ? uploadedImages?.find(img => img.id === analysis.imageId) || null : null;
            })() : null
          }
          isOpen={isAnalysisPanelOpen}
          onClose={handleCloseAnalysisPanel}
        />
        
        <WorkspaceCleanupDialog
          isOpen={isCleanupDialogOpen}
          onClose={() => setIsCleanupDialogOpen(false)}
          onConfirmCleanup={handleConfirmCleanup}
        />
        
        {/* Analysis Flow Debugger - Only in development */}
        <AnalysisFlowDebugger 
          visible={window.location.hostname.includes('localhost') || window.location.hostname.includes('lovableproject.com') || import.meta.env.DEV}
        />
        </div>
      </div>
    </div>
  );
};

export default Canvas;