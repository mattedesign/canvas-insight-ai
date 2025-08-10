import { Node } from '@xyflow/react';

export interface GroupAnalysisProgressData {
  groupId: string;
  groupName: string;
  imageCount: number;
  stage: string;
  progress: number;
  status: 'analyzing' | 'processing' | 'synthesizing' | 'error' | 'completed';
  message?: string;
  error?: string;
  startTime: Date;
}

export class GroupAnalysisProgressService {
  private static instance: GroupAnalysisProgressService;
  private progressCallbacks: Map<string, (data: GroupAnalysisProgressData) => void> = new Map();
  private progressData: Map<string, GroupAnalysisProgressData> = new Map();

  static getInstance(): GroupAnalysisProgressService {
    if (!GroupAnalysisProgressService.instance) {
      GroupAnalysisProgressService.instance = new GroupAnalysisProgressService();
    }
    return GroupAnalysisProgressService.instance;
  }

  /**
   * Start tracking progress for a group analysis
   */
  startGroupAnalysis(
    groupId: string, 
    groupName: string, 
    imageCount: number,
    onProgress: (data: GroupAnalysisProgressData) => void
  ): void {
    const initialData: GroupAnalysisProgressData = {
      groupId,
      groupName,
      imageCount,
      stage: 'starting',
      progress: 0,
      status: 'analyzing',
      message: 'Initializing group analysis...',
      startTime: new Date()
    };

    this.progressData.set(groupId, initialData);
    this.progressCallbacks.set(groupId, onProgress);
    
    // Immediately notify with initial state
    onProgress(initialData);
  }

  /**
   * Update progress for a group analysis
   */
  updateProgress(
    groupId: string,
    stage: string,
    progress: number,
    message?: string,
    status?: GroupAnalysisProgressData['status']
  ): void {
    const existingData = this.progressData.get(groupId);
    if (!existingData) {
      console.warn(`No progress data found for group ${groupId}`);
      return;
    }

    const updatedData: GroupAnalysisProgressData = {
      ...existingData,
      stage,
      progress,
      message,
      status: status || this.getStatusFromStage(stage)
    };

    this.progressData.set(groupId, updatedData);
    
    const callback = this.progressCallbacks.get(groupId);
    if (callback) {
      callback(updatedData);
    }
  }

  /**
   * Mark group analysis as completed
   */
  completeGroupAnalysis(groupId: string, finalData?: any): void {
    this.updateProgress(
      groupId, 
      'complete', 
      100, 
      'Group analysis completed successfully',
      'completed'
    );
    
    // Clean up after a delay to allow UI updates
    setTimeout(() => {
      this.cleanup(groupId);
    }, 5000);
  }

  /**
   * Mark group analysis as failed
   */
  failGroupAnalysis(groupId: string, error: string): void {
    const existingData = this.progressData.get(groupId);
    if (!existingData) return;

    const failedData: GroupAnalysisProgressData = {
      ...existingData,
      stage: 'error',
      progress: 0,
      status: 'error',
      error,
      message: 'Group analysis failed'
    };

    this.progressData.set(groupId, failedData);
    
    const callback = this.progressCallbacks.get(groupId);
    if (callback) {
      callback(failedData);
    }
  }

  /**
   * Cancel group analysis
   */
  cancelGroupAnalysis(groupId: string): void {
    this.cleanup(groupId);
  }

  /**
   * Get current progress data for a group
   */
  getProgressData(groupId: string): GroupAnalysisProgressData | null {
    return this.progressData.get(groupId) || null;
  }

  /**
   * Check if group analysis is in progress
   */
  isAnalysisInProgress(groupId: string): boolean {
    const data = this.progressData.get(groupId);
    return data ? data.status !== 'completed' && data.status !== 'error' : false;
  }

  /**
   * Create a loading node for the canvas
   */
  createLoadingNode(
    groupId: string, 
    position: { x: number; y: number },
    onCancel?: (groupId: string) => void
  ): Node | null {
    const progressData = this.progressData.get(groupId);
    if (!progressData) return null;

    return {
      id: `group-analysis-loading-${groupId}`,
      type: 'groupAnalysisLoading',
      position,
      data: {
        ...progressData,
        onCancel
      },
      selectable: false,
      deletable: false
    };
  }

  /**
   * Create a results node for the canvas
   */
  createResultsNode(
    groupId: string,
    analysisResults: any,
    position: { x: number; y: number },
    onEditPrompt?: (sessionId: string) => void,
    onCreateFork?: (sessionId: string) => void,
    onViewDetails?: (analysisId: string) => void
  ): Node {
    const progressData = this.progressData.get(groupId);
    
    // Standardize the analysis results format for consistent display
    const source = (analysisResults && (analysisResults.groupAnalysis || analysisResults.analysis))
      ? (analysisResults.groupAnalysis || analysisResults.analysis)
      : analysisResults;

    const standardizedResults = {
      id: source?.id || `group_${groupId}_${Date.now()}`,
      sessionId: source?.sessionId || `session_${groupId}`,
      prompt: source?.originalPrompt ?? source?.prompt,
      summary: {
        overallScore: typeof source?.summary?.overallScore === 'number' && !Number.isNaN(source.summary.overallScore) ? source.summary.overallScore : undefined,
        consistency: typeof source?.summary?.consistency === 'number' && !Number.isNaN(source.summary.consistency) ? source.summary.consistency : undefined,
        thematicCoherence: typeof source?.summary?.thematicCoherence === 'number' && !Number.isNaN(source.summary.thematicCoherence) ? source.summary.thematicCoherence : undefined,
        userFlowContinuity: typeof source?.summary?.userFlowContinuity === 'number' && !Number.isNaN(source.summary.userFlowContinuity) ? source.summary.userFlowContinuity : undefined
      },
      insights: Array.isArray(source?.insights) ? source.insights : [],
      recommendations: Array.isArray(source?.recommendations) ? source.recommendations : [],
      patterns: {
        commonElements: Array.isArray(source?.patterns?.commonElements) ? source.patterns.commonElements : [],
        designInconsistencies: Array.isArray(source?.patterns?.designInconsistencies) ? source.patterns.designInconsistencies : [],
        userJourneyGaps: Array.isArray(source?.patterns?.userJourneyGaps) ? source.patterns.userJourneyGaps : []
      },
      analysis: source?.analysis || undefined,
      createdAt: source?.createdAt || source?.timestamp || new Date()
    };
    
    return {
      id: `group-analysis-results-${groupId}`,
      type: 'groupAnalysisResults',
      position,
      data: {
        analysisResults: standardizedResults,
        groupName: progressData?.groupName || 'Unknown Group',
        onEditPrompt,
        onCreateFork,
        onViewDetails
      },
      selectable: true,
      deletable: true
    };
  }

  /**
   * Clean up tracking data for a group
   */
  private cleanup(groupId: string): void {
    this.progressData.delete(groupId);
    this.progressCallbacks.delete(groupId);
  }

  /**
   * Map stage to status
   */
  private getStatusFromStage(stage: string): GroupAnalysisProgressData['status'] {
    switch (stage) {
      case 'starting':
      case 'queued':
      case 'context-detection':
      case 'context':
        return 'analyzing';
      case 'vision':
      case 'individual-analysis':
      case 'ai':
      case 'cross-image-analysis':
        return 'processing';
      case 'synthesizing':
      case 'synthesis':
      case 'finalizing':
        return 'synthesizing';
      case 'complete':
      case 'completed':
        return 'completed';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'analyzing';
    }
  }
}

export const groupAnalysisProgressService = GroupAnalysisProgressService.getInstance();