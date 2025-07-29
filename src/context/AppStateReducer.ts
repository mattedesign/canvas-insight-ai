/**
 * Unified State Reducer
 * Handles all state transitions atomically to prevent race conditions
 */

import type { AppState, AppAction } from './AppStateTypes';

export function appStateReducer(state: AppState, action: AppAction): AppState {
  // Increment version for every state change to track conflicts
  const newVersion = state.version + 1;
  
  switch (action.type) {
    // Image management
    case 'SET_IMAGES':
      return {
        ...state,
        uploadedImages: action.payload,
        version: newVersion
      };
      
    case 'ADD_IMAGES': {
      const existingIds = new Set(state.uploadedImages.map(img => img.id));
      const newImages = action.payload.filter(img => !existingIds.has(img.id));
      
      return {
        ...state,
        uploadedImages: [...state.uploadedImages, ...newImages],
        // Auto-select first image if none selected
        selectedImageId: state.selectedImageId || (newImages.length > 0 ? newImages[0].id : null),
        version: newVersion
      };
    }
    
    case 'UPDATE_IMAGE':
      return {
        ...state,
        uploadedImages: state.uploadedImages.map(img =>
          img.id === action.payload.id ? { ...img, ...action.payload.updates } : img
        ),
        version: newVersion
      };
      
    case 'REMOVE_IMAGE': {
      const filteredImages = state.uploadedImages.filter(img => img.id !== action.payload);
      return {
        ...state,
        uploadedImages: filteredImages,
        analyses: state.analyses.filter(analysis => analysis.imageId !== action.payload),
        // Update selected image if it was removed
        selectedImageId: state.selectedImageId === action.payload 
          ? (filteredImages.length > 0 ? filteredImages[0].id : null)
          : state.selectedImageId,
        version: newVersion
      };
    }
    
    // Analysis management
    case 'SET_ANALYSES':
      return {
        ...state,
        analyses: action.payload,
        version: newVersion
      };
      
    case 'ADD_ANALYSES': {
      const existingImageIds = new Set(state.analyses.map(analysis => analysis.imageId));
      const newAnalyses = action.payload.filter(analysis => !existingImageIds.has(analysis.imageId));
      
      return {
        ...state,
        analyses: [...state.analyses, ...newAnalyses],
        version: newVersion
      };
    }
    
    case 'UPDATE_ANALYSIS': {
      const existingIndex = state.analyses.findIndex(a => a.imageId === action.payload.imageId);
      let newAnalyses;
      
      if (existingIndex >= 0) {
        newAnalyses = [...state.analyses];
        newAnalyses[existingIndex] = action.payload.analysis;
      } else {
        newAnalyses = [...state.analyses, action.payload.analysis];
      }
      
      // Update corresponding image status
      const updatedImages = state.uploadedImages.map(img =>
        img.id === action.payload.imageId
          ? { ...img, status: action.payload.analysis.status === 'completed' ? 'completed' : img.status }
          : img
      );
      
      return {
        ...state,
        analyses: newAnalyses,
        uploadedImages: updatedImages,
        version: newVersion
      };
    }
    
    case 'REMOVE_ANALYSIS':
      return {
        ...state,
        analyses: state.analyses.filter(analysis => analysis.imageId !== action.payload),
        version: newVersion
      };
    
    // Group management
    case 'SET_GROUPS':
      return {
        ...state,
        imageGroups: action.payload,
        version: newVersion
      };
      
    case 'ADD_GROUP':
      return {
        ...state,
        imageGroups: [...state.imageGroups, action.payload],
        version: newVersion
      };
      
    case 'UPDATE_GROUP':
      return {
        ...state,
        imageGroups: state.imageGroups.map(group =>
          group.id === action.payload.id ? { ...group, ...action.payload.updates } : group
        ),
        version: newVersion
      };
      
    case 'REMOVE_GROUP':
      return {
        ...state,
        imageGroups: state.imageGroups.filter(group => group.id !== action.payload),
        groupAnalysesWithPrompts: state.groupAnalysesWithPrompts.filter(
          analysis => analysis.groupId !== action.payload
        ),
        version: newVersion
      };
    
    // Group analyses
    case 'SET_GROUP_ANALYSES':
      return {
        ...state,
        groupAnalysesWithPrompts: action.payload,
        version: newVersion
      };
      
    case 'ADD_GROUP_ANALYSIS':
      return {
        ...state,
        groupAnalysesWithPrompts: [...state.groupAnalysesWithPrompts, action.payload],
        version: newVersion
      };
    
    // Generated concepts
    case 'SET_CONCEPTS':
      return {
        ...state,
        generatedConcepts: action.payload,
        version: newVersion
      };
      
    case 'ADD_CONCEPT':
      return {
        ...state,
        generatedConcepts: [...state.generatedConcepts, action.payload],
        version: newVersion
      };
    
    // Raw group data
    case 'SET_GROUP_ANALYSES_RAW':
      return {
        ...state,
        groupAnalyses: action.payload,
        version: newVersion
      };
      
    case 'SET_GROUP_PROMPT_SESSIONS':
      return {
        ...state,
        groupPromptSessions: action.payload,
        version: newVersion
      };
    
    // UI state
    case 'SET_SELECTED_IMAGE':
      return {
        ...state,
        selectedImageId: action.payload,
        version: newVersion
      };
      
    case 'TOGGLE_ANNOTATIONS':
      return {
        ...state,
        showAnnotations: !state.showAnnotations,
        version: newVersion
      };
      
    case 'SET_ANNOTATIONS_VISIBLE':
      return {
        ...state,
        showAnnotations: action.payload,
        version: newVersion
      };
      
    case 'SET_GALLERY_TOOL':
      return {
        ...state,
        galleryTool: action.payload,
        version: newVersion
      };
      
    case 'SET_GROUP_DISPLAY_MODE':
      return {
        ...state,
        groupDisplayModes: {
          ...state.groupDisplayModes,
          [action.payload.groupId]: action.payload.mode
        },
        version: newVersion
      };
    
    // Operation state
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        version: newVersion
      };
      
    case 'SET_SYNCING':
      return {
        ...state,
        isSyncing: action.payload,
        version: newVersion
      };
      
    case 'SET_UPLOADING':
      return {
        ...state,
        isUploading: action.payload,
        version: newVersion
      };
      
    case 'SET_GENERATING_CONCEPT':
      return {
        ...state,
        isGeneratingConcept: action.payload,
        version: newVersion
      };
      
    case 'ADD_PENDING_SYNC': {
      const newPendingSync = new Set(state.pendingBackgroundSync);
      newPendingSync.add(action.payload);
      return {
        ...state,
        pendingBackgroundSync: newPendingSync,
        version: newVersion
      };
    }
    
    case 'REMOVE_PENDING_SYNC': {
      const newPendingSync = new Set(state.pendingBackgroundSync);
      newPendingSync.delete(action.payload);
      return {
        ...state,
        pendingBackgroundSync: newPendingSync,
        version: newVersion
      };
    }
    
    case 'CLEAR_PENDING_SYNC':
      return {
        ...state,
        pendingBackgroundSync: new Set(),
        version: newVersion
      };
    
    // Batch/atomic operations
    case 'BATCH_UPLOAD': {
      const existingImageIds = new Set(state.uploadedImages.map(img => img.id));
      const existingAnalysisImageIds = new Set(state.analyses.map(analysis => analysis.imageId));
      
      const newImages = action.payload.images.filter(img => !existingImageIds.has(img.id));
      const newAnalyses = action.payload.analyses.filter(analysis => !existingAnalysisImageIds.has(analysis.imageId));
      
      return {
        ...state,
        uploadedImages: [...state.uploadedImages, ...newImages],
        analyses: [...state.analyses, ...newAnalyses],
        selectedImageId: state.selectedImageId || (newImages.length > 0 ? newImages[0].id : null),
        version: newVersion
      };
    }
    
    case 'MERGE_FROM_DATABASE': {
      const { forceReplace = false } = action.meta || {};
      const hasPendingSync = state.pendingBackgroundSync.size > 0;
      const isUploading = state.isUploading;
      
      // Prevent database merges during upload or when there are pending sync operations
      if ((hasPendingSync || isUploading) && !forceReplace) {
        console.log('Deferring database merge due to', isUploading ? 'active upload' : 'pending sync operations');
        return state;
      }
      
      const dbData = action.payload;
      
      // Force replace: use database data
      if (forceReplace) {
        return {
          ...state,
          ...dbData,
          pendingBackgroundSync: new Set(), // Clear pending sync on force replace
          version: newVersion,
          lastSyncTimestamp: Date.now()
        };
      }
      
      // Smart merge logic
      const mergedState = { ...state };
      
      // Merge images with URL/File preservation
      if (dbData.uploadedImages) {
        const dbImages = dbData.uploadedImages;
        if (state.uploadedImages.length === 0) {
          mergedState.uploadedImages = dbImages;
        } else if (dbImages.length > 0) {
          const dbImageIds = new Set(dbImages.map(img => img.id));
          
          // Preserve temporary images (those with temp IDs) and any other in-memory images
          const tempImages = state.uploadedImages.filter(img => 
            img.id.startsWith('temp-') || !dbImageIds.has(img.id)
          );
          
          const mergedImages = dbImages.map(dbImg => {
            const memoryImg = state.uploadedImages.find(img => img.id === dbImg.id);
            if (memoryImg) {
              return {
                ...dbImg,
                file: memoryImg.file || dbImg.file,
                url: dbImg.url || memoryImg.url,
              };
            }
            return dbImg;
          });
          
          // Keep temp images at the beginning so they appear first on canvas
          mergedState.uploadedImages = [...tempImages, ...mergedImages];
        }
      }
      
      // Merge other data arrays
      if (dbData.analyses) mergedState.analyses = dbData.analyses;
      if (dbData.imageGroups) mergedState.imageGroups = dbData.imageGroups;
      if (dbData.groupAnalysesWithPrompts) mergedState.groupAnalysesWithPrompts = dbData.groupAnalysesWithPrompts;
      if (dbData.generatedConcepts) mergedState.generatedConcepts = dbData.generatedConcepts;
      if (dbData.groupAnalyses) mergedState.groupAnalyses = dbData.groupAnalyses;
      if (dbData.groupPromptSessions) mergedState.groupPromptSessions = dbData.groupPromptSessions;
      
      // Auto-select first image if none selected
      if (!mergedState.selectedImageId && mergedState.uploadedImages.length > 0) {
        mergedState.selectedImageId = mergedState.uploadedImages[0].id;
      }
      
      return {
        ...mergedState,
        version: newVersion,
        lastSyncTimestamp: Date.now()
      };
    }
    
    case 'RESET_STATE':
      return {
        ...state,
        uploadedImages: [],
        analyses: [],
        imageGroups: [],
        groupAnalysesWithPrompts: [],
        generatedConcepts: [],
        groupAnalyses: [],
        groupPromptSessions: [],
        selectedImageId: null,
        pendingBackgroundSync: new Set(),
        version: newVersion
      };
      
    case 'RESTORE_FROM_SNAPSHOT':
      return {
        ...state,
        ...action.payload,
        version: newVersion
      };
    
    default:
      return state;
  }
}