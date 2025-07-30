/**
 * Unified App State Types - Clean separation of concerns
 * Breaking circular dependencies by consolidating all types here
 */

// Import existing types to maintain compatibility
import type { UploadedImage, UXAnalysis as LegacyUXAnalysis, ImageGroup as LegacyImageGroup, GroupAnalysisWithPrompt, GeneratedConcept as LegacyGeneratedConcept } from '@/types/ux-analysis';

// Export types for use in other modules
export type { UploadedImage, LegacyUXAnalysis, LegacyImageGroup, GroupAnalysisWithPrompt, LegacyGeneratedConcept };

// Use existing types but with enhanced structure
export type ImageFile = UploadedImage;
export type UXAnalysis = LegacyUXAnalysis;
export type ImageGroup = LegacyImageGroup;
export type GeneratedConcept = LegacyGeneratedConcept;
export type GroupAnalysis = GroupAnalysisWithPrompt;

// ✅ PHASE 3.1: LOADING STATE MACHINE TYPES
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingStateInfo {
  state: LoadingState;
  operation?: string;
  progress?: number;
  error?: string;
}

// App State interface - using existing types for compatibility
export interface AppState {
  // Data state
  uploadedImages: UploadedImage[];
  analyses: LegacyUXAnalysis[];
  selectedImageId: string | null;
  imageGroups: LegacyImageGroup[];
  groupAnalysesWithPrompts: GroupAnalysisWithPrompt[];
  generatedConcepts: LegacyGeneratedConcept[];
  groupAnalyses: GroupAnalysisWithPrompt[]; // For backward compatibility
  groupPromptSessions: GroupAnalysisWithPrompt[]; // For backward compatibility
  
  // UI state
  showAnnotations: boolean;
  galleryTool: 'cursor' | 'draw'; // Match existing values
  groupDisplayModes: Record<string, 'standard' | 'stacked'>; // Match existing values
  
  // ✅ PHASE 3.1: LOADING STATE MACHINE
  loadingState: LoadingStateInfo;
  uploadingState: LoadingStateInfo;
  syncingState: LoadingStateInfo;
  
  // Legacy operation state (for backward compatibility)
  isLoading: boolean;
  isSyncing: boolean;
  isUploading: boolean;
  isGeneratingConcept: boolean;
  error: string | null;
  
  // Sync state
  pendingBackgroundSync: Set<string>;
  lastSyncTimestamp: Date | null;
  version: number;
}

// Action types - enhanced with missing actions
export type AppAction =
  // ✅ PHASE 3.1: LOADING STATE MACHINE ACTIONS
  | { type: 'SET_LOADING_STATE'; payload: LoadingStateInfo }
  | { type: 'SET_UPLOADING_STATE'; payload: LoadingStateInfo }
  | { type: 'SET_SYNCING_STATE'; payload: LoadingStateInfo }
  // Legacy loading actions (for backward compatibility)
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_GENERATING_CONCEPT'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_IMAGES'; payload: UploadedImage[] }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'UPDATE_IMAGE'; payload: { id: string; updates: Partial<UploadedImage> } }
  | { type: 'SET_SELECTED_IMAGE'; payload: string | null }
  | { type: 'ADD_ANALYSIS'; payload: LegacyUXAnalysis }
  | { type: 'UPDATE_ANALYSIS'; payload: { imageId: string; analysis: LegacyUXAnalysis } }
  | { type: 'REMOVE_ANALYSIS'; payload: string }
  | { type: 'ADD_GROUP'; payload: LegacyImageGroup }
  | { type: 'CREATE_GROUP'; payload: LegacyImageGroup }
  | { type: 'UPDATE_GROUP'; payload: { id: string; updates: Partial<LegacyImageGroup> } }
  | { type: 'DELETE_GROUP'; payload: string }
  | { type: 'REMOVE_GROUP'; payload: string }
  | { type: 'ADD_GROUP_ANALYSIS'; payload: GroupAnalysisWithPrompt }
  | { type: 'ADD_GENERATED_CONCEPT'; payload: LegacyGeneratedConcept }
  | { type: 'SET_CONCEPTS'; payload: LegacyGeneratedConcept[] }
  | { type: 'TOGGLE_ANNOTATIONS' }
  | { type: 'SET_GALLERY_TOOL'; payload: 'cursor' | 'draw' }
  | { type: 'SET_GROUP_DISPLAY_MODE'; payload: { groupId: string; mode: 'standard' | 'stacked' } }
  | { type: 'ADD_PENDING_SYNC'; payload: string }
  | { type: 'REMOVE_PENDING_SYNC'; payload: string }
  | { type: 'SET_LAST_SYNC_TIMESTAMP'; payload: Date }
  | { type: 'INCREMENT_VERSION' }
  | { type: 'BATCH_UPLOAD'; payload: { images: UploadedImage[]; analyses: LegacyUXAnalysis[] } }
  | { type: 'MERGE_FROM_DATABASE'; payload: Partial<AppState>; meta?: { forceReplace?: boolean; preserveUploading?: boolean } }
  | { type: 'CLEAR_ALL_DATA' }
  | { type: 'RESET_STATE' }
  | { type: 'RESTORE_STATE'; payload: AppState };

// State selector type
export type StateSelector<T> = (state: AppState) => T;

// ✅ PHASE 3.1: DEFAULT LOADING STATE
const createIdleLoadingState = (): LoadingStateInfo => ({
  state: 'idle',
  operation: undefined,
  progress: undefined,
  error: undefined,
});

// Initial state
export const initialAppState: AppState = {
  uploadedImages: [],
  analyses: [],
  selectedImageId: null,
  imageGroups: [],
  groupAnalysesWithPrompts: [],
  generatedConcepts: [],
  groupAnalyses: [], // For backward compatibility
  groupPromptSessions: [], // For backward compatibility
  showAnnotations: true,
  galleryTool: 'cursor',
  groupDisplayModes: {},
  
  // ✅ PHASE 3.1: LOADING STATE MACHINE INITIAL VALUES
  loadingState: createIdleLoadingState(),
  uploadingState: createIdleLoadingState(),
  syncingState: createIdleLoadingState(),
  
  // Legacy operation state (for backward compatibility)
  isLoading: false,
  isSyncing: false,
  isUploading: false,
  isGeneratingConcept: false,
  error: null,
  pendingBackgroundSync: new Set(),
  lastSyncTimestamp: null,
  version: 0,
};

// Memoized selectors for performance
export const selectors = {
  getImageById: (state: AppState, id: string): UploadedImage | undefined =>
    state.uploadedImages.find(img => img.id === id),
  
  getAnalysisForImage: (state: AppState, imageId: string): LegacyUXAnalysis | undefined =>
    state.analyses.find(analysis => analysis.imageId === imageId),
  
  getGroupById: (state: AppState, id: string): LegacyImageGroup | undefined =>
    state.imageGroups.find(group => group.id === id),
  
  getImagesInGroup: (state: AppState, groupId: string): UploadedImage[] => {
    const group = state.imageGroups.find(g => g.id === groupId);
    if (!group) return [];
    return state.uploadedImages.filter(img => group.imageIds.includes(img.id));
  },
  
  getGroupAnalyses: (state: AppState, groupId: string): GroupAnalysisWithPrompt[] =>
    state.groupAnalysesWithPrompts.filter(ga => ga.groupId === groupId),
  
  // ✅ PHASE 3.1: LOADING STATE MACHINE SELECTORS
  hasOperationsInProgress: (state: AppState): boolean =>
    state.loadingState.state === 'loading' || 
    state.syncingState.state === 'loading' || 
    state.uploadingState.state === 'loading' || 
    state.isGeneratingConcept,
  
  isDataLoading: (state: AppState): boolean =>
    state.loadingState.state === 'loading',
  
  isUploading: (state: AppState): boolean =>
    state.uploadingState.state === 'loading',
  
  isSyncing: (state: AppState): boolean =>
    state.syncingState.state === 'loading',
  
  getLoadingProgress: (state: AppState): number | undefined =>
    state.uploadingState.progress,
  
  getLoadingOperation: (state: AppState): string | undefined =>
    state.loadingState.operation || state.uploadingState.operation || state.syncingState.operation,
  
  hasLoadingErrors: (state: AppState): boolean =>
    state.loadingState.state === 'error' ||
    state.uploadingState.state === 'error' ||
    state.syncingState.state === 'error',
  
  getLoadingErrors: (state: AppState): string[] => {
    const errors: string[] = [];
    if (state.loadingState.state === 'error' && state.loadingState.error) {
      errors.push(state.loadingState.error);
    }
    if (state.uploadingState.state === 'error' && state.uploadingState.error) {
      errors.push(state.uploadingState.error);
    }
    if (state.syncingState.state === 'error' && state.syncingState.error) {
      errors.push(state.syncingState.error);
    }
    return errors;
  },
  
  // Legacy selectors (backward compatibility)
  getPendingSyncCount: (state: AppState): number =>
    state.pendingBackgroundSync.size,
  
  getSelectedImage: (state: AppState): UploadedImage | undefined =>
    state.selectedImageId ? selectors.getImageById(state, state.selectedImageId) : undefined,
  
  getAnalysisStats: (state: AppState) => ({
    total: state.analyses.length,
    completed: state.analyses.filter(a => a.status === 'completed').length,
    failed: state.analyses.filter(a => a.status === 'error').length,
    pending: state.analyses.filter(a => a.status === 'processing').length,
  }),
};