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
}