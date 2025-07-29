/**
 * Unified State Management Types
 * Centralizes all state types to prevent race conditions
 */

import type { UploadedImage, UXAnalysis, ImageGroup, GroupAnalysisWithPrompt, GeneratedConcept, GroupAnalysis, GroupPromptSession } from '@/types/ux-analysis';

// Core application state
export interface AppState {
  // Data state
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  imageGroups: ImageGroup[];
  groupAnalysesWithPrompts: GroupAnalysisWithPrompt[];
  generatedConcepts: GeneratedConcept[];
  groupAnalyses: GroupAnalysis[];
  groupPromptSessions: GroupPromptSession[];
  
  // UI state
  selectedImageId: string | null;
  showAnnotations: boolean;
  galleryTool: 'cursor' | 'draw';
  groupDisplayModes: Record<string, 'standard' | 'stacked'>;
  
  // Operation state
  isLoading: boolean;
  isSyncing: boolean;
  isUploading: boolean;
  isGeneratingConcept: boolean;
  pendingBackgroundSync: Set<string>;
  
  // Version tracking for conflict resolution
  version: number;
  lastSyncTimestamp: number;
}

// Action types for state updates
export type AppAction = 
  // Data actions
  | { type: 'SET_IMAGES'; payload: UploadedImage[] }
  | { type: 'ADD_IMAGES'; payload: UploadedImage[] }
  | { type: 'UPDATE_IMAGE'; payload: { id: string; updates: Partial<UploadedImage> } }
  | { type: 'REMOVE_IMAGE'; payload: string }
  
  | { type: 'SET_ANALYSES'; payload: UXAnalysis[] }
  | { type: 'ADD_ANALYSES'; payload: UXAnalysis[] }
  | { type: 'UPDATE_ANALYSIS'; payload: { imageId: string; analysis: UXAnalysis } }
  | { type: 'REMOVE_ANALYSIS'; payload: string }
  
  | { type: 'SET_GROUPS'; payload: ImageGroup[] }
  | { type: 'ADD_GROUP'; payload: ImageGroup }
  | { type: 'UPDATE_GROUP'; payload: { id: string; updates: Partial<ImageGroup> } }
  | { type: 'REMOVE_GROUP'; payload: string }
  
  | { type: 'SET_GROUP_ANALYSES'; payload: GroupAnalysisWithPrompt[] }
  | { type: 'ADD_GROUP_ANALYSIS'; payload: GroupAnalysisWithPrompt }
  
  | { type: 'SET_CONCEPTS'; payload: GeneratedConcept[] }
  | { type: 'ADD_CONCEPT'; payload: GeneratedConcept }
  
  | { type: 'SET_GROUP_ANALYSES_RAW'; payload: GroupAnalysis[] }
  | { type: 'SET_GROUP_PROMPT_SESSIONS'; payload: GroupPromptSession[] }
  
  // UI actions
  | { type: 'SET_SELECTED_IMAGE'; payload: string | null }
  | { type: 'TOGGLE_ANNOTATIONS' }
  | { type: 'SET_ANNOTATIONS_VISIBLE'; payload: boolean }
  | { type: 'SET_GALLERY_TOOL'; payload: 'cursor' | 'draw' }
  | { type: 'SET_GROUP_DISPLAY_MODE'; payload: { groupId: string; mode: 'standard' | 'stacked' } }
  
  // Operation actions
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_GENERATING_CONCEPT'; payload: boolean }
  | { type: 'ADD_PENDING_SYNC'; payload: string }
  | { type: 'REMOVE_PENDING_SYNC'; payload: string }
  | { type: 'CLEAR_PENDING_SYNC' }
  
  // Batch/atomic actions
  | { type: 'BATCH_UPLOAD'; payload: { images: UploadedImage[]; analyses: UXAnalysis[] } }
  | { type: 'MERGE_FROM_DATABASE'; payload: Partial<AppState>; meta: { forceReplace?: boolean } }
  | { type: 'RESET_STATE' }
  | { type: 'RESTORE_FROM_SNAPSHOT'; payload: Partial<AppState> };

// Initial state
export const initialAppState: AppState = {
  uploadedImages: [],
  analyses: [],
  imageGroups: [],
  groupAnalysesWithPrompts: [],
  generatedConcepts: [],
  groupAnalyses: [],
  groupPromptSessions: [],
  
  selectedImageId: null,
  showAnnotations: true,
  galleryTool: 'cursor',
  groupDisplayModes: {},
  
  isLoading: false,
  isSyncing: false,
  isUploading: false,
  isGeneratingConcept: false,
  pendingBackgroundSync: new Set(),
  
  version: 0,
  lastSyncTimestamp: Date.now()
};

// Selector types for performance optimization
export type StateSelector<T> = (state: AppState) => T;

// Common selectors
export const selectors = {
  getImageById: (id: string): StateSelector<UploadedImage | undefined> => 
    (state) => state.uploadedImages.find(img => img.id === id),
    
  getAnalysisForImage: (imageId: string): StateSelector<UXAnalysis | undefined> => 
    (state) => state.analyses.find(analysis => analysis.imageId === imageId),
    
  getSelectedImage: (): StateSelector<UploadedImage | undefined> => 
    (state) => state.selectedImageId ? state.uploadedImages.find(img => img.id === state.selectedImageId) : undefined,
    
  getImagesInGroup: (groupId: string): StateSelector<UploadedImage[]> => 
    (state) => {
      const group = state.imageGroups.find(g => g.id === groupId);
      if (!group) return [];
      return state.uploadedImages.filter(img => group.imageIds.includes(img.id));
    },
    
  getCompletedAnalyses: (): StateSelector<UXAnalysis[]> => 
    (state) => state.analyses.filter(analysis => analysis.status === 'completed'),
    
  hasOperationsInProgress: (): StateSelector<boolean> => 
    (state) => state.isLoading || state.isSyncing || state.isUploading || state.isGeneratingConcept || state.pendingBackgroundSync.size > 0
};