/**
 * Phase 2A: Canvas-Context Interface Reconciliation
 * Unified interface definitions to eliminate mismatches between canvas components and app context
 */

import type { UploadedImage as BaseUploadedImage, UXAnalysis as BaseUXAnalysis, ImageGroup as BaseImageGroup, GeneratedConcept as BaseGeneratedConcept } from '@/types/ux-analysis';

// ===== ENHANCED DIMENSION INTERFACE =====
// Fixes mismatch: UploadedImage.dimensions missing aspectRatio
export interface EnhancedImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

// ===== UNIFIED UPLOADED IMAGE INTERFACE =====
// Reconciles differences between canvas components and app context
export interface UnifiedUploadedImage extends Omit<BaseUploadedImage, 'dimensions'> {
  id: string;
  name: string;
  url: string;
  file: File;
  dimensions?: EnhancedImageDimensions; // Enhanced with aspectRatio
  status?: 'uploading' | 'uploaded' | 'syncing' | 'processing' | 'analyzing' | 'completed' | 'error';
  // Additional metadata for canvas rendering
  projectId?: string;
  userId?: string;
  storagePath?: string;
  uploadProgress?: number;
}

// ===== UNIFIED UX ANALYSIS INTERFACE =====
// Ensures consistency between canvas and context usage
export interface UnifiedUXAnalysis extends BaseUXAnalysis {
  id: string;
  imageId: string;
  imageName: string;
  imageUrl: string;
  userContext: string;
  visualAnnotations: BaseUXAnalysis['visualAnnotations'];
  suggestions: BaseUXAnalysis['suggestions'];
  summary: BaseUXAnalysis['summary'];
  metadata: BaseUXAnalysis['metadata'];
  createdAt: Date;
  modelUsed?: string;
  status?: 'processing' | 'analyzing' | 'completed' | 'error';
  // Additional fields for canvas context
  analysisProgress?: number;
  contextualData?: {
    interfaceType?: string;
    userRole?: string;
    businessContext?: string;
  };
}

// ===== UNIFIED IMAGE GROUP INTERFACE =====
// Reconciles group definition between canvas and context
export interface UnifiedImageGroup extends BaseImageGroup {
  id: string;
  name: string;
  description: string;
  imageIds: string[];
  position: { x: number; y: number };
  color: string;
  createdAt: Date;
  // Enhanced for canvas operations
  projectId?: string;
  userId?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  isCollapsed?: boolean;
  displayMode?: 'standard' | 'stacked';
}

// ===== UNIFIED GENERATED CONCEPT INTERFACE =====
// Ensures consistency for concept generation
export interface UnifiedGeneratedConcept extends BaseGeneratedConcept {
  id: string;
  userId: string;
  imageId: string;
  analysisId: string;
  imageUrl: string;
  title: string;
  description: string;
  improvements: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  // Enhanced for canvas integration
  conceptImageUrl?: string;
  generationProgress?: number;
  conceptType?: 'improvement' | 'variation' | 'alternative';
}

// ===== CANVAS NODE DATA INTERFACES =====
// Standardized interfaces for all canvas nodes

export interface CanvasImageNodeData {
  image: UnifiedUploadedImage;
  analysis?: UnifiedUXAnalysis;
  showAnnotations?: boolean;
  currentTool?: 'cursor' | 'draw';
  onViewChange?: (view: 'gallery' | 'canvas' | 'summary') => void;
  onImageSelect?: (imageId: string) => void;
  onToggleSelection?: (imageId: string, isCtrlOrCmd: boolean) => void;
  isSelected?: boolean;
  onAnalysisComplete?: (imageId: string, analysis: UnifiedUXAnalysis) => void;
  onCreateAnalysisRequest?: (imageId: string) => void;
}

export interface CanvasGroupNodeData {
  group: UnifiedImageGroup;
  images: UnifiedUploadedImage[];
  analyses: UnifiedUXAnalysis[];
  isExpanded?: boolean;
  onGroupSelect?: (groupId: string) => void;
  onGroupAnalysis?: (groupId: string) => void;
  onGroupEdit?: (groupId: string) => void;
  onGroupDelete?: (groupId: string) => void;
  onImageRemoveFromGroup?: (imageId: string, groupId: string) => void;
}

export interface CanvasConceptNodeData {
  concept: UnifiedGeneratedConcept;
  originalImage?: UnifiedUploadedImage;
  onConceptSelect?: (conceptId: string) => void;
  onConceptEdit?: (conceptId: string) => void;
  onConceptDelete?: (conceptId: string) => void;
}

export interface CanvasAnalysisNodeData {
  analysis: UnifiedUXAnalysis;
  image: UnifiedUploadedImage;
  onAnalysisSelect?: (analysisId: string) => void;
  onAnalysisEdit?: (analysisId: string) => void;
  onAnalysisDelete?: (analysisId: string) => void;
  showDetails?: boolean;
}

// ===== CANVAS OPERATION INTERFACES =====
// Standardized interfaces for canvas operations

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasNodePosition {
  nodeId: string;
  position: CanvasPosition;
  parentId?: string;
}

export interface CanvasLayoutConfiguration {
  groupSpacing: number;
  imageSpacing: number;
  padding: number;
  maxWidth: number;
  defaultNodeWidth: number;
  defaultNodeHeight: number;
}

// ===== STORAGE INTEGRATION INTERFACES =====
// Bridge interfaces for storage-database integration

export interface StorageImageMetadata {
  id: string;
  userId: string;
  projectId: string;
  originalFilename: string;
  storagePath: string;
  fileSize: number;
  fileType: string;
  dimensions: EnhancedImageDimensions;
  uploadDate: Date;
  lastAccessed: Date;
}

export interface StorageOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: StorageImageMetadata;
}

// ===== APP STATE INTEGRATION =====
// Enhanced app state types that use unified interfaces

export interface UnifiedAppState {
  // Data state - using unified interfaces
  uploadedImages: UnifiedUploadedImage[];
  analyses: UnifiedUXAnalysis[];
  selectedImageId: string | null;
  imageGroups: UnifiedImageGroup[];
  generatedConcepts: UnifiedGeneratedConcept[];
  
  // Canvas state
  canvasViewport: CanvasViewport;
  selectedNodes: string[];
  nodePositions: Record<string, CanvasPosition>;
  
  // UI state
  showAnnotations: boolean;
  galleryTool: 'cursor' | 'draw';
  groupDisplayModes: Record<string, 'standard' | 'stacked'>;
  
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

// ===== TYPE CONVERTERS =====
// Functions to convert between legacy and unified interfaces

export const convertToUnifiedImage = (image: BaseUploadedImage): UnifiedUploadedImage => ({
  ...image,
  dimensions: image.dimensions ? {
    width: image.dimensions.width,
    height: image.dimensions.height,
    aspectRatio: image.dimensions.width / image.dimensions.height
  } : undefined
});

export const convertToUnifiedAnalysis = (analysis: BaseUXAnalysis): UnifiedUXAnalysis => ({
  ...analysis,
  contextualData: {},
  analysisProgress: 100 // Assume completed if no progress specified
});

export const convertToUnifiedGroup = (group: BaseImageGroup): UnifiedImageGroup => ({
  ...group,
  isCollapsed: false,
  displayMode: 'standard'
});

export const convertToUnifiedConcept = (concept: BaseGeneratedConcept): UnifiedGeneratedConcept => ({
  ...concept,
  generationProgress: 100, // Assume completed
  conceptType: 'improvement'
});

// ===== VALIDATION HELPERS =====
// Type guards and validation functions

export const isValidImageDimensions = (dimensions: any): dimensions is EnhancedImageDimensions => {
  return dimensions && 
         typeof dimensions.width === 'number' && 
         typeof dimensions.height === 'number' && 
         typeof dimensions.aspectRatio === 'number' &&
         dimensions.width > 0 && 
         dimensions.height > 0 &&
         dimensions.aspectRatio > 0;
};

export const isUnifiedUploadedImage = (obj: any): obj is UnifiedUploadedImage => {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.name === 'string' && 
         typeof obj.url === 'string' && 
         obj.file instanceof File;
};

export const isUnifiedUXAnalysis = (obj: any): obj is UnifiedUXAnalysis => {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.imageId === 'string' && 
         Array.isArray(obj.visualAnnotations) && 
         Array.isArray(obj.suggestions);
};

export const isUnifiedImageGroup = (obj: any): obj is UnifiedImageGroup => {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.name === 'string' && 
         Array.isArray(obj.imageIds) && 
         obj.position && 
         typeof obj.position.x === 'number' && 
         typeof obj.position.y === 'number';
};

// ===== INTERFACE COMPATIBILITY MAP =====
// Mapping of old interfaces to new unified interfaces
export const INTERFACE_COMPATIBILITY = {
  UploadedImage: 'UnifiedUploadedImage',
  UXAnalysis: 'UnifiedUXAnalysis', 
  ImageGroup: 'UnifiedImageGroup',
  GeneratedConcept: 'UnifiedGeneratedConcept'
} as const;

// ===== EXPORT UNIFIED TYPES =====
// Re-export for consistent usage throughout the application
export type {
  UnifiedUploadedImage as UploadedImage,
  UnifiedUXAnalysis as UXAnalysis,
  UnifiedImageGroup as ImageGroup,
  UnifiedGeneratedConcept as GeneratedConcept,
  EnhancedImageDimensions as ImageDimensions
};