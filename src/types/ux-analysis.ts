export interface AnnotationPoint {
  id: string;
  x: number;
  y: number;
  type: 'issue' | 'suggestion' | 'success';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Suggestion {
  id: string;
  category: 'usability' | 'accessibility' | 'visual' | 'content' | 'performance';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  actionItems: string[];
  relatedAnnotations: string[];
}

export interface VisionMetadata {
  objects: Array<{
    name: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  text: string[];
  colors: Array<{
    color: string;
    percentage: number;
  }>;
  faces: number;
}

export interface AnalysisSummary {
  overallScore: number;
  categoryScores: {
    usability: number;
    accessibility: number;
    visual: number;
    content: number;
  };
  keyIssues: string[];
  strengths: string[];
}

export interface GeneratedConcept {
  id: string;
  analysisId: string;
  imageUrl: string;
  title: string;
  description: string;
  improvements: string[];
  createdAt: Date;
}

export interface ImageGroup {
  id: string;
  name: string;
  description: string;
  imageIds: string[];
  position: { x: number; y: number };
  color: string;
  createdAt: Date;
}

export interface GroupPromptSession {
  id: string;
  groupId: string;
  prompt: string;
  isCustom: boolean;
  status: 'pending' | 'processing' | 'completed' | 'error';
  parentSessionId?: string; // For branching/forking
  createdAt: Date;
}

export interface GroupAnalysisWithPrompt {
  id: string;
  sessionId: string;
  groupId: string;
  prompt: string;
  summary: {
    overallScore: number;
    consistency: number;
    thematicCoherence: number;
    userFlowContinuity: number;
  };
  insights: string[];
  recommendations: string[];
  patterns: {
    commonElements: string[];
    designInconsistencies: string[];
    userJourneyGaps: string[];
  };
  createdAt: Date;
}

export interface GroupAnalysis {
  id: string;
  groupId: string;
  summary: {
    overallScore: number;
    consistency: number;
    thematicCoherence: number;
    userFlowContinuity: number;
  };
  insights: string[];
  recommendations: string[];
  patterns: {
    commonElements: string[];
    designInconsistencies: string[];
    userJourneyGaps: string[];
  };
  createdAt: Date;
}

export interface UXAnalysis {
  id: string;
  imageId: string;
  imageName: string;
  imageUrl: string;
  userContext: string;
  visualAnnotations: AnnotationPoint[];
  suggestions: Suggestion[];
  summary: AnalysisSummary;
  metadata: VisionMetadata;
  createdAt: Date;
  status?: 'processing' | 'analyzing' | 'completed' | 'error';
}

export interface UploadedImage {
  id: string;
  name: string;
  url: string;
  file: File;
  dimensions: {
    width: number;
    height: number;
  };
  status?: 'uploading' | 'uploaded' | 'syncing' | 'processing' | 'analyzing' | 'completed' | 'error';
}