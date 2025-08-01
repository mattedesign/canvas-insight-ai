import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/SimplifiedAppContext';
import { useAuth } from '@/context/AuthContext';
import { ProjectService } from '@/services/DataMigrationService';
import { PerformantCanvasView } from '@/components/canvas/PerformantCanvasView';
import { Sidebar } from '@/components/Sidebar';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { useEnhancedAnalysis } from '@/hooks/useEnhancedAnalysis';
import { useFilteredToast } from '@/hooks/use-filtered-toast';

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
  const { state, stableHelpers } = useAppContext();
  const { user } = useAuth();
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(false);
  const { generateEnhancedConcept } = useEnhancedAnalysis();
  const { toast } = useFilteredToast();
  
  const loadedProjectRef = useRef<{ projectId: string | null; timestamp: number }>({
    projectId: null,
    timestamp: 0
  });

  // ✅ FIX 1: CRITICAL - Project switch BEFORE data loading
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      const now = Date.now();
      let projectId: string;
      
      try {
        // Determine the target project first
        let targetProjectId: string;
        
        if (projectSlug) {
          // Load specific project by slug - MUST complete BEFORE any data loading
          targetProjectId = await ProjectService.getProjectBySlug(projectSlug);
          console.log('[Canvas] Loading project by slug:', projectSlug, '->', targetProjectId);
          
          // ✅ FIX 2: Clear state when switching projects to prevent contamination
          if (loadedProjectRef.current.projectId && 
              loadedProjectRef.current.projectId !== targetProjectId) {
            console.log('[Canvas] Clearing state for project switch');
            stableHelpers.resetAll();
          }
          
          // ✅ FIX 3: CRITICAL - Switch project BEFORE loading data
          await ProjectService.switchToProject(targetProjectId);
          console.log('[Canvas] Project switched to:', targetProjectId);
        } else {
          // Load default project
          targetProjectId = await ProjectService.getCurrentProject();
          console.log('[Canvas] Loading default project:', targetProjectId);
        }
        
        projectId = targetProjectId;
        
        // Prevent duplicate loads
        if (loadedProjectRef.current.projectId === projectId && 
            now - loadedProjectRef.current.timestamp < 5000) {
          console.log('[Canvas] Skipping duplicate load for project:', projectId);
          return;
        }
        
        // ✅ FIX 4: Now load data with correct project context
        console.log('[Canvas] Loading data for project:', projectId);
        loadedProjectRef.current = { projectId, timestamp: now };
        await stableHelpers.loadData(projectId); // Pass projectId for validation
        
      } catch (error) {
        console.error('[Canvas] Failed to load project:', error);
        if (projectSlug) {
          // If specific project not found, redirect to default canvas
          navigate('/canvas');
        }
      }
    };
    
    loadData();
  }, [user?.id, projectSlug]); // Include projectSlug as dependency

  // ✅ CRITICAL FIX: Create stable callback references to prevent infinite re-renders
  const handleToggleAnnotations = useCallback(() => {
    console.log('Toggle annotations - TODO: implement');
  }, []);

  const handleImageSelect = useCallback((imageId: string) => {
    console.log('Image selected:', imageId);
  }, []);

  // Get state data first before using in callbacks
  const { uploadedImages, analyses, imageGroups, groupAnalysesWithPrompts, error, generatedConcepts, groupDisplayModes, showAnnotations, isLoading } = state;

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

      // Generate the concept using the enhanced analysis hook
      const result = await generateEnhancedConcept(analysis, image.url, image.name);
      
      if (result.success) {
        toast({
          category: 'success',
          title: 'Concept Generated',
          description: 'AI design concept has been generated successfully.'
        });
        
        // Trigger data reload to show the new concept
        await stableHelpers.loadData();
      } else {
        toast({
          category: 'error',
          title: 'Generation Failed',
          description: result.error || 'Failed to generate concept.'
        });
      }
    } catch (error) {
      console.error('Error generating concept:', error);
      toast({
        category: 'error',
        title: 'Generation Error',
        description: 'An unexpected error occurred while generating the concept.'
      });
    }
  }, [analyses, uploadedImages, generateEnhancedConcept, toast, stableHelpers]);

  const handleCreateGroup = useCallback((imageIds: string[]) => {
    stableHelpers.createGroup({
      name: 'New Group',
      description: 'Group created from canvas',
      color: '#3b82f6',
      imageIds,
      position: { x: 100, y: 100 }
    });
  }, [stableHelpers]);

  const handleUngroup = useCallback((groupId: string) => {
    console.log('Ungroup:', groupId);
  }, []);

  const handleDeleteGroup = useCallback((groupId: string) => {
    console.log('Delete group:', groupId);
  }, []);

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
    console.log('Analysis complete:', imageId, analysis);
  }, []);

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
            onRetry={() => stableHelpers.loadData(loadedProjectRef.current.projectId || undefined)} 
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
        onClearCanvas={() => stableHelpers.resetAll()}
        onAddImages={() => {
          // Trigger file input or upload dialog
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'image/*';
          input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length > 0) {
              stableHelpers.uploadImages(files);
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
            onImageUpload={stableHelpers.uploadImages}
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
      </div>
    </div>
  );
};

export default Canvas;