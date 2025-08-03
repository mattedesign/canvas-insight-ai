/**
 * Enhanced debugging utilities for tracking analysis flow and canvas state
 */

export class AnalysisDebugger {
  private static logs: string[] = [];
  private static maxLogs = 100;

  static log(component: string, event: string, data?: any) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logEntry = `[${timestamp}] ${component}: ${event}`;
    
    if (data) {
      console.log(logEntry, data);
      this.logs.push(`${logEntry} ${JSON.stringify(data)}`);
    } else {
      console.log(logEntry);
      this.logs.push(logEntry);
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

    if (!analysis.imageId) {
      issues.push('Missing analysis.imageId');
    }

    // Check for at least one content field
    const hasContent = !!(
      analysis.suggestions || 
      analysis.visualAnnotations || 
      analysis.summary ||
      analysis.data?.suggestions ||
      analysis.data?.visualAnnotations ||
      analysis.data?.summary
    );

    if (!hasContent) {
      issues.push('Analysis missing content (suggestions, visualAnnotations, or summary)');
    }

    return { valid: issues.length === 0, issues };
  }

  static trackNodeState(nodeType: string, nodeId: string, state: any) {
    this.log('NodeTracker', `${nodeType}:${nodeId}`, {
      visible: !!state.visible,
      dataKeys: Object.keys(state.data || {}),
      position: state.position
    });
  }

  static trackCanvasRender(stats: {
    totalNodes: number;
    imageNodes: number;
    analysisNodes: number;
    requestNodes: number;
    totalEdges: number;
  }) {
    this.log('CanvasRender', 'Stats', stats);
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
