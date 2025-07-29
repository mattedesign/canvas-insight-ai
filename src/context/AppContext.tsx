import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { UXAnalysis, UploadedImage, GeneratedConcept, ImageGroup, GroupAnalysis, GroupPromptSession, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { generateMockAnalysis } from '@/data/mockAnalysis';
import { generateMockGroupAnalysis } from '@/data/mockGroupAnalysis';
import { useImageViewer } from '@/hooks/useImageViewer';
import { useAuth } from '@/context/AuthContext';
import { DataMigrationService, ProjectService } from '@/services/DataMigrationService';
import { CanvasStateService, CanvasState } from '@/services/CanvasStateService';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAnalysisRealtime } from '@/hooks/useAnalysisRealtime';
import { AnalysisPerformanceService } from '@/services/AnalysisPerformanceService';

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
  isUploading: boolean;
  hasPendingSync: boolean;
  
  // Actions
  handleImageUpload: (files: File[]) => Promise<void>;
  handleImageUploadImmediate: (files: File[]) => Promise<void>;
  handleGenerateConcept: (analysisId: string) => Promise<void>;
  handleClearCanvas: (options?: { silent?: boolean; forNewProject?: boolean }) => Promise<void>;
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
  
  // AI Analysis actions
  handleAnalysisComplete: (imageId: string, analysis: UXAnalysis) => void;
  
  // Migration actions
  syncToDatabase: () => Promise<void>;
  loadDataFromDatabase: () => Promise<void>;
  updateAppStateFromDatabase: (data: any) => void;
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
  const { toast } = useFilteredToast();
  
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
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [pendingBackgroundSync, setPendingBackgroundSync] = useState<Set<string>>(new Set());
  
  const { state: viewerState, toggleAnnotation, clearAnnotations } = useImageViewer();

  // Real-time analysis handling
  const handleAnalysisUpdate = useCallback((analysis: UXAnalysis) => {
    console.log('Real-time analysis update received:', analysis);
    
    // Update local state
    setAnalyses(prev => {
      const existingIndex = prev.findIndex(a => a.imageId === analysis.imageId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = analysis;
        return updated;
      } else {
        return [...prev, analysis];
      }
    });

    // Update image status
    setUploadedImages(prev => prev.map(img => 
      img.id === analysis.imageId 
        ? { ...img, status: analysis.status === 'completed' ? 'completed' : img.status }
        : img
    ));

    // Cache the analysis for performance
    AnalysisPerformanceService.setCachedAnalysis(analysis.imageId, analysis);
  }, []);

  const handleAnalysisError = useCallback((imageId: string, error: string) => {
    console.error('Analysis error for image:', imageId, error);
    
    // Update image and analysis status to error
    setUploadedImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, status: 'error' } : img
    ));
    
    setAnalyses(prev => prev.map(analysis => 
      analysis.imageId === imageId ? { ...analysis, status: 'error' } : analysis
    ));

    toast({
      title: "Analysis failed",
      description: `Analysis failed for image: ${error}`,
      category: "error",
      variant: "destructive"
    });
  }, [toast]);

  const handleAnalysisStatusChange = useCallback((imageId: string, status: UXAnalysis['status']) => {
    console.log('Analysis status change:', imageId, status);
    
    // Update analysis status
    setAnalyses(prev => prev.map(analysis => 
      analysis.imageId === imageId ? { ...analysis, status } : analysis
    ));

    // Update image status accordingly
    setUploadedImages(prev => prev.map(img => 
      img.id === imageId 
        ? { ...img, status: status === 'processing' ? 'analyzing' : img.status }
        : img
    ));
  }, []);

  // Set up real-time analysis system
  const {
    isConnected: realtimeConnected,
    pendingAnalyses,
    failedAnalyses,
    trackAnalysis,
    completeAnalysis,
    retryAnalysis
  } = useAnalysisRealtime({
    onAnalysisUpdate: handleAnalysisUpdate,
    onAnalysisError: handleAnalysisError,
    onAnalysisStatusChange: handleAnalysisStatusChange
  });

  // Add ref to track loading state and prevent race conditions
  const loadingRef = useRef(false);

  // Load data from database when user authenticates
  useEffect(() => {
    if (user && !isLoading && !loadingRef.current) {
      // Only load if we don't have recent uploads in progress
      const hasRecentUploads = uploadedImages.some(img => 
        img.status === 'uploading' || img.status === 'syncing'
      );
      
      if (!hasRecentUploads && !isUploading) {
        loadDataFromDatabase();
      }
    } else if (!user) {
      // Reset project ID when user logs out
      ProjectService.resetProject();
      // Clear state when user logs out
      setUploadedImages([]);
      setAnalyses([]);
      setImageGroups([]);
      setGroupAnalysesWithPrompts([]);
      setGeneratedConcepts([]);
      setGroupAnalyses([]);
      setGroupPromptSessions([]);
      loadingRef.current = false; // Reset loading flag
    }
  }, [user]); // Remove isUploading dependency to prevent unnecessary re-runs

  const loadDataFromDatabase = async () => {
    // Prevent concurrent loading operations
    if (loadingRef.current) {
      console.log('Data loading already in progress, skipping...');
      return;
    }
    
    loadingRef.current = true;
    setIsLoading(true);
    
    try {
      console.log('Loading data from database...');
      const result = await DataMigrationService.loadAllFromDatabase();
      if (result.success && result.data) {
        console.log('Data loaded successfully:', {
          images: result.data.uploadedImages.length,
          analyses: result.data.analyses.length,
          groups: result.data.imageGroups.length
        });
        
        // Smart update: merge database data with current uploads, preserving blob URLs and File objects
        updateAppStateFromDatabase(result.data);
        
        setImageGroups(result.data.imageGroups);
        setGroupAnalysesWithPrompts(result.data.groupAnalysesWithPrompts);
        setGeneratedConcepts(result.data.generatedConcepts);
        setGroupAnalyses(result.data.groupAnalyses);
        setGroupPromptSessions(result.data.groupPromptSessions);
        
        // Auto-select first image if none selected and we have images
        if (!selectedImageId && result.data.uploadedImages.length > 0) {
          setSelectedImageId(result.data.uploadedImages[0].id);
        }
        
        // Remove informational toast - this is routine data loading
      } else {
        console.log('No data found in database or loading failed');
      }
    } catch (error) {
      console.error('Failed to load data from database:', error);
      toast({
        title: "Loading failed",
        description: "Could not load your data. You can continue working and sync later.",
        category: "error",
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
          category: "success",
        });
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Failed to sync to database:', error);
      toast({
        title: "Sync failed",
        description: "Could not save your data. Please try again later.",
        category: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImageUpload = useCallback(async (files: File[]) => {
    const newImages: UploadedImage[] = [];
    const newAnalyses: UXAnalysis[] = [];

    setIsUploading(true);
    
    try {
      // Remove informational upload progress toast

      console.log('Starting upload process for', files.length, 'files');

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}:`, file.name);
        
        // Generate proper UUID for database compatibility
        const imageId = crypto.randomUUID();

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

        console.log('Image dimensions obtained:', dimensions);

        let imageUrl = URL.createObjectURL(file);
        
        // If user is authenticated, upload to Supabase Storage AND create DB record with better error handling
        if (user) {
          try {
            console.log('User authenticated, uploading to Supabase...');
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              console.log('Getting current project...');
              const projectId = await ProjectService.getCurrentProject();
              console.log('Project ID obtained:', projectId);
              
              const fileName = `${authUser.id}/${imageId}/${file.name}`;
              
              // Check if file already exists to handle duplicates gracefully
              const { data: existingFiles } = await supabase.storage
                .from('images')
                .list(`${authUser.id}/${imageId}`);

              let uploadSuccessful = false;
              if (!existingFiles || existingFiles.length === 0) {
                // Upload to storage
                console.log('Uploading to storage with filename:', fileName);
                const { error: uploadError } = await supabase.storage
                  .from('images')
                  .upload(fileName, file);

                if (!uploadError) {
                  uploadSuccessful = true;
                  console.log('Storage upload successful');
                } else if (uploadError.message?.includes('already exists')) {
                  uploadSuccessful = true; // File already exists, that's okay
                  console.log('File already exists in storage, continuing...');
                } else {
                  console.error('Storage upload failed:', uploadError);
                  throw uploadError;
                }
              } else {
                uploadSuccessful = true; // File already exists
                console.log('File already exists in storage, continuing...');
              }

              if (uploadSuccessful) {
                const { data: urlData } = supabase.storage
                  .from('images')
                  .getPublicUrl(fileName);
                imageUrl = urlData.publicUrl;
                console.log('Public URL obtained:', imageUrl);
                
                // Create image record in database with upsert to handle conflicts
                console.log('Creating/updating image record in database...');
                const { error: dbError } = await supabase
                  .from('images')
                  .upsert({
                    id: imageId,
                    project_id: projectId,
                    filename: imageId, // Use imageId as filename for edge function compatibility
                    original_name: file.name,
                    storage_path: fileName,
                    dimensions: dimensions,
                    file_size: file.size,
                    file_type: file.type
                  }, {
                    onConflict: 'id'
                  });
                  
                if (dbError) {
                  console.error('Failed to create/update image record:', dbError);
                  // Continue anyway - we can still analyze with the image URL
                } else {
                  console.log('Image record created/updated successfully:', imageId);
                }
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
          status: 'completed',
        };

        // Generate analysis with enhanced performance service
        let analysis;
        if (user) {
          try {
            console.log('Performing analysis with retry and caching...');
            trackAnalysis(imageId); // Track for real-time updates
            
            const result = await AnalysisPerformanceService.performAnalysisWithRetry(
              imageId,
              imageUrl,
              file.name,
              ''
            );
            
            if (result.success && result.analysis) {
              analysis = result.analysis;
              console.log('Analysis completed successfully with performance service');
            } else {
              throw new Error(result.error || 'Analysis failed');
            }
          } catch (error) {
            console.error('Performance service analysis failed, using mock:', error);
            analysis = generateMockAnalysis(imageId, file.name, imageUrl);
          }
        } else {
          console.log('User not authenticated, using mock analysis');
          analysis = generateMockAnalysis(imageId, file.name, imageUrl);
        }

        newImages.push(uploadedImage);
        newAnalyses.push(analysis);
        console.log(`Completed processing file ${i + 1}/${files.length}`);
      }

      console.log('All files processed, updating state...');
      setUploadedImages(prev => [...prev, ...newImages]);
      setAnalyses(prev => [...prev, ...newAnalyses]);
      
      // Auto-select first image if none selected
      if (!selectedImageId && newImages.length > 0) {
        setSelectedImageId(newImages[0].id);
      }

      // Show success feedback for upload completion
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''} and generated analyses.`,
        category: "success",
      });

      // Note: Removed auto-sync to prevent database conflicts
      // Users can manually sync via the interface when ready
      console.log('Upload complete. Manual sync available via interface.');
      
    } catch (error) {
      console.error('Upload process failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process images. Please try again.",
        category: "error",
      });
    } finally {
      console.log('Upload process completed, setting isUploading to false');
      setIsUploading(false);
    }
  }, [selectedImageId, user, toast]);

  const handleImageUploadImmediate = useCallback(async (files: File[]) => {
    const newImages: UploadedImage[] = [];
    const newAnalyses: UXAnalysis[] = [];
    
    setIsUploading(true);

    try {
      console.log('Starting optimized immediate upload for', files.length, 'files');

      // Phase 1: Immediate display - process files synchronously for instant UI updates
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageId = crypto.randomUUID();

        // Get dimensions immediately for proper canvas sizing
        const img = new Image();
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const imageUrl = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(imageUrl);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
          };
          img.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('Failed to load image'));
          };
          img.src = imageUrl;
        });

        // Create image with blob URL for immediate display
        const uploadedImage: UploadedImage = {
          id: imageId,
          name: file.name,
          url: URL.createObjectURL(file), // Immediate blob URL
          file,
          dimensions,
          status: 'uploaded', // Uploaded to UI, processing in background
        };

        // Create minimal analysis with processing status
        const placeholderAnalysis: UXAnalysis = {
          id: `analysis-${imageId}`,
          imageId,
          imageName: file.name,
          imageUrl: uploadedImage.url,
          userContext: '',
          visualAnnotations: [],
          suggestions: [],
          summary: {
            overallScore: 0,
            categoryScores: {
              usability: 0,
              accessibility: 0,
              visual: 0,
              content: 0,
            },
            keyIssues: ['Analysis in progress...'],
            strengths: [],
          },
          metadata: {
            objects: [],
            text: [],
            colors: [],
            faces: 0,
          },
          createdAt: new Date(),
          status: 'processing',
        };

        newImages.push(uploadedImage);
        newAnalyses.push(placeholderAnalysis);
      }

      // Update state immediately - users see images instantly
      console.log('Phase 1: Displaying images immediately');
      setUploadedImages(prev => [...prev, ...newImages]);
      setAnalyses(prev => [...prev, ...newAnalyses]);
      
      // Auto-select first image if none selected
      if (!selectedImageId && newImages.length > 0) {
        setSelectedImageId(newImages[0].id);
      }

      // Phase 2: Background processing - non-blocking database and analysis operations
      console.log('Phase 2: Starting background processing');
      
      // Process each image in background without blocking UI
      newImages.forEach((uploadedImage) => {
        // Track pending background sync
        setPendingBackgroundSync(prev => new Set([...prev, uploadedImage.id]));
        
        processImageInBackground(uploadedImage).catch(error => {
          console.error(`Background processing failed for ${uploadedImage.name}:`, error);
        }).finally(() => {
          // Remove from pending sync when complete
          setPendingBackgroundSync(prev => {
            const newSet = new Set(prev);
            newSet.delete(uploadedImage.id);
            return newSet;
          });
        });
      });

    } catch (error) {
      console.error('Immediate upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process images. Please try again.",
        category: "error",
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedImageId, user, toast]);

  // Background processing function for uploaded images
  const processImageInBackground = useCallback(async (uploadedImage: UploadedImage) => {
    try {
      let storedImageUrl = uploadedImage.url; // Start with blob URL
      
      // Step 1: Upload to Supabase Storage (if authenticated)
      if (user) {
        try {
          setUploadedImages(prev => prev.map(img => 
            img.id === uploadedImage.id ? { ...img, status: 'syncing' } : img
          ));

          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const projectId = await ProjectService.getCurrentProject();
            const fileName = `${authUser.id}/${uploadedImage.id}/${uploadedImage.file.name}`;
            
            // Upload file to storage
            const { error: uploadError } = await supabase.storage
              .from('images')
              .upload(fileName, uploadedImage.file);

            if (!uploadError || uploadError.message?.includes('already exists')) {
              // Get permanent URL
              const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);
              storedImageUrl = urlData.publicUrl;
              
              // Create database record
              await supabase
                .from('images')
                .upsert({
                  id: uploadedImage.id,
                  project_id: projectId,
                  filename: uploadedImage.id,
                  original_name: uploadedImage.file.name,
                  storage_path: fileName,
                  dimensions: uploadedImage.dimensions,
                  file_size: uploadedImage.file.size,
                  file_type: uploadedImage.file.type
                }, {
                  onConflict: 'id'
                });

              // Update image with stored URL (preserving original file for fallback)
              setUploadedImages(prev => prev.map(img => 
                img.id === uploadedImage.id ? { 
                  ...img, 
                  url: storedImageUrl,
                  file: uploadedImage.file, // Keep original file for error recovery
                  status: 'analyzing' 
                } : img
              ));

              console.log(`Storage sync complete for ${uploadedImage.name}`);
            }
          }
        } catch (error) {
          console.error('Background storage upload failed:', error);
          // Continue with analysis using blob URL
        }
      }

      // Step 2: Generate AI Analysis
      setAnalyses(prev => prev.map(analysis => 
        analysis.imageId === uploadedImage.id ? { ...analysis, status: 'analyzing' } : analysis
      ));

      let finalAnalysis;
      if (user) {
        try {
          const { data, error } = await supabase.functions.invoke('ux-analysis', {
            body: {
              type: 'ANALYZE_IMAGE',
              payload: {
                imageId: uploadedImage.id,
                imageUrl: storedImageUrl,
                imageName: uploadedImage.file.name,
                userContext: ''
              }
            }
          });
          
          if (error) throw error;
          if (data.success) {
            finalAnalysis = { ...data.data, status: 'completed' };
          } else {
            throw new Error('Analysis failed');
          }
        } catch (error) {
          console.error('AI analysis failed, using mock:', error);
          finalAnalysis = { 
            ...generateMockAnalysis(uploadedImage.id, uploadedImage.file.name, storedImageUrl), 
            status: 'completed' 
          };
        }
      } else {
        finalAnalysis = { 
          ...generateMockAnalysis(uploadedImage.id, uploadedImage.file.name, storedImageUrl), 
          status: 'completed' 
        };
      }

      // Step 3: Update with final analysis
      setUploadedImages(prev => prev.map(img => 
        img.id === uploadedImage.id ? { ...img, status: 'completed' } : img
      ));
      setAnalyses(prev => prev.map(analysis => 
        analysis.imageId === uploadedImage.id ? finalAnalysis : analysis
      ));

      console.log(`Background processing complete for ${uploadedImage.name}`);

    } catch (error) {
      console.error(`Background processing failed for ${uploadedImage.name}:`, error);
      // Update to error state
      setUploadedImages(prev => prev.map(img => 
        img.id === uploadedImage.id ? { ...img, status: 'error' } : img
      ));
      setAnalyses(prev => prev.map(analysis => 
        analysis.imageId === uploadedImage.id ? { ...analysis, status: 'error' } : analysis
      ));
    }
  }, [user, toast]);

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

  const handleClearCanvas = useCallback(async (options?: { silent?: boolean; forNewProject?: boolean }) => {
    try {
      // Only show clear action for existing data
      const hasExistingData = uploadedImages.length > 0 || analyses.length > 0 || imageGroups.length > 0;
      
      // Clear canvas state in database if there's a current project
      try {
        const projectId = await ProjectService.getCurrentProject();
        if (projectId) {
          await CanvasStateService.clearCanvasState(projectId);
        }
      } catch (error) {
        console.warn('Could not clear canvas state, continuing anyway:', error);
      }
      
      // Clear local state
      setUploadedImages([]);
      setAnalyses([]);
      setGeneratedConcepts([]);
      setImageGroups([]);
      setGroupAnalysesWithPrompts([]);
      setGroupAnalyses([]);
      setGroupPromptSessions([]);
      setSelectedImageId(null);
      clearAnnotations();
      
      // Only show feedback toast if:
      // 1. Not silent mode
      // 2. Had existing data to clear 
      // 3. Not clearing for a new project (which should be silent)
      if (!options?.silent && hasExistingData && !options?.forNewProject) {
        toast({
          title: "Workspace cleared",
          description: "Canvas has been cleared. Ready for new analysis.",
          category: "success",
        });
      }
    } catch (error) {
      console.error('Failed to clear canvas:', error);
      // Only show error toast if not in silent mode
      if (!options?.silent) {
        toast({
          title: "Clear failed",
          description: "Could not clear workspace. Please try again.",
          category: "error",
        });
      }
    }
  }, [clearAnnotations, toast, uploadedImages.length, analyses.length, imageGroups.length]);

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
    const groupId = crypto.randomUUID();
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
          category: "success",
        });
      } catch (error) {
        console.error('Failed to persist group:', error);
        toast({
          title: "Group created locally",
          description: "Group was created but may not sync until you're online.",
          category: "action-required",
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
        category: "success",
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
        category: "error",
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

  const handleAnalysisComplete = useCallback((imageId: string, newAnalysis: UXAnalysis) => {
    console.log('Handling analysis completion for image:', imageId);
    setAnalyses(prev => {
      const existingIndex = prev.findIndex(a => a.imageId === imageId);
      if (existingIndex >= 0) {
        // Update existing analysis
        const updated = [...prev];
        updated[existingIndex] = newAnalysis;
        return updated;
      } else {
        // Add new analysis
        return [...prev, newAnalysis];
      }
    });
    
    toast({
      title: "Analysis Complete",
      description: "New AI analysis has been generated for your image.",
      category: "success",
    });
  }, [toast]);

  // Update app state with data loaded from database - hybrid approach with smart conflict resolution
  const updateAppStateFromDatabase = useCallback((data: {
    uploadedImages: UploadedImage[];
    analyses: UXAnalysis[];
    imageGroups: ImageGroup[];
    groupAnalysesWithPrompts: GroupAnalysisWithPrompt[];
    generatedConcepts?: GeneratedConcept[];
    groupAnalyses?: GroupAnalysis[];
    groupPromptSessions?: GroupPromptSession[];
  }, options: { forceReplace?: boolean } = {}) => {
    const hasPendingSync = pendingBackgroundSync.size > 0;
    
    console.log('Smart state update:', {
      dbImages: data.uploadedImages?.length || 0,
      dbAnalyses: data.analyses?.length || 0,
      currentImages: uploadedImages.length,
      currentAnalyses: analyses.length,
      hasPendingSync,
      pendingSyncIds: Array.from(pendingBackgroundSync),
      isUploading,
      forceReplace: options.forceReplace
    });
    
    // If we have pending background sync or are uploading, be more conservative with database updates
    if ((hasPendingSync || isUploading) && !options.forceReplace) {
      console.log('Deferring database state update due to pending sync operations');
      return;
    }
    
    // Smart merge: combine database images with current in-memory images
    setUploadedImages(prev => {
      const dbImages = data.uploadedImages || [];
      
      // If force replace or no current images, use database images
      if (options.forceReplace || prev.length === 0) {
        return dbImages;
      }
      
      // If no database images, keep current state
      if (dbImages.length === 0) {
        return prev;
      }
      
      // Merge with URL and File preservation
      const dbImageIds = new Set(dbImages.map(img => img.id));
      const newInMemoryImages = prev.filter(img => !dbImageIds.has(img.id));
      
      // For images in both DB and memory, preserve blob URLs and File objects when storage fails
      const mergedImages = dbImages.map(dbImg => {
        const memoryImg = prev.find(img => img.id === dbImg.id);
        if (memoryImg) {
          // Preserve the File object and fallback URL
          return {
            ...dbImg,
            file: memoryImg.file || dbImg.file,
            url: dbImg.url || memoryImg.url, // Use storage URL if available, fallback to blob
          };
        }
        return dbImg;
      });
      
      console.log('Merging images:', {
        fromDB: dbImages.length,
        newInMemory: newInMemoryImages.length,
        merged: mergedImages.length,
        total: mergedImages.length + newInMemoryImages.length
      });
      
      return [...mergedImages, ...newInMemoryImages];
    });
    
    // Smart merge: combine database analyses with current in-memory analyses
    setAnalyses(prev => {
      const dbAnalyses = data.analyses || [];
      
      // If force replace or no current analyses, use database analyses
      if (options.forceReplace || prev.length === 0) {
        return dbAnalyses;
      }
      
      // If no database analyses, keep current state
      if (dbAnalyses.length === 0) {
        return prev;
      }
      
      // Merge: Database analyses + new in-memory analyses not yet in database
      const dbAnalysisIds = new Set(dbAnalyses.map(analysis => analysis.id));
      const newInMemoryAnalyses = prev.filter(analysis => !dbAnalysisIds.has(analysis.id));
      
      // Prioritize analyses for images being synced
      const prioritizedAnalyses = newInMemoryAnalyses.filter(analysis => 
        pendingBackgroundSync.has(analysis.imageId) || analysis.status === 'processing'
      );
      
      return [...dbAnalyses, ...newInMemoryAnalyses];
    });
    
    // Other state items can be directly set since they're not part of immediate upload flow
    setImageGroups(data.imageGroups || []);
    setGroupAnalysesWithPrompts(data.groupAnalysesWithPrompts || []);
    setGeneratedConcepts(data.generatedConcepts || []);
    setGroupAnalyses(data.groupAnalyses || []);
    setGroupPromptSessions(data.groupPromptSessions || []);
  }, [uploadedImages, analyses, pendingBackgroundSync, isUploading]);

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
    isUploading,
    hasPendingSync: pendingBackgroundSync.size > 0,
    
    // Actions
    handleImageUpload,
    handleImageUploadImmediate,
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
    
    // AI Analysis actions
    handleAnalysisComplete,
    
    // Migration actions
    syncToDatabase,
    loadDataFromDatabase,
    updateAppStateFromDatabase,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
