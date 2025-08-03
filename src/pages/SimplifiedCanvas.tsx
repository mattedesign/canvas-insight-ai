import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFinalAppContext } from '@/context/FinalAppContext';
import { ProjectService } from '@/services/DataMigrationService';
import { PerformantCanvasView } from '@/components/canvas/PerformantCanvasView';
import { Sidebar } from '@/components/Sidebar';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { useEnhancedAnalysis } from '@/hooks/useEnhancedAnalysis';
import { ProjectContextBanner } from '@/components/ProjectContextBanner';

const SimplifiedCanvas = () => {
  const navigate = useNavigate();
  const { projectSlug } = useParams<{ projectSlug?: string }>();
  const { user } = useAuth();
  const { state, dispatch } = useFinalAppContext();
  
  // Direct state access - no selectors, maximum performance
  const {
    uploadedImages = [],
    analyses = [],
    imageGroups = [],
    groupAnalysesWithPrompts = [],
    generatedConcepts = [],
    isLoading = false,
    error = null,
    showAnnotations = false,
    groupDisplayModes = {}
  } = state;
  
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  
  const { generateEnhancedConcept } = useEnhancedAnalysis();
  const loadedRef = useRef<string | null>(null);

  // Stable data loading effect with minimal dependencies
  useEffect(() => {
    if (!user?.id) return;
    
    const loadKey = `${user.id}-${projectSlug || 'default'}`;
    if (loadedRef.current === loadKey) return;
    
    const loadData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        let targetProjectId: string;
        if (projectSlug) {
          targetProjectId = await ProjectService.getProjectBySlug(projectSlug);
          await ProjectService.switchToProject(targetProjectId);
        } else {
          targetProjectId = await ProjectService.getCurrentProject();
        }
        
        const result = await (await import('@/services/DataMigrationService')).DataMigrationService.loadAllFromDatabase(targetProjectId);
        
        if (result.success && result.data) {
          dispatch({ type: 'MERGE_FROM_DATABASE', payload: result.data });
        }
        
        loadedRef.current = loadKey;
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Load failed:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      }
    };
    
    loadData();
  }, [user?.id, projectSlug, dispatch]);

  // Stable callback functions
  const handleImageSelect = useCallback((imageId: string) => {
    console.log('Image selected:', imageId);
  }, []);

  const handleToggleAnnotations = useCallback(() => {
    dispatch({ 
      type: 'TOGGLE_ANNOTATIONS'
    });
  }, [dispatch]);

  const handleAnalysisComplete = useCallback((imageId: string, analysis: any) => {
    if (analysis) {
      const analysisWithId = {
        ...analysis,
        id: analysis.id || crypto.randomUUID(),
        imageId,
        createdAt: analysis.createdAt || new Date().toISOString()
      };
      
      dispatch({ type: 'ADD_ANALYSIS', payload: analysisWithId });
      setSelectedAnalysisId(analysisWithId.id);
      setIsAnalysisPanelOpen(true);
    }
  }, [dispatch]);

  const handleGenerateConcept = useCallback(async (analysisId: string) => {
    if (Array.isArray(analyses)) {
      const analysis = analyses.find(a => a.id === analysisId);
      if (Array.isArray(uploadedImages)) {
        const image = analysis ? uploadedImages.find(img => img.id === analysis.imageId) : null;
        if (analysis && image) {
          await generateEnhancedConcept(analysis, image.url, image.name);
        }
      }
    }
  }, [analyses, uploadedImages, generateEnhancedConcept]);

  const handleAddImages = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        // Simple upload handling - delegate to service
        const { loadImageDimensions } = await import('@/utils/imageUtils');
        const uploadPromises = files.map(async (file) => {
          const dimensions = await loadImageDimensions(file);
          return {
            id: crypto.randomUUID(),
            name: file.name,
            url: URL.createObjectURL(file),
            file,
            dimensions,
            status: 'completed' as const
          };
        });
        
        const results = await Promise.all(uploadPromises);
        dispatch({ type: 'ADD_IMAGES', payload: results });
      }
    };
    input.click();
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Error</h2>
            <p className="text-muted-foreground mb-4">{typeof error === 'string' ? error : 'Unknown error'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Reload
            </button>
          </div>
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
        uploadedImages={Array.isArray(uploadedImages) ? uploadedImages : []}
        analyses={Array.isArray(analyses) ? analyses : []}
        onClearCanvas={() => dispatch({ type: 'RESET_STATE' })}
        onAddImages={handleAddImages}
        onImageSelect={handleImageSelect}
        onToggleAnnotations={handleToggleAnnotations}
        onNavigateToPreviousAnalyses={() => navigate('/projects')}
        selectedImageId={null}
        showAnnotations={typeof showAnnotations === 'boolean' ? showAnnotations : false}
      />
      
      <div className="flex-1 flex flex-col">
        <ProjectContextBanner
          onCleanupWorkspace={() => {}}
          isLoading={typeof isLoading === 'boolean' ? isLoading : false}
          projectName={currentProjectName}
        />
        
        <div className="flex-1 relative w-full h-full">
          <PerformantCanvasView
            uploadedImages={Array.isArray(uploadedImages) ? uploadedImages : []}
            analyses={Array.isArray(analyses) ? analyses : []}
            generatedConcepts={Array.isArray(generatedConcepts) ? generatedConcepts : []}
            imageGroups={Array.isArray(imageGroups) ? imageGroups : []}
            groupAnalysesWithPrompts={Array.isArray(groupAnalysesWithPrompts) ? groupAnalysesWithPrompts : []}
            groupDisplayModes={typeof groupDisplayModes === 'object' && groupDisplayModes ? groupDisplayModes : {}}
            showAnnotations={typeof showAnnotations === 'boolean' ? showAnnotations : false}
            onToggleAnnotations={handleToggleAnnotations}
            onImageSelect={handleImageSelect}
            onGenerateConcept={handleGenerateConcept}
            onCreateGroup={() => {}}
            onUngroup={() => {}}
            onDeleteGroup={() => {}}
            onEditGroup={() => {}}
            onGroupDisplayModeChange={() => {}}
            onSubmitGroupPrompt={async () => {}}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </div>
      </div>
      
      {isAnalysisPanelOpen && selectedAnalysisId && Array.isArray(analyses) && (
        <AnalysisPanel
          analysis={analyses.find(a => a.id === selectedAnalysisId) || null}
          image={null}
          isOpen={true}
          onClose={() => {
            setIsAnalysisPanelOpen(false);
            setSelectedAnalysisId(null);
          }}
        />
      )}
    </div>
  );
};

export default SimplifiedCanvas;