/**
 * Phase 4: Strict TypeScript Interfaces
 * Comprehensive type definitions for state management and actions
 */

// Strict state interfaces
export interface StrictAppState {
  readonly images: ReadonlyArray<StrictUploadedImage>;
  readonly analyses: ReadonlyArray<StrictUXAnalysis>;
  readonly groups: ReadonlyArray<StrictImageGroup>;
  readonly selectedImageId: string | null;
  readonly selectedGroupId: string | null;
  readonly isLoading: boolean;
  readonly isInitialized: boolean;
  readonly error: string | null;
  readonly lastSync: Date | null;
}

export interface StrictUploadedImage {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly file: File;
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly status: 'uploading' | 'uploaded' | 'syncing' | 'processing' | 'analyzing' | 'completed' | 'error';
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface StrictUXAnalysis {
  readonly id: string;
  readonly imageId: string;
  readonly imageName: string;
  readonly imageUrl: string;
  readonly userContext: string;
  readonly visualAnnotations: ReadonlyArray<StrictAnnotationPoint>;
  readonly suggestions: ReadonlyArray<StrictSuggestion>;
  readonly summary: StrictAnalysisSummary;
  readonly metadata: StrictVisionMetadata;
  readonly createdAt: Date;
  readonly modelUsed?: string;
  readonly status?: 'processing' | 'analyzing' | 'completed' | 'error';
}

export interface StrictAnnotationPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly type: 'issue' | 'suggestion' | 'success';
  readonly title: string;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high';
}

export interface StrictSuggestion {
  readonly id: string;
  readonly category: 'usability' | 'accessibility' | 'visual' | 'content' | 'performance';
  readonly title: string;
  readonly description: string;
  readonly impact: 'low' | 'medium' | 'high';
  readonly effort: 'low' | 'medium' | 'high';
  readonly actionItems: ReadonlyArray<string>;
  readonly relatedAnnotations: ReadonlyArray<string>;
}

export interface StrictAnalysisSummary {
  readonly overallScore: number;
  readonly categoryScores: {
    readonly usability: number;
    readonly accessibility: number;
    readonly visual: number;
    readonly content: number;
  };
  readonly keyIssues: ReadonlyArray<string>;
  readonly strengths: ReadonlyArray<string>;
}

export interface StrictVisionMetadata {
  readonly objects: ReadonlyArray<{
    readonly name: string;
    readonly confidence: number;
    readonly boundingBox: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };
  }>;
  readonly text: ReadonlyArray<string>;
  readonly colors: ReadonlyArray<{
    readonly color: string;
    readonly percentage: number;
  }>;
  readonly faces: number;
}

export interface StrictImageGroup {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly imageIds: ReadonlyArray<string>;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly color: string;
  readonly createdAt: Date;
}

// Strict action interfaces
export type StrictAppAction = 
  | { readonly type: 'SET_LOADING'; readonly payload: boolean }
  | { readonly type: 'SET_ERROR'; readonly payload: string | null }
  | { readonly type: 'SET_INITIALIZED'; readonly payload: boolean }
  | { readonly type: 'ADD_IMAGE'; readonly payload: StrictUploadedImage }
  | { readonly type: 'UPDATE_IMAGE'; readonly payload: { readonly id: string; readonly updates: Partial<Omit<StrictUploadedImage, 'id'>> } }
  | { readonly type: 'REMOVE_IMAGE'; readonly payload: string }
  | { readonly type: 'SET_IMAGES'; readonly payload: ReadonlyArray<StrictUploadedImage> }
  | { readonly type: 'ADD_ANALYSIS'; readonly payload: StrictUXAnalysis }
  | { readonly type: 'UPDATE_ANALYSIS'; readonly payload: { readonly id: string; readonly updates: Partial<Omit<StrictUXAnalysis, 'id'>> } }
  | { readonly type: 'REMOVE_ANALYSIS'; readonly payload: string }
  | { readonly type: 'SET_ANALYSES'; readonly payload: ReadonlyArray<StrictUXAnalysis> }
  | { readonly type: 'ADD_GROUP'; readonly payload: StrictImageGroup }
  | { readonly type: 'UPDATE_GROUP'; readonly payload: { readonly id: string; readonly updates: Partial<Omit<StrictImageGroup, 'id'>> } }
  | { readonly type: 'REMOVE_GROUP'; readonly payload: string }
  | { readonly type: 'SET_GROUPS'; readonly payload: ReadonlyArray<StrictImageGroup> }
  | { readonly type: 'SELECT_IMAGE'; readonly payload: string | null }
  | { readonly type: 'SELECT_GROUP'; readonly payload: string | null }
  | { readonly type: 'SET_LAST_SYNC'; readonly payload: Date | null }
  | { readonly type: 'RESET_STATE' };

// Strict helper function types
export interface StrictHelperFunctions {
  readonly addImage: (image: StrictUploadedImage) => void;
  readonly removeImage: (imageId: string) => void;
  readonly updateImage: (imageId: string, updates: Partial<Omit<StrictUploadedImage, 'id'>>) => void;
  readonly selectImage: (imageId: string | null) => void;
  readonly addAnalysis: (analysis: StrictUXAnalysis) => void;
  readonly removeAnalysis: (analysisId: string) => void;
  readonly updateAnalysis: (analysisId: string, updates: Partial<Omit<StrictUXAnalysis, 'id'>>) => void;
  readonly addGroup: (group: StrictImageGroup) => void;
  readonly removeGroup: (groupId: string) => void;
  readonly updateGroup: (groupId: string, updates: Partial<Omit<StrictImageGroup, 'id'>>) => void;
  readonly selectGroup: (groupId: string | null) => void;
  readonly setLoading: (loading: boolean) => void;
  readonly setError: (error: string | null) => void;
  readonly setLastSync: (date: Date | null) => void;
  readonly resetState: () => void;
}

// Strict context type
export interface StrictAppContextType {
  readonly state: StrictAppState;
  readonly dispatch: React.Dispatch<StrictAppAction>;
  readonly helpers: StrictHelperFunctions;
}

// Performance monitoring types
export interface PerformanceMetrics {
  readonly renderCount: number;
  readonly slowRenders: number;
  readonly averageRenderTime: number;
  readonly lastRenderTime: number;
  readonly frequentChanges: ReadonlyMap<string, number>;
}

export interface ComponentPerformanceData {
  readonly componentName: string;
  readonly metrics: PerformanceMetrics;
  readonly recommendations: ReadonlyArray<string>;
  readonly timestamp: Date;
}

// Type guards for runtime validation
export function isStrictUploadedImage(obj: unknown): obj is StrictUploadedImage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'url' in obj &&
    'file' in obj &&
    'dimensions' in obj &&
    'status' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj
  );
}

export function isStrictUXAnalysis(obj: unknown): obj is StrictUXAnalysis {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'imageId' in obj &&
    'imageName' in obj &&
    'imageUrl' in obj &&
    'userContext' in obj &&
    'visualAnnotations' in obj &&
    'suggestions' in obj &&
    'summary' in obj &&
    'metadata' in obj &&
    'createdAt' in obj
  );
}

export function isStrictAppAction(obj: unknown): obj is StrictAppAction {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    typeof (obj as any).type === 'string'
  );
}