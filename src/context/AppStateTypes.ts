/**
 * Unified App State Types - Clean separation of concerns
 * Breaking circular dependencies by consolidating all types here
 */

// Core domain types
export interface ImageFile {
  id: string;
  file: File;
  url: string;
  dimensions?: { width: number; height: number };
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  analysisStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface UXAnalysis {
  id: string;
  imageId: string;
  userContext?: string;
  visualAnnotations: VisualAnnotation[];
  suggestions: AnalysisSuggestion[];
  summary: AnalysisSummary;
  metadata: AnalysisMetadata;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface VisualAnnotation {
  id: string;
  type: 'issue' | 'suggestion' | 'success';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface AnalysisSuggestion {
  id: string;
  category: 'usability' | 'accessibility' | 'visual' | 'content' | 'performance';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionItems: string[];
}

export interface AnalysisSummary {
  overallScore: number;
  categoryScores: {
    usability: number;
    accessibility: number;
    visual: number;
    content: number;
  };
  keyInsights: string[];
  criticalIssues: number;
}

export interface AnalysisMetadata {
  processingTime?: number;
  modelVersion?: string;
  confidenceScore?: number;
  [key: string]: unknown;
}

export interface ImageGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  imageIds: string[];
  position: { x: number; y: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupAnalysis {
  id: string;
  groupId: string;
  prompt: string;
  isCustom: boolean;
  summary: Record<string, unknown>;
  insights: string[];
  recommendations: string[];
  patterns: Record<string, unknown>;
  parentAnalysisId?: string;
  createdAt: Date;
}

export interface GeneratedConcept {
  id: string;
  imageId: string;
  prompt: string;
  imageUrl: string;
  description: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

// App State interface
export interface AppState {
  // Data state
  uploadedImages: ImageFile[];
  analyses: UXAnalysis[];
  selectedImageId: string | null;
  imageGroups: ImageGroup[];
  groupAnalysesWithPrompts: GroupAnalysis[];
  generatedConcepts: GeneratedConcept[];
  
  // UI state
  showAnnotations: boolean;
  galleryTool: 'select' | 'group' | 'analyze';
  groupDisplayModes: Record<string, 'collapsed' | 'expanded'>;
  
  // Operation state
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

// Action types
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_GENERATING_CONCEPT'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_IMAGES'; payload: ImageFile[] }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'UPDATE_IMAGE'; payload: { id: string; updates: Partial<ImageFile> } }
  | { type: 'SET_SELECTED_IMAGE'; payload: string | null }
  | { type: 'ADD_ANALYSIS'; payload: UXAnalysis }
  | { type: 'UPDATE_ANALYSIS'; payload: { id: string; updates: Partial<UXAnalysis> } }
  | { type: 'REMOVE_ANALYSIS'; payload: string }
  | { type: 'CREATE_GROUP'; payload: ImageGroup }
  | { type: 'UPDATE_GROUP'; payload: { id: string; updates: Partial<ImageGroup> } }
  | { type: 'DELETE_GROUP'; payload: string }
  | { type: 'ADD_GROUP_ANALYSIS'; payload: GroupAnalysis }
  | { type: 'ADD_GENERATED_CONCEPT'; payload: GeneratedConcept }
  | { type: 'TOGGLE_ANNOTATIONS' }
  | { type: 'SET_GALLERY_TOOL'; payload: 'select' | 'group' | 'analyze' }
  | { type: 'SET_GROUP_DISPLAY_MODE'; payload: { groupId: string; mode: 'collapsed' | 'expanded' } }
  | { type: 'ADD_PENDING_SYNC'; payload: string }
  | { type: 'REMOVE_PENDING_SYNC'; payload: string }
  | { type: 'SET_LAST_SYNC_TIMESTAMP'; payload: Date }
  | { type: 'INCREMENT_VERSION' }
  | { type: 'BATCH_UPLOAD'; payload: { images: ImageFile[]; analyses: UXAnalysis[] } }
  | { type: 'MERGE_FROM_DATABASE'; payload: Partial<AppState> }
  | { type: 'CLEAR_ALL_DATA' }
  | { type: 'RESTORE_STATE'; payload: AppState };

// State selector type
export type StateSelector<T> = (state: AppState) => T;

// Initial state
export const initialAppState: AppState = {
  uploadedImages: [],
  analyses: [],
  selectedImageId: null,
  imageGroups: [],
  groupAnalysesWithPrompts: [],
  generatedConcepts: [],
  showAnnotations: true,
  galleryTool: 'select',
  groupDisplayModes: {},
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
  getImageById: (state: AppState, id: string): ImageFile | undefined =>
    state.uploadedImages.find(img => img.id === id),
  
  getAnalysisForImage: (state: AppState, imageId: string): UXAnalysis | undefined =>
    state.analyses.find(analysis => analysis.imageId === imageId),
  
  getGroupById: (state: AppState, id: string): ImageGroup | undefined =>
    state.imageGroups.find(group => group.id === id),
  
  getImagesInGroup: (state: AppState, groupId: string): ImageFile[] => {
    const group = state.imageGroups.find(g => g.id === groupId);
    if (!group) return [];
    return state.uploadedImages.filter(img => group.imageIds.includes(img.id));
  },
  
  getGroupAnalyses: (state: AppState, groupId: string): GroupAnalysis[] =>
    state.groupAnalysesWithPrompts.filter(ga => ga.groupId === groupId),
  
  hasOperationsInProgress: (state: AppState): boolean =>
    state.isLoading || state.isSyncing || state.isUploading || state.isGeneratingConcept,
  
  getPendingSyncCount: (state: AppState): number =>
    state.pendingBackgroundSync.size,
  
  getSelectedImage: (state: AppState): ImageFile | undefined =>
    state.selectedImageId ? selectors.getImageById(state, state.selectedImageId) : undefined,
  
  getAnalysisStats: (state: AppState) => ({
    total: state.analyses.length,
    completed: state.analyses.filter(a => a.status === 'completed').length,
    failed: state.analyses.filter(a => a.status === 'failed').length,
    pending: state.analyses.filter(a => a.status === 'pending').length,
  }),
};