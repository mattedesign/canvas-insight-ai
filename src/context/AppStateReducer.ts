/**
 * Simplified App State Reducer - No atomic operations, no complex validation
 * Direct state updates for maximum performance
 */

import type { AppState, AppAction } from './AppStateTypes';
import { initialAppState } from './AppStateTypes';

export function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'ADD_IMAGES':
      return { 
        ...state, 
        uploadedImages: [...state.uploadedImages, ...action.payload] 
      };
    
    case 'REMOVE_IMAGE':
      return {
        ...state,
        uploadedImages: state.uploadedImages.filter(img => img.id !== action.payload)
      };
    
    case 'CLEAR_IMAGES':
      return { ...state, uploadedImages: [] };
    
    case 'ADD_ANALYSIS':
      return {
        ...state,
        analyses: [...state.analyses, action.payload]
      };

    case 'SET_ANALYSES':
      return {
        ...state,
        analyses: action.payload
      };
    
    case 'CLEAR_ANALYSES':
      return { ...state, analyses: [] };
    
    case 'ADD_GROUP':
      return {
        ...state,
        imageGroups: [...state.imageGroups, action.payload]
      };
    
    case 'REMOVE_GROUP':
      return {
        ...state,
        imageGroups: state.imageGroups.filter(group => group.id !== action.payload)
      };
    
    case 'CLEAR_GROUPS':
      return { ...state, imageGroups: [] };
    
    case 'ADD_GROUP_ANALYSIS':
      return {
        ...state,
        groupAnalysesWithPrompts: [...state.groupAnalysesWithPrompts, action.payload]
      };
    
    case 'TOGGLE_ANNOTATIONS':
      return { ...state, showAnnotations: !state.showAnnotations };
    
    case 'MERGE_FROM_DATABASE':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
        error: null
      };
    
    case 'RESET_STATE':
      return { ...initialAppState };
    
    default:
      return state;
  }
}