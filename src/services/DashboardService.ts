import { supabase } from '@/integrations/supabase/client';

export interface MetricTrend {
  currentValue: number;
  previousValue: number;
  trendPercentage: number;
  trendDirection: 'up' | 'down' | 'stable';
  confidenceScore: number;
  hasSufficientData: boolean;
}

export interface DashboardMetrics {
  totalAnalyses: number;
  totalImages: number;
  averageScore: number;
  totalIssues: number;
  totalSuggestions: number;
  categoryScores: {
    usability: number;
    accessibility: number;
    visual: number;
    content: number;
  };
  issueDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  recentActivity: {
    date: string;
    count: number;
  }[];
  topIssues: {
    type: string;
    count: number;
    severity: 'high' | 'medium' | 'low';
  }[];
  patterns: {
    commonIssues: string[];
    improvementAreas: string[];
    strengths: string[];
  };
  // New trend data
  trends: {
    averageScore: MetricTrend;
    totalIssues: MetricTrend;
    analysisSuccessRate: MetricTrend;
    accessibility: MetricTrend;
  };
  analysisQuality: {
    successRate: number;
    averageConfidence: number;
    failureReasons: string[];
  };
}

export class DashboardService {
  /**
   * Get comprehensive dashboard metrics for a project with trend analysis
   */
  static async getDashboardMetrics(projectId: string): Promise<DashboardMetrics | null> {
    try {
      // First get image IDs for this project
      const { data: projectImages } = await supabase
        .from('images')
        .select('id')
        .eq('project_id', projectId);
        
      const imageIds = projectImages?.map(img => img.id) || [];
      
      if (imageIds.length === 0) {
        return this.getEmptyMetrics();
      }
      
      // Get all analyses for these images
      const { data: analyses, error: analysesError } = await supabase
        .from('ux_analyses')
        .select('*')
        .in('image_id', imageIds);

      if (analysesError) {
        console.error('Error fetching analyses:', analysesError);
        return null;
      }

      if (!analyses || analyses.length === 0) {
        return this.getEmptyMetrics();
      }

      // Calculate metrics
      const totalAnalyses = analyses.length;
      
      // Get unique images count
      const uniqueImageIds = new Set(analyses.map(a => a.image_id));
      const totalImages = uniqueImageIds.size;

      // Calculate average scores
      let totalScore = 0;
      let totalIssues = 0;
      let totalSuggestions = 0;
      const categoryTotals = { usability: 0, accessibility: 0, visual: 0, content: 0 };
      const issueSeverityCounts = { high: 0, medium: 0, low: 0 };
      const issueTypeCounts: Record<string, { count: number; severity: 'high' | 'medium' | 'low' }> = {};

      // Process each analysis
      analyses.forEach(analysis => {
        // Type-safe JSON parsing
        const summary = typeof analysis.summary === 'object' && analysis.summary !== null ? analysis.summary as any : {};
        const suggestions = Array.isArray(analysis.suggestions) ? analysis.suggestions as any[] : [];
        
        // Overall score
        if (summary.overallScore && typeof summary.overallScore === 'number') {
          totalScore += summary.overallScore;
        }

        // Category scores
        if (summary.categoryScores && typeof summary.categoryScores === 'object') {
          Object.keys(categoryTotals).forEach(category => {
            const categoryScore = summary.categoryScores[category];
            if (typeof categoryScore === 'number') {
              categoryTotals[category] += categoryScore;
            }
          });
        }

        // Count suggestions and categorize by severity
        totalSuggestions += suggestions.length;
        suggestions.forEach((suggestion: any) => {
          if (suggestion && typeof suggestion === 'object' && suggestion.type) {
            const severity = this.determineSeverity(suggestion);
            
            if (!issueTypeCounts[suggestion.type]) {
              issueTypeCounts[suggestion.type] = { count: 0, severity };
            }
            issueTypeCounts[suggestion.type].count++;
            
            if (severity === 'high') issueSeverityCounts.high++;
            else if (severity === 'medium') issueSeverityCounts.medium++;
            else issueSeverityCounts.low++;
            
            totalIssues++;
          }
        });
      });

      // Calculate averages
      const averageScore = totalAnalyses > 0 ? totalScore / totalAnalyses : 0;
      const categoryScores = {
        usability: totalAnalyses > 0 ? categoryTotals.usability / totalAnalyses : 0,
        accessibility: totalAnalyses > 0 ? categoryTotals.accessibility / totalAnalyses : 0,
        visual: totalAnalyses > 0 ? categoryTotals.visual / totalAnalyses : 0,
        content: totalAnalyses > 0 ? categoryTotals.content / totalAnalyses : 0,
      };

      // Get recent activity (last 7 days)
      const recentActivity = await this.getRecentActivity(projectId);

      // Get top issues
      const topIssues = Object.entries(issueTypeCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 5)
        .map(([type, data]) => ({
          type,
          count: data.count,
          severity: data.severity
        }));

      // Analyze patterns
      const patterns = this.analyzePatterns(analyses);

      // Get trend analysis
      const trends = await this.getTrendAnalysis(projectId);

      // Get analysis quality metrics
      const analysisQuality = await this.getAnalysisQuality(projectId);

      return {
        totalAnalyses,
        totalImages,
        averageScore,
        totalIssues,
        totalSuggestions,
        categoryScores,
        issueDistribution: issueSeverityCounts,
        recentActivity,
        topIssues,
        patterns,
        trends,
        analysisQuality
      };

    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      return null;
    }
  }

  /**
   * Get recent activity for the past 7 days
   */
  private static async getRecentActivity(projectId: string): Promise<{ date: string; count: number; }[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // First get image IDs for this project
      const { data: projectImages } = await supabase
        .from('images')
        .select('id')
        .eq('project_id', projectId);
        
      const imageIds = projectImages?.map(img => img.id) || [];
      
      if (imageIds.length === 0) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('ux_analyses')
        .select('created_at')
        .in('image_id', imageIds)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (error || !data) {
        return [];
      }

      // Group by date
      const activityByDate: Record<string, number> = {};
      data.forEach(analysis => {
        const date = new Date(analysis.created_at).toISOString().split('T')[0];
        activityByDate[date] = (activityByDate[date] || 0) + 1;
      });

      // Create array for last 7 days
      const activity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        activity.push({
          date: dateStr,
          count: activityByDate[dateStr] || 0
        });
      }

      return activity;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Analyze patterns across analyses
   */
  private static analyzePatterns(analyses: any[]): DashboardMetrics['patterns'] {
    // Type-safe extraction of suggestions
    const allSuggestions = analyses.flatMap(a => {
      const suggestions = Array.isArray(a.suggestions) ? a.suggestions as any[] : [];
      return suggestions;
    });
    
    // Count issue types
    const issueTypeCounts: Record<string, number> = {};
    allSuggestions.forEach((suggestion: any) => {
      if (suggestion && typeof suggestion === 'object' && suggestion.type) {
        issueTypeCounts[suggestion.type] = (issueTypeCounts[suggestion.type] || 0) + 1;
      }
    });

    // Get most common issues
    const commonIssues = Object.entries(issueTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);

    // Analyze improvement areas (areas with low scores)
    const improvementAreas: string[] = [];
    const avgScores = this.calculateAverageScores(analyses);
    if (avgScores.usability < 70) improvementAreas.push('Usability');
    if (avgScores.accessibility < 70) improvementAreas.push('Accessibility');
    if (avgScores.visual < 70) improvementAreas.push('Visual Design');
    if (avgScores.content < 70) improvementAreas.push('Content Strategy');

    // Identify strengths (areas with high scores)
    const strengths: string[] = [];
    if (avgScores.usability >= 80) strengths.push('Excellent Usability');
    if (avgScores.accessibility >= 80) strengths.push('Strong Accessibility');
    if (avgScores.visual >= 80) strengths.push('Great Visual Design');
    if (avgScores.content >= 80) strengths.push('Effective Content');

    return {
      commonIssues,
      improvementAreas,
      strengths
    };
  }

  /**
   * Calculate average category scores across all analyses
   */
  private static calculateAverageScores(analyses: any[]) {
    const totals = { usability: 0, accessibility: 0, visual: 0, content: 0 };
    let count = 0;

    analyses.forEach(analysis => {
      // Type-safe access to summary data
      const summary = typeof analysis.summary === 'object' && analysis.summary !== null ? analysis.summary as any : {};
      const categoryScores = summary.categoryScores;
      
      if (categoryScores && typeof categoryScores === 'object') {
        Object.keys(totals).forEach(category => {
          const score = categoryScores[category];
          if (typeof score === 'number') {
            totals[category] += score;
          }
        });
        count++;
      }
    });

    return {
      usability: count > 0 ? totals.usability / count : 0,
      accessibility: count > 0 ? totals.accessibility / count : 0,
      visual: count > 0 ? totals.visual / count : 0,
      content: count > 0 ? totals.content / count : 0,
    };
  }

  /**
   * Determine severity of a suggestion based on its properties
   */
  private static determineSeverity(suggestion: any): 'high' | 'medium' | 'low' {
    const type = suggestion.type?.toLowerCase() || '';
    const description = suggestion.description?.toLowerCase() || '';

    // High priority keywords
    if (type.includes('accessibility') || type.includes('error') || 
        description.includes('critical') || description.includes('urgent') ||
        description.includes('broken') || description.includes('inaccessible')) {
      return 'high';
    }

    // Medium priority keywords  
    if (type.includes('usability') || description.includes('confusing') ||
        description.includes('unclear') || description.includes('improve')) {
      return 'medium';
    }

    // Default to low priority
    return 'low';
  }

  /**
   * Get trend analysis for key metrics
   */
  private static async getTrendAnalysis(projectId: string): Promise<DashboardMetrics['trends']> {
    try {
      // Record current metrics snapshot first
      await supabase.rpc('record_metrics_snapshot', { p_project_id: projectId });

      // Get trends for key metrics
      const [averageScoreTrend, totalIssuesTrend, successRateTrend, accessibilityTrend] = await Promise.all([
        supabase.rpc('calculate_metric_trend', { 
          p_project_id: projectId, 
          p_metric_name: 'average_score',
          p_days_back: 7 
        }),
        supabase.rpc('calculate_metric_trend', { 
          p_project_id: projectId, 
          p_metric_name: 'total_issues',
          p_days_back: 7 
        }),
        supabase.rpc('calculate_metric_trend', { 
          p_project_id: projectId, 
          p_metric_name: 'analysis_success_rate',
          p_days_back: 7 
        }),
        supabase.rpc('calculate_metric_trend', { 
          p_project_id: projectId, 
          p_metric_name: 'average_score', // Use overall score as proxy for accessibility
          p_days_back: 7 
        })
      ]);

      return {
        averageScore: this.parseTrendData(averageScoreTrend.data),
        totalIssues: this.parseTrendData(totalIssuesTrend.data),
        analysisSuccessRate: this.parseTrendData(successRateTrend.data),
        accessibility: this.parseTrendData(accessibilityTrend.data)
      };
    } catch (error) {
      console.error('Error getting trend analysis:', error);
      return this.getEmptyTrends();
    }
  }

  /**
   * Parse trend data from database function
   */
  private static parseTrendData(data: any): MetricTrend {
    if (!data) return this.getEmptyTrend();
    
    return {
      currentValue: data.current_value || 0,
      previousValue: data.previous_value || 0,
      trendPercentage: data.trend_percentage || 0,
      trendDirection: data.trend_direction || 'stable',
      confidenceScore: data.confidence_score || 0,
      hasSufficientData: data.has_sufficient_data || false
    };
  }

  /**
   * Get analysis quality metrics
   */
  private static async getAnalysisQuality(projectId: string): Promise<DashboardMetrics['analysisQuality']> {
    try {
      // Get images for this project
      const { data: projectImages } = await supabase
        .from('images')
        .select('id')
        .eq('project_id', projectId);
        
      const imageIds = projectImages?.map(img => img.id) || [];
      
      if (imageIds.length === 0) {
        return { successRate: 100, averageConfidence: 0, failureReasons: [] };
      }

      // Get analysis quality data
      const { data: analyses } = await supabase
        .from('ux_analyses')
        .select('status, metadata, summary')
        .in('image_id', imageIds);

      if (!analyses || analyses.length === 0) {
        return { successRate: 100, averageConfidence: 0, failureReasons: [] };
      }

      const successfulAnalyses = analyses.filter(a => a.status === 'completed');
      const successRate = (successfulAnalyses.length / analyses.length) * 100;

      // Calculate average confidence from metadata
      let totalConfidence = 0;
      let confidenceCount = 0;
      const failureReasons: string[] = [];

      analyses.forEach(analysis => {
        const metadata = analysis.metadata as any || {};
        if (metadata.confidence && typeof metadata.confidence === 'number') {
          totalConfidence += metadata.confidence;
          confidenceCount++;
        }

        if (analysis.status !== 'completed' && metadata.error && typeof metadata.error === 'string') {
          const reason = this.categorizeFailureReason(metadata.error);
          if (!failureReasons.includes(reason)) {
            failureReasons.push(reason);
          }
        }
      });

      const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

      return {
        successRate,
        averageConfidence,
        failureReasons: failureReasons.slice(0, 3) // Top 3 failure reasons
      };
    } catch (error) {
      console.error('Error getting analysis quality:', error);
      return { successRate: 100, averageConfidence: 0, failureReasons: [] };
    }
  }

  /**
   * Categorize failure reasons for better UX
   */
  private static categorizeFailureReason(error: string): string {
    const errorLower = error.toLowerCase();
    if (errorLower.includes('api') || errorLower.includes('key')) {
      return 'API Configuration Issue';
    }
    if (errorLower.includes('timeout') || errorLower.includes('timeout')) {
      return 'Request Timeout';
    }
    if (errorLower.includes('image') || errorLower.includes('format')) {
      return 'Image Processing Error';
    }
    if (errorLower.includes('json') || errorLower.includes('parse')) {
      return 'Response Parsing Error';
    }
    return 'Unknown Error';
  }

  /**
   * Get empty trend data
   */
  private static getEmptyTrend(): MetricTrend {
    return {
      currentValue: 0,
      previousValue: 0,
      trendPercentage: 0,
      trendDirection: 'stable',
      confidenceScore: 0,
      hasSufficientData: false
    };
  }

  /**
   * Get empty trends object
   */
  private static getEmptyTrends(): DashboardMetrics['trends'] {
    const emptyTrend = this.getEmptyTrend();
    return {
      averageScore: emptyTrend,
      totalIssues: emptyTrend,
      analysisSuccessRate: emptyTrend,
      accessibility: emptyTrend
    };
  }

  /**
   * Get empty metrics when no data is available
   */
  private static getEmptyMetrics(): DashboardMetrics {
    return {
      totalAnalyses: 0,
      totalImages: 0,
      averageScore: 0,
      totalIssues: 0,
      totalSuggestions: 0,
      categoryScores: {
        usability: 0,
        accessibility: 0,
        visual: 0,
        content: 0,
      },
      issueDistribution: {
        high: 0,
        medium: 0,
        low: 0,
      },
      recentActivity: [],
      topIssues: [],
      patterns: {
        commonIssues: [],
        improvementAreas: [],
        strengths: [],
      },
      trends: this.getEmptyTrends(),
      analysisQuality: {
        successRate: 100,
        averageConfidence: 0,
        failureReasons: []
      }
    };
  }

  /**
   * Refresh dashboard cache (for future implementation)
   */
  static async refreshDashboardCache(projectId: string): Promise<void> {
    // Future implementation for caching dashboard metrics
    console.log('Refreshing dashboard cache for project:', projectId);
  }
}