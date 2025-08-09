import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFinalAppContext } from '@/context/FinalAppContext';
import { ProjectService, GroupMigrationService, GroupAnalysisMigrationService } from '@/services/DataMigrationService';
import { analysisService } from '@/services/TypeSafeAnalysisService';
import { PerformantCanvasViewWithErrorBoundary } from '@/components/canvas/PerformantCanvasViewWithErrorBoundary';
import { Sidebar } from '@/components/Sidebar';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { ProjectContextBanner } from '@/components/ProjectContextBanner';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { startUxAnalysis } from '@/services/StartUxAnalysis';

const SimplifiedCanvas = () => {
  const navigate = useNavigate();
  const { projectSlug } = useParams<{ projectSlug?: string }>();
  const { user } = useAuth();
  const { state, dispatch } = useFinalAppContext();
  
  // SEO
  useEffect(() => {
    const title = "UX Canvas – Projects & Analyses";
    document.title = title;
    const desc = "Upload, group, and analyze UX screens per project with real-time AI.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "description"); document.head.appendChild(meta); }
    meta.setAttribute("content", desc);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = window.location.href;
  }, []);
  
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
  
  const { toast } = useFilteredToast();
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

  // PHASE 2: Implement concept generation handler
  const handleGenerateConcept = useCallback(async (analysisId: string) => {
    if (!Array.isArray(analyses)) return;
    
    const analysis = analyses.find(a => a.id === analysisId);
    if (!analysis || !Array.isArray(uploadedImages)) return;
    
    const image = uploadedImages.find(img => img.id === analysis.imageId);
    if (!analysis || !image) return;
    
    try {
      console.log('🎨 Generating concept for:', image.name);
      
      // Create a simple concept based on analysis insights
      const concept = {
        id: crypto.randomUUID(),
        title: `Improved ${image.name}`,
        description: `AI-generated UI concept addressing: ${analysis.summary?.keyIssues?.join(', ') || 'identified improvement areas'}`,
        imageUrl: image.url, // For now, use original image
        improvements: analysis.suggestions?.map(s => s.title) || ['Enhanced usability', 'Better accessibility'],
        analysisId: analysisId,
        imageId: image.id,
        userId: user?.id || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          generatedFrom: 'analysis',
          basedOnSuggestions: analysis.suggestions?.length || 0
        }
      };
      
      dispatch({ type: 'ADD_GENERATED_CONCEPT', payload: concept });
      console.log('✅ Concept generated successfully');
    } catch (error) {
      console.error('❌ Concept generation failed:', error);
    }
  }, [analyses, uploadedImages, dispatch, user?.id]);

  // PHASE 2: Add missing "View Full Analysis" handler
  const handleOpenAnalysisPanel = useCallback((analysisId: string) => {
    console.log('📊 Opening analysis panel for:', analysisId);
    setSelectedAnalysisId(analysisId);
    setIsAnalysisPanelOpen(true);
  }, []);

  // Start UX Analysis V2 pipeline for the first valid image
  const handleStartAnalysis = useCallback(async () => {
    try {
      const candidate = (Array.isArray(uploadedImages) ? uploadedImages : []).find(img => img.url && !img.url.startsWith('blob:')) || null;
      if (!candidate) {
        toast({ category: 'error', title: 'No valid image', description: 'Upload an image (not a temporary blob) before starting analysis.' });
        return;
      }
      toast({ category: 'info', title: 'Starting Analysis', description: 'Creating job and launching pipeline...' });
      const { jobId } = await startUxAnalysis({ imageId: candidate.id, imageUrl: candidate.url, projectId: null, userContext: null });
      navigate(`/job/${jobId}`);
    } catch (err) {
      console.error('[SimplifiedCanvas] startUxAnalysis failed:', err);
      toast({ category: 'error', title: 'Failed to start analysis', description: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [uploadedImages, navigate, toast]);

  const handleAddImages = useCallback((files?: File[]) => {
    console.log('[SimplifiedCanvas] handleAddImages called with files:', files?.length || 'creating input');
    
    if (files) {
      // Called from CanvasView with files
      handleFilesUpload(files);
    } else {
      // Called from sidebar - create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const selectedFiles = Array.from((e.target as HTMLInputElement).files || []);
        console.log('[SimplifiedCanvas] Files selected from input:', selectedFiles.length);
        handleFilesUpload(selectedFiles);
      };
      input.click();
    }
  }, []);

  const handleFilesUpload = useCallback(async (files: File[]) => {
    console.log('[SimplifiedCanvas] Processing files:', files.length);
    
    if (files.length === 0) return;
    
    try {
      // PHASE 2: Immediate storage upload and blob URL replacement
      const { loadImageDimensions } = await import('@/utils/imageUtils');
      const { BlobUrlReplacementService } = await import('@/services/BlobUrlReplacementService');
      
      const uploadPromises = files.map(async (file) => {
        console.log('[SimplifiedCanvas] Processing file:', file.name);
        const dimensions = await loadImageDimensions(file);
        const imageId = crypto.randomUUID();
        
        // Create initial image with blob URL for immediate display
        const tempImage = {
          id: imageId,
          name: file.name,
          url: URL.createObjectURL(file),
          file,
          dimensions,
          status: 'completed' as const
        };

        // Immediately upload to storage and replace blob URL
        try {
          const processedImage = await BlobUrlReplacementService.processUploadedImage(tempImage);
          console.log('[SimplifiedCanvas] Image uploaded to storage:', processedImage.url);
          return processedImage;
        } catch (storageError) {
          console.warn('[SimplifiedCanvas] Storage upload failed, using blob URL:', storageError);
          return tempImage; // Fallback to blob URL
        }
      });
      
      const results = await Promise.all(uploadPromises);
      console.log('[SimplifiedCanvas] Upload results:', results.length);
      
      // Add to local state immediately for instant feedback
      dispatch({ type: 'ADD_IMAGES', payload: results });
      
      // Persist to database in background
      const { ImageMigrationService } = await import('@/services/DataMigrationService');
      for (const image of results) {
        try {
          await ImageMigrationService.migrateImageToDatabase(image);
          console.log('[SimplifiedCanvas] Successfully persisted image:', image.name);
        } catch (persistError) {
          console.error('[SimplifiedCanvas] Failed to persist image:', image.name, persistError);
        }
      }
    } catch (error) {
      console.error('[SimplifiedCanvas] Upload failed:', error);
    }
  }, [dispatch]);

  // Group creation handler
  const handleCreateGroup = useCallback(async (imageIds: string[]) => {
    console.log('[SimplifiedCanvas] Creating group with images:', imageIds);
    
    if (imageIds.length < 2) {
      console.warn('[SimplifiedCanvas] Cannot create group with less than 2 images');
      return;
    }
    
    try {
      const newGroup = {
        id: crypto.randomUUID(),
        name: `Group ${imageGroups.length + 1}`,
        description: 'Group created from canvas',
        color: '#3b82f6',
        imageIds,
        position: { x: 100, y: 100 },
        createdAt: new Date(),
        projectId: ''
      };
      
      console.log('[SimplifiedCanvas] Saving group to database:', newGroup);
      // Save to database first
      await GroupMigrationService.migrateGroupToDatabase(newGroup);
      
      console.log('[SimplifiedCanvas] Dispatching ADD_GROUP with:', newGroup);
      // Then update local state
      dispatch({
        type: 'ADD_GROUP',
        payload: newGroup
      });

      toast({
        category: 'success',
        title: 'Group Created',
        description: 'Images have been grouped successfully.'
      });
    } catch (error) {
      console.error('[SimplifiedCanvas] Failed to create group:', error);
      toast({
        category: 'error',
        title: 'Group Creation Failed',
        description: 'Failed to create group. Please try again.'
      });
    }
  }, [dispatch, imageGroups.length, toast]);

  // Group analysis functionality with canvas integration
  const handleSubmitGroupPrompt = useCallback(
    async (
      groupId: string,
      prompt: string,
      isCustom: boolean,
      existingResult?: any
    ) => {
      console.log('[SimplifiedCanvas] Submit group prompt:', groupId, prompt, isCustom, {
        hasExistingResult: !!existingResult,
      });

      try {
        // Validate group exists
        const group = imageGroups.find((g) => g.id === groupId);
        if (!group) {
          throw new Error('Group not found');
        }

        // If we already have a result from the canvas progress pipeline, just persist it
        if (existingResult) {
          if (!existingResult.success) {
            throw new Error(existingResult.error || 'Group analysis failed');
          }

          const source =
            existingResult.groupAnalysis || existingResult.analysis || existingResult;

          const groupAnalysis = {
            id: crypto.randomUUID(),
            sessionId: source?.sessionId || crypto.randomUUID(),
            groupId,
            prompt,
            isCustom,
            summary: {
              overallScore: source?.summary?.overallScore || 0,
              consistency: source?.summary?.consistency || 0,
              thematicCoherence: source?.summary?.thematicCoherence || 0,
              userFlowContinuity: source?.summary?.userFlowContinuity || 0,
            },
            insights: Array.isArray(source?.insights) ? source.insights : [],
            recommendations: Array.isArray(source?.recommendations)
              ? source.recommendations
              : [],
            patterns: {
              commonElements: source?.patterns?.commonElements || [],
              designInconsistencies: source?.patterns?.designInconsistencies || [],
              userJourneyGaps: source?.patterns?.userJourneyGaps || [],
            },
            analysis: source?.analysis,
            createdAt: source?.createdAt ? new Date(source.createdAt) : new Date(),
          } as const;

          await GroupAnalysisMigrationService.migrateGroupAnalysisToDatabase(
            groupAnalysis
          );

          dispatch({
            type: 'ADD_GROUP_ANALYSIS',
            payload: groupAnalysis,
          });

          toast({
            category: 'success',
            title: 'Group Analysis Complete',
            description: 'Analysis results have been generated and saved.',
          });

          return; // Important: do not re-run analysis
        }

        // If no existing result provided, perform the analysis (direct path)
        const groupImages = uploadedImages.filter((img) => group.imageIds.includes(img.id));
        if (groupImages.length === 0) {
          throw new Error('No images found in this group');
        }

        const imageUrls = groupImages.map((img) => img.url);

        toast({
          category: 'info',
          title: 'Starting Group Analysis',
          description: 'Analyzing group patterns and relationships...',
        });

        const response = await analysisService.analyzeGroup({
          imageUrls,
          groupId,
          prompt,
          isCustom,
        });

        if (!response.success) {
          throw new Error(response.error || 'Group analysis failed');
        }

        if (response.analysis) {
          const analysisData = response.analysis as any;
          const groupAnalysis = {
            id: crypto.randomUUID(),
            sessionId: crypto.randomUUID(),
            groupId,
            prompt,
            isCustom,
            summary: {
              overallScore: analysisData.summary?.overallScore || 0,
              consistency: analysisData.summary?.consistency || 0,
              thematicCoherence: analysisData.summary?.thematicCoherence || 0,
              userFlowContinuity: analysisData.summary?.userFlowContinuity || 0,
            },
            insights: Array.isArray(analysisData.insights) ? analysisData.insights : [],
            recommendations: Array.isArray(analysisData.recommendations)
              ? analysisData.recommendations
              : [],
            patterns: {
              commonElements: analysisData.patterns?.commonElements || [],
              designInconsistencies: analysisData.patterns?.designInconsistencies || [],
              userJourneyGaps: analysisData.patterns?.userJourneyGaps || [],
            },
            analysis: analysisData.analysis,
            createdAt: new Date(),
          };

          await GroupAnalysisMigrationService.migrateGroupAnalysisToDatabase(
            groupAnalysis
          );

          dispatch({
            type: 'ADD_GROUP_ANALYSIS',
            payload: groupAnalysis,
          });

          toast({
            category: 'success',
            title: 'Group Analysis Complete',
            description: 'Analysis results have been generated and saved.',
          });
        }
      } catch (error) {
        console.error('[SimplifiedCanvas] Group analysis error:', error);
        toast({
          category: 'error',
          title: 'Group Analysis Failed',
          description:
            error instanceof Error ? error.message : 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    },
    [imageGroups, uploadedImages, dispatch, toast]
  );

  const handleAnalyzeGroup = useCallback(async (groupId: string) => {
    console.log('[SimplifiedCanvas] handleAnalyzeGroup called with groupId:', groupId);
    
    // Start group analysis with a default comprehensive prompt
    await handleSubmitGroupPrompt(
      groupId, 
      'Analyze the overall user flow and information architecture across these screens. Evaluate visual consistency and design system adherence. Identify accessibility issues and improvement opportunities. Assess content clarity and information hierarchy.',
      false
    );
  }, [handleSubmitGroupPrompt]);

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
          onStartAnalysis={handleStartAnalysis}
          isLoading={typeof isLoading === 'boolean' ? isLoading : false}
          projectName={currentProjectName}
        />
        
        <div className="flex-1 relative w-full h-full dot-grid">
          <PerformantCanvasViewWithErrorBoundary
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
            onOpenAnalysisPanel={handleOpenAnalysisPanel}
            onCreateGroup={handleCreateGroup}
            onUngroup={() => {}}
            onDeleteGroup={() => {}}
            onEditGroup={() => {}}
            onGroupDisplayModeChange={() => {}}
            onSubmitGroupPrompt={handleSubmitGroupPrompt}
            onAnalyzeGroup={handleAnalyzeGroup}
            onAnalysisComplete={handleAnalysisComplete}
            onImageUpload={handleAddImages}
          />
        </div>
      </div>
      
      {isAnalysisPanelOpen && selectedAnalysisId && Array.isArray(analyses) && (
        <AnalysisPanel
          analysis={analyses.find(a => a.id === selectedAnalysisId) || null}
          image={(() => {
            const analysis = analyses.find(a => a.id === selectedAnalysisId);
            return analysis && Array.isArray(uploadedImages) 
              ? uploadedImages.find(img => img.id === analysis.imageId) || null
              : null;
          })()}
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