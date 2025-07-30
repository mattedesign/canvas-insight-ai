import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/SimplifiedAppContext';
import { useAuth } from '@/context/AuthContext';
import { ProjectService } from '@/services/DataMigrationService';
import { PerformantCanvasView } from '@/components/canvas/PerformantCanvasView';
import { Sidebar } from '@/components/Sidebar';

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
  const { state, actions, status } = useAppContext();
  const { user } = useAuth();
  const [canvasError, setCanvasError] = useState<string | null>(null);
  
  const loadedProjectRef = useRef<{ projectId: string | null; timestamp: number }>({
    projectId: null,
    timestamp: 0
  });

  // Load project data ONCE with stable reference - FIXED: removed problematic dependency
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      const now = Date.now();
      const projectId = await ProjectService.getCurrentProject();
      
      // Prevent duplicate loads
      if (loadedProjectRef.current.projectId === projectId && 
          now - loadedProjectRef.current.timestamp < 5000) {
        console.log('[Canvas] Skipping duplicate load for project:', projectId);
        return;
      }
      
      console.log('[Canvas] Loading data for project:', projectId);
      loadedProjectRef.current = { projectId, timestamp: now };
      await actions.loadData();
    };
    
    loadData();
  }, [user?.id]); // 🚨 CRITICAL FIX: Only depend on user.id, NOT stableHelpers.loadData

  // ✅ CRITICAL FIX: Create stable callback references to prevent infinite re-renders
  const handleToggleAnnotations = useCallback(() => {
    console.log('Toggle annotations - TODO: implement');
  }, []);

  const handleImageSelect = useCallback((imageId: string) => {
    console.log('Image selected:', imageId);
  }, []);

  const handleGenerateConcept = useCallback(async (analysisId: string) => {
    console.log('Generate concept for analysis:', analysisId);
  }, []);

  const handleCreateGroup = useCallback((imageIds: string[]) => {
    actions.createGroup({
      name: 'New Group',
      description: 'Group created from canvas',
      color: '#3b82f6',
      imageIds,
      position: { x: 100, y: 100 }
    });
  }, [actions]);

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
    console.log('Open analysis panel:', analysisId);
  }, []);

  const handleAnalysisComplete = useCallback((imageId: string, analysis: any) => {
    console.log('Analysis complete:', imageId, analysis);
  }, []);

  const { uploadedImages, analyses, imageGroups, groupAnalysesWithPrompts, error, generatedConcepts, groupDisplayModes, showAnnotations } = state;
  const isLoading = status.isLoading;

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
            onRetry={() => actions.loadData()} 
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
        onClearCanvas={() => actions.resetAll()}
        onAddImages={() => {
          // Trigger file input or upload dialog
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'image/*';
          input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length > 0) {
              actions.uploadImages(files);
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
      
      <div className="flex-1 overflow-hidden">
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
            onImageUpload={actions.uploadImages}
            isGeneratingConcept={state.isGeneratingConcept}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Canvas;