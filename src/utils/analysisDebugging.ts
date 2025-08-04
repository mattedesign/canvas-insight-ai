/**
 * Enhanced debugging utilities for tracking analysis flow and canvas state
 */

export class AnalysisDebugger {
  private static logs: string[] = [];
  private static maxLogs = 100;

  static log(component: string, event: string, data?: any) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logEntry = `[${timestamp}] ${component}: ${event}`;
    
    // Only log in development or when debug is enabled
    if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGGING === 'true') {
      if (data) {
        console.log(logEntry, data);
        this.logs.push(`${logEntry} ${JSON.stringify(data)}`);
      } else {
        console.log(logEntry);
        this.logs.push(logEntry);
      }
    }

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  static getAnalysisFlow(imageId: string): string[] {
    return this.logs.filter(log => log.includes(imageId));
  }

  static getCanvasFlow(): string[] {
    return this.logs.filter(log => 
      log.includes('CanvasView') || 
      log.includes('AnalysisRequestNode') ||
      log.includes('AnalysisCardNode')
    );
  }

  static validateAnalysisStructure(analysis: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!analysis) {
      issues.push('Analysis is null or undefined');
      return { valid: false, issues };
    }

    if (!analysis.id) {
      issues.push('Missing analysis.id');
    }

    // Handle both image_id and imageId formats from backend
    const imageId = analysis.image_id || analysis.imageId;
    if (!imageId) {
      issues.push('Missing analysis.imageId (checked both image_id and imageId)');
    }

    // Check for at least one content field - be more flexible
    const hasContent = !!(
      analysis.suggestions || 
      analysis.visualAnnotations || 
      analysis.visual_annotations ||
      analysis.summary ||
      analysis.data?.suggestions ||
      analysis.data?.visualAnnotations ||
      analysis.data?.visual_annotations ||
      analysis.data?.summary
    );

    if (!hasContent) {
      issues.push('Analysis missing content (suggestions, visualAnnotations, or summary)');
    }

    // Validate summary structure if present
    const summary = analysis.summary || analysis.data?.summary;
    if (summary) {
      if (typeof summary.overallScore !== 'number' && typeof summary.overall_score !== 'number') {
        issues.push('Summary missing valid overallScore');
      } else {
        const score = summary.overallScore || summary.overall_score;
        if (isNaN(score) || !isFinite(score)) {
          issues.push('Summary overallScore is not a valid number');
        }
      }
      
      if (!summary.categoryScores && !summary.category_scores) {
        issues.push('Summary missing categoryScores');
      }
    }

    return { valid: issues.length === 0, issues };
  }

  static trackNodeState(nodeType: string, nodeId: string, state: any) {
    // Only track in development mode
    if (import.meta.env.DEV) {
      this.log('NodeTracker', `${nodeType}:${nodeId}`, {
        visible: !!state.visible,
        dataKeys: Object.keys(state.data || {}),
        position: state.position
      });
    }
  }

  static trackCanvasRender(stats: {
    totalNodes: number;
    imageNodes: number;
    analysisNodes: number;
    requestNodes: number;
    totalEdges: number;
  }) {
    // Only track in development mode
    if (import.meta.env.DEV) {
      this.log('CanvasRender', 'Stats', stats);
    }
  }

  static clearLogs() {
    this.logs = [];
  }

  static exportLogs(): string {
    return this.logs.join('\n');
  }
}

// Helper to track analysis lifecycle
export const AnalysisLifecycle = {
  REQUEST_CREATED: 'REQUEST_CREATED',
  ANALYSIS_STARTED: 'ANALYSIS_STARTED', 
  ANALYSIS_COMPLETED: 'ANALYSIS_COMPLETED',
  ANALYSIS_STORED: 'ANALYSIS_STORED',
  REQUEST_REMOVED: 'REQUEST_REMOVED',
  CARD_CREATED: 'CARD_CREATED',
  CARD_RENDERED: 'CARD_RENDERED'
} as const;

export type AnalysisLifecycleEvent = typeof AnalysisLifecycle[keyof typeof AnalysisLifecycle];
