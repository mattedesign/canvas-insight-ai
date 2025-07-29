/**
 * App State Reducer - Pure state management logic
 * Optimized for performance and predictability
 */

import type { AppState, AppAction } from './AppStateTypes';

export function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    
    case 'SET_GENERATING_CONCEPT':
      return { ...state, isGeneratingConcept: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'ADD_IMAGES':
      return {
        ...state,
        uploadedImages: [...state.uploadedImages, ...action.payload],
        version: state.version + 1,
      };
    
    case 'REMOVE_IMAGE': {
      const imageId = action.payload;
      return {
        ...state,
        uploadedImages: state.uploadedImages.filter(img => img.id !== imageId),
        analyses: state.analyses.filter(analysis => analysis.imageId !== imageId),
        selectedImageId: state.selectedImageId === imageId ? null : state.selectedImageId,
        generatedConcepts: state.generatedConcepts.filter(concept => concept.analysisId !== imageId),
        // Remove from groups
        imageGroups: state.imageGroups.map(group => ({
          ...group,
          imageIds: group.imageIds.filter(id => id !== imageId),
        })),
        version: state.version + 1,
      };
    }
    
    case 'UPDATE_IMAGE': {
      const { id, updates } = action.payload;
      return {
        ...state,
        uploadedImages: state.uploadedImages.map(img =>
          img.id === id ? { ...img, ...updates } : img
        ),
        version: state.version + 1,
      };
    }
    
    case 'SET_SELECTED_IMAGE':
      return { ...state, selectedImageId: action.payload };
    
    case 'ADD_ANALYSIS':
      return {
        ...state,
        analyses: [...state.analyses, action.payload],
        version: state.version + 1,
      };
    
    case 'UPDATE_ANALYSIS': {
      const { imageId, analysis } = action.payload;
      const existingIndex = state.analyses.findIndex(a => a.imageId === imageId);
      let newAnalyses;
      
      if (existingIndex >= 0) {
        newAnalyses = [...state.analyses];
        newAnalyses[existingIndex] = analysis;
      } else {
        newAnalyses = [...state.analyses, analysis];
      }
      
      return {
        ...state,
        analyses: newAnalyses,
        version: state.version + 1,
      };
    }
    
    case 'REMOVE_ANALYSIS':
      return {
        ...state,
        analyses: state.analyses.filter(analysis => analysis.imageId !== action.payload),
        version: state.version + 1,
      };
    
    case 'ADD_GROUP':
    case 'CREATE_GROUP':
      return {
        ...state,
        imageGroups: [...state.imageGroups, action.payload],
        version: state.version + 1,
      };
    
    case 'UPDATE_GROUP': {
      const { id, updates } = action.payload;
      return {
        ...state,
        imageGroups: state.imageGroups.map(group =>
          group.id === id ? { ...group, ...updates } : group
        ),
        version: state.version + 1,
      };
    }
    
    case 'DELETE_GROUP':
    case 'REMOVE_GROUP': {
      const groupId = action.payload;
      return {
        ...state,
        imageGroups: state.imageGroups.filter(group => group.id !== groupId),
        groupAnalysesWithPrompts: state.groupAnalysesWithPrompts.filter(
          ga => ga.groupId !== groupId
        ),
        version: state.version + 1,
      };
    }
    
    case 'ADD_GROUP_ANALYSIS':
      return {
        ...state,
        groupAnalysesWithPrompts: [...state.groupAnalysesWithPrompts, action.payload],
        version: state.version + 1,
      };
    
    case 'ADD_GENERATED_CONCEPT':
      return {
        ...state,
        generatedConcepts: [...state.generatedConcepts, action.payload],
        version: state.version + 1,
      };
    
    case 'SET_CONCEPTS':
      return {
        ...state,
        generatedConcepts: action.payload,
        version: state.version + 1,
      };
    
    case 'TOGGLE_ANNOTATIONS':
      return { ...state, showAnnotations: !state.showAnnotations, version: state.version + 1 };
    
    case 'SET_GALLERY_TOOL':
      return { ...state, galleryTool: action.payload };
    
    case 'SET_GROUP_DISPLAY_MODE':
      return {
        ...state,
        groupDisplayModes: {
          ...state.groupDisplayModes,
          [action.payload.groupId]: action.payload.mode,
        },
      };
    
    case 'ADD_PENDING_SYNC': {
      const newPendingSync = new Set(state.pendingBackgroundSync);
      newPendingSync.add(action.payload);
      return { ...state, pendingBackgroundSync: newPendingSync };
    }
    
    case 'REMOVE_PENDING_SYNC': {
      const newPendingSync = new Set(state.pendingBackgroundSync);
      newPendingSync.delete(action.payload);
      return { ...state, pendingBackgroundSync: newPendingSync };
    }
    
    case 'SET_LAST_SYNC_TIMESTAMP':
      return { ...state, lastSyncTimestamp: action.payload };
    
    case 'INCREMENT_VERSION':
      return { ...state, version: state.version + 1 };
    
    case 'BATCH_UPLOAD': {
      const { images, analyses } = action.payload;
      return {
        ...state,
        uploadedImages: [...state.uploadedImages, ...images],
        analyses: [...state.analyses, ...analyses],
        version: state.version + 1,
      };
    }
    
    case 'MERGE_FROM_DATABASE': {
      const { preserveUploading } = action.meta || {};
      const currentlyUploading = preserveUploading
        ? state.uploadedImages.filter(img => img.id.startsWith('temp-') || img.status === 'uploading')
        : [];

      return {
        ...state,
        // 🚨 FIX: Preserve uploading images and merge with database data
        uploadedImages: [
          ...currentlyUploading, // Keep temp/uploading images
          ...(action.payload.uploadedImages || []).filter(img =>
            !currentlyUploading.some(temp => temp.id === img.id)
          )
        ],
        analyses: [
          ...state.analyses.filter(analysis =>
            currentlyUploading.some(img => img.id === analysis.imageId)
          ),
          ...(action.payload.analyses || [])
        ],
        imageGroups: action.payload.imageGroups || state.imageGroups,
        groupAnalysesWithPrompts: action.payload.groupAnalysesWithPrompts || state.groupAnalysesWithPrompts,
        generatedConcepts: action.payload.generatedConcepts || state.generatedConcepts,
        isLoading: false,
        version: state.version + 1,
      };
    }
    
    case 'CLEAR_ALL_DATA':
    case 'RESET_STATE':
      return {
        ...state,
        uploadedImages: [],
        analyses: [],
        selectedImageId: null,
        imageGroups: [],
        groupAnalysesWithPrompts: [],
        generatedConcepts: [],
        pendingBackgroundSync: new Set(),
        error: null,
        version: state.version + 1,
      };
    
    case 'RESTORE_STATE':
      return {
        ...action.payload,
        // Ensure sets are properly restored
        pendingBackgroundSync: action.payload.pendingBackgroundSync instanceof Set 
          ? action.payload.pendingBackgroundSync 
          : new Set(action.payload.pendingBackgroundSync),
      };
    
    default:
      return state;
  }
}